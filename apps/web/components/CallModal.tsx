'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Room, RoomEvent, Track, RemoteTrack, RemoteParticipant, LocalParticipant, VideoPresets, ConnectionQuality } from 'livekit-client';
import { useCall } from './CallProvider';

interface CallModalProps {
  callType: 'audio' | 'video';
  peerName: string;
  peerAvatarUrl?: string | null;
  connect: () => Promise<{ url: string; token: string }>;
  onClose: () => void;
  isGroupCall?: boolean;
}

interface RemoteParticipantInfo {
  identity: string;
  name: string;
  hasVideo: boolean;
  hasAudio: boolean;
  quality: ConnectionQuality;
}

export default function CallModal({ callType, peerName, peerAvatarUrl, connect, onClose, isGroupCall }: CallModalProps) {
  const { isMinimized, minimize, endCall } = useCall();
  const [status, setStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'error'>('connecting');
  const [error, setError] = useState('');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(callType === 'video');
  const [duration, setDuration] = useState(0);
  const [participantCount, setParticipantCount] = useState(1);
  const [remoteParticipants, setRemoteParticipants] = useState<Map<string, RemoteParticipantInfo>>(new Map());
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [camFacing, setCamFacing] = useState<'front' | 'back'>('front');
  const [localQuality, setLocalQuality] = useState<ConnectionQuality>(ConnectionQuality.Excellent);
  const [showControls, setShowControls] = useState(true);

  const roomRef = useRef<Room | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateRemoteParticipant = useCallback((p: RemoteParticipant) => {
    setRemoteParticipants(prev => {
      const next = new Map(prev);
      const videoPub = p.getTrackPublication(Track.Source.Camera);
      const audioPub = p.getTrackPublication(Track.Source.Microphone);
      next.set(p.identity, {
        identity: p.identity,
        name: p.name || p.identity,
        hasVideo: !!videoPub?.track && videoPub.isSubscribed,
        hasAudio: !!audioPub?.track && audioPub.isSubscribed,
        quality: p.connectionQuality,
      });
      return next;
    });
  }, []);

  const removeRemoteParticipant = useCallback((identity: string) => {
    setRemoteParticipants(prev => {
      const next = new Map(prev);
      next.delete(identity);
      return next;
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: { resolution: { width: 640, height: 360 }, facingMode: 'user' },
      publishDefaults: { videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360] },
    });
    roomRef.current = room;

    room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
      if (track.kind === Track.Kind.Audio) {
        const el = remoteAudioRefs.current.get(participant.identity);
        if (el) track.attach(el);
      } else if (track.kind === Track.Kind.Video) {
        const el = remoteVideoRefs.current.get(participant.identity);
        if (el) track.attach(el);
      }
      updateRemoteParticipant(participant);
    });
    room.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
      track.detach();
      updateRemoteParticipant(participant as RemoteParticipant);
    });
    room.on(RoomEvent.ParticipantConnected, (p) => updateRemoteParticipant(p));
    room.on(RoomEvent.ParticipantDisconnected, (p) => removeRemoteParticipant(p.identity));
    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      setActiveSpeakerId(speakers.length > 0 ? speakers[0].identity : null);
    });
    room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
      if (participant instanceof LocalParticipant === false && (participant as any).identity) {
        updateRemoteParticipant(participant as RemoteParticipant);
      } else {
        setLocalQuality(quality as ConnectionQuality);
      }
    });
    room.on(RoomEvent.Reconnecting, () => { if (mounted) setStatus('reconnecting'); });
    room.on(RoomEvent.Reconnected, () => { if (mounted) setStatus('connected'); });
    room.on(RoomEvent.Disconnected, () => { if (mounted) onClose(); });

    (async () => {
      try {
        const { url, token } = await connect();
        if (!mounted) return;
        await room.connect(url, token);
        await room.localParticipant.setMicrophoneEnabled(true);
        if (callType === 'video') {
          await room.localParticipant.setCameraEnabled(true);
          const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
          if (camPub?.track && localVideoRef.current) camPub.track.attach(localVideoRef.current);
        }
        if (!mounted) return;
        setStatus('connected');
        setParticipantCount(room.remoteParticipants.size + 1);
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
        room.remoteParticipants.forEach(p => updateRemoteParticipant(p));
      } catch (err: any) {
        if (!mounted) return;
        setError(err.message || 'Failed to connect to call');
        setStatus('error');
      }
    })();

    return () => {
      mounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
      room.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setParticipantCount(remoteParticipants.size + 1);
  }, [remoteParticipants]);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 5000);
  }, []);

  useEffect(() => {
    if (status === 'connected' && callType === 'video') resetControlsTimer();
    return () => { if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current); };
  }, [status, callType, resetControlsTimer]);

  const toggleMic = async () => {
    const room = roomRef.current; if (!room) return;
    const next = !micOn;
    await room.localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
  };

  const toggleCam = async () => {
    const room = roomRef.current; if (!room) return;
    const next = !camOn;
    await room.localParticipant.setCameraEnabled(next);
    if (next) {
      const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (camPub?.track && localVideoRef.current) camPub.track.attach(localVideoRef.current);
    }
    setCamOn(next);
  };

  const flipCamera = async () => {
    const room = roomRef.current; if (!room) return;
    const next = camFacing === 'front' ? 'back' : 'front';
    try {
      await room.localParticipant.setCameraEnabled(false);
      await room.switchActiveDevice('videoinput', next === 'back' ? 'environment' : 'user');
      await room.localParticipant.setCameraEnabled(true);
      const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (camPub?.track && localVideoRef.current) camPub.track.attach(localVideoRef.current);
      setCamFacing(next);
    } catch {
      await room.localParticipant.setCameraEnabled(true);
    }
  };

  const hangUp = () => { roomRef.current?.disconnect(); onClose(); };

  const fmtDuration = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${sec}` : `${m}:${sec}`;
  };

  const qualityIcon = (q: ConnectionQuality) => q === ConnectionQuality.Excellent ? '●●●' : q === ConnectionQuality.Good ? '●●○' : q === ConnectionQuality.Poor ? '●○○' : '○○○';
  const qualityColor = (q: ConnectionQuality) => q === ConnectionQuality.Excellent ? '#22C55E' : q === ConnectionQuality.Good ? '#EAB308' : q === ConnectionQuality.Poor ? '#EF4444' : '#6B7280';

  const remoteList = Array.from(remoteParticipants.values());

  // Don't render full screen if minimized — floating widget handles it
  if (isMinimized) return null;

  // ===== Audio-only call layout =====
  if (callType === 'audio') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(180deg, #0B2D6B 0%, #0F172A 100%)', zIndex: 9999, display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top, 0px)' }} onClick={resetControlsTimer}>
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: showControls ? 1 : 0, transition: 'opacity 0.3s' }}>
          <div style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>{isGroupCall ? `${peerName} · ${participantCount} in call` : peerName}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: qualityColor(localQuality), fontSize: 10, fontWeight: 700 }}>{qualityIcon(localQuality)}</span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{status === 'connecting' ? 'Connecting…' : status === 'reconnecting' ? 'Reconnecting…' : status === 'error' ? 'Error' : fmtDuration(duration)}</span>
          </div>
          {/* Minimize button */}
          <button onClick={minimize} style={{ background: 'rgba(255,255,255,0.15)', border: 0, borderRadius: 999, padding: '6px 14px', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Minimize</button>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          {status === 'error' ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div style={{ color: '#FCA5A5', fontSize: 15, fontWeight: 600, marginBottom: 16 }}>{error}</div>
              <button onClick={hangUp} style={{ background: '#EF4444', color: 'white', border: 0, borderRadius: 999, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Close</button>
            </div>
          ) : (
            <>
              <div style={{ position: 'relative', width: 140, height: 140 }}>
                {(activeSpeakerId || status === 'connecting') && (<>
                  <div style={{ position: 'absolute', inset: -20, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', animation: 'call-pulse 2s ease-out infinite' }} />
                  <div style={{ position: 'absolute', inset: -10, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', animation: 'call-pulse 2s ease-out infinite 0.5s' }} />
                </>)}
                <div style={{ width: 140, height: 140, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #0051FF 0%, #0B2D6B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52, fontWeight: 800, color: 'white', boxShadow: '0 8px 32px rgba(0,81,255,0.3)' }}>
                  {peerAvatarUrl ? <img src={peerAvatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : peerName.charAt(0).toUpperCase()}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'white', fontSize: 22, fontWeight: 700 }}>{peerName}</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 6 }}>{status === 'connecting' ? 'Connecting…' : status === 'reconnecting' ? 'Reconnecting…' : isGroupCall && remoteList.length === 0 ? 'Waiting for others to join…' : fmtDuration(duration)}</div>
                {isGroupCall && remoteList.length > 0 && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 8 }}>{remoteList.map(p => p.name).join(', ')} {remoteList.length === 1 ? 'is' : 'are'} in the call</div>}
              </div>
            </>
          )}
        </div>
        {remoteList.map(p => <audio key={p.identity} ref={el => { if (el) remoteAudioRefs.current.set(p.identity, el); }} autoPlay />)}
        <div style={{ padding: '24px 20px', paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, opacity: showControls ? 1 : 0, transition: 'opacity 0.3s' }}>
          <button onClick={toggleMic} style={controlBtnStyle(micOn)} title={micOn ? 'Mute' : 'Unmute'}>
            {micOn ? <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 28, height: 28 }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg> : <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 28, height: 28 }}><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.25l13.5 13.5M15 10.5V4.5a3 3 0 00-5.94-.6M12 18.75a6 6 0 006-6v-1.5m-9 4.243A5.978 5.978 0 016 12.75v-1.5m6 7.5v3.75m-3.75 0h7.5" /></svg>}
          </button>
          <button onClick={hangUp} style={{ width: 72, height: 72, borderRadius: '50%', border: 0, cursor: 'pointer', background: '#EF4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(239,68,68,0.4)' }} title="Hang up">
            <svg fill="currentColor" viewBox="0 0 24 24" style={{ width: 30, height: 30, transform: 'rotate(135deg)' }}><path d="M3.62 6.395a1.5 1.5 0 01.13-2.014l1.048-1.048a1.5 1.5 0 012.12 0l2.401 2.4a1.5 1.5 0 01.29 1.723L8.4 9.665a12.045 12.045 0 005.936 5.936l1.209-1.208a1.5 1.5 0 011.723.29l2.4 2.4a1.5 1.5 0 010 2.121l-1.048 1.048a1.5 1.5 0 01-2.013.13C10.856 16.842 6.157 12.144 3.62 6.395z" /></svg>
          </button>
        </div>
        <style jsx>{`@keyframes call-pulse { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.3); opacity: 0; } }`}</style>
      </div>
    );
  }

  // ===== Video call layout =====
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0F172A', zIndex: 9999, display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top, 0px)' }} onClick={resetControlsTimer}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#000' }}>
        {isGroupCall && remoteList.length > 0 ? (
          <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: remoteList.length <= 1 ? '1fr' : remoteList.length <= 4 ? '1fr 1fr' : '1fr 1fr 1fr', gridTemplateRows: remoteList.length <= 2 ? '1fr' : '1fr 1fr', gap: 2, padding: 2 }}>
            {remoteList.map(p => (
              <div key={p.identity} style={{ position: 'relative', background: '#1a1a2e', borderRadius: 4, overflow: 'hidden', border: activeSpeakerId === p.identity ? '2px solid #22C55E' : '2px solid transparent' }}>
                {p.hasVideo ? <video ref={el => { if (el) remoteVideoRefs.current.set(p.identity, el); }} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}><div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, #0051FF 0%, #0B2D6B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: 'white' }}>{p.name.charAt(0).toUpperCase()}</div></div>}
                <audio ref={el => { if (el) remoteAudioRefs.current.set(p.identity, el); }} autoPlay />
                <div style={{ position: 'absolute', bottom: 4, left: 4, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, maxWidth: 'calc(100% - 8px)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                {!p.hasAudio && <div style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(239,68,68,0.9)', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 12, height: 12 }}><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.25l13.5 13.5M15 10.5V4.5a3 3 0 00-5.94-.6" /></svg></div>}
              </div>
            ))}
          </div>
        ) : !isGroupCall && remoteList.length > 0 && remoteList[0].hasVideo ? (
          <>
            <video ref={el => { if (el) remoteVideoRefs.current.set(remoteList[0].identity, el); }} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <audio ref={el => { if (el) remoteAudioRefs.current.set(remoteList[0].identity, el); }} autoPlay />
          </>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            {status === 'error' ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <div style={{ color: '#FCA5A5', fontSize: 15, fontWeight: 600, marginBottom: 16 }}>{error}</div>
                <button onClick={hangUp} style={{ background: '#EF4444', color: 'white', border: 0, borderRadius: 999, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Close</button>
              </div>
            ) : (
              <>
                <div style={{ width: 120, height: 120, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #0051FF 0%, #0B2D6B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, fontWeight: 800, color: 'white', boxShadow: '0 8px 32px rgba(0,81,255,0.3)' }}>{peerAvatarUrl ? <img src={peerAvatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : peerName.charAt(0).toUpperCase()}</div>
                <div style={{ color: 'white', fontSize: 20, fontWeight: 700 }}>{peerName}</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>{status === 'connecting' ? 'Connecting…' : status === 'reconnecting' ? 'Reconnecting…' : isGroupCall ? 'Waiting for others to join…' : 'Ringing…'}</div>
                {isGroupCall && status === 'connected' && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4, textAlign: 'center', maxWidth: 280 }}>Others can join from the green banner in the chat</div>}
              </>
            )}
          </div>
        )}
        {camOn && (
          <div style={{ position: 'absolute', top: 'calc(12px + env(safe-area-inset-top, 0px))', right: 12, width: '28vw', maxWidth: 140, minWidth: 90, aspectRatio: '9 / 16', borderRadius: 12, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.25)', boxShadow: '0 4px 16px rgba(0,0,0,0.3)', background: '#000', zIndex: 10 }}>
            <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: camFacing === 'front' ? 'scaleX(-1)' : 'none' }} />
          </div>
        )}
        {/* Top info bar with minimize button */}
        <div style={{ position: 'absolute', top: 'calc(12px + env(safe-area-inset-top, 0px))', left: 12, display: 'flex', alignItems: 'center', gap: 8, opacity: showControls ? 1 : 0, transition: 'opacity 0.3s', zIndex: 5 }}>
          <div style={{ background: 'rgba(0,0,0,0.5)', color: 'white', padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, WebkitBackdropFilter: 'blur(8px)' }}>
            <span>{isGroupCall ? `${peerName} · ${participantCount}` : peerName}</span>
            {status === 'connected' && <span style={{ color: 'rgba(255,255,255,0.6)', fontVariantNumeric: 'tabular-nums' }}>· {fmtDuration(duration)}</span>}
          </div>
          <button onClick={minimize} style={{ background: 'rgba(0,0,0,0.5)', border: 0, borderRadius: 999, padding: '6px 14px', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', WebkitBackdropFilter: 'blur(8px)' }} title="Minimize">↓</button>
        </div>
        {status === 'connected' && <div style={{ position: 'absolute', top: 'calc(12px + env(safe-area-inset-top, 0px))', left: '50%', transform: 'translateX(-50%)', color: qualityColor(localQuality), fontSize: 10, fontWeight: 700, background: 'rgba(0,0,0,0.4)', padding: '4px 10px', borderRadius: 999, opacity: showControls ? 0.8 : 0, transition: 'opacity 0.3s', zIndex: 5 }}>{qualityIcon(localQuality)}</div>}
      </div>
      <div style={{ padding: '20px 16px', paddingBottom: 'calc(28px + env(safe-area-inset-bottom, 0px))', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.4) 100%)', opacity: showControls ? 1 : 0, transition: 'opacity 0.3s', flexShrink: 0 }}>
        <button onClick={toggleMic} style={controlBtnStyle(micOn)} title={micOn ? 'Mute' : 'Unmute'}>
          {micOn ? <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 26, height: 26 }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg> : <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 26, height: 26 }}><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.25l13.5 13.5M15 10.5V4.5a3 3 0 00-5.94-.6M12 18.75a6 6 0 006-6v-1.5m-9 4.243A5.978 5.978 0 016 12.75v-1.5m6 7.5v3.75m-3.75 0h7.5" /></svg>}
        </button>
        {callType === 'video' && <button onClick={toggleCam} style={controlBtnStyle(camOn)} title={camOn ? 'Camera off' : 'Camera on'}>
          {camOn ? <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 26, height: 26 }}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg> : <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 26, height: 26 }}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>}
        </button>}
        {callType === 'video' && <button onClick={flipCamera} style={controlBtnStyle(true)} title="Flip camera"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 26, height: 26 }}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg></button>}
        <button onClick={hangUp} style={{ width: 68, height: 68, borderRadius: '50%', border: 0, cursor: 'pointer', background: '#EF4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(239,68,68,0.4)', flexShrink: 0 }} title="Hang up">
          <svg fill="currentColor" viewBox="0 0 24 24" style={{ width: 28, height: 28, transform: 'rotate(135deg)' }}><path d="M3.62 6.395a1.5 1.5 0 01.13-2.014l1.048-1.048a1.5 1.5 0 012.12 0l2.401 2.4a1.5 1.5 0 01.29 1.723L8.4 9.665a12.045 12.045 0 005.936 5.936l1.209-1.208a1.5 1.5 0 011.723.29l2.4 2.4a1.5 1.5 0 010 2.121l-1.048 1.048a1.5 1.5 0 01-2.013.13C10.856 16.842 6.157 12.144 3.62 6.395z" /></svg>
        </button>
      </div>
    </div>
  );
}

function controlBtnStyle(active: boolean): React.CSSProperties {
  return { width: 60, height: 60, borderRadius: '50%', border: 0, cursor: 'pointer', background: active ? 'rgba(255,255,255,0.15)' : 'white', color: active ? 'white' : '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitBackdropFilter: 'blur(8px)', flexShrink: 0 };
}
