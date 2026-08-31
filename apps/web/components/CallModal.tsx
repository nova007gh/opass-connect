'use client';

import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track, RemoteTrack, RemoteParticipant } from 'livekit-client';

interface CallModalProps {
  callType: 'audio' | 'video';
  peerName: string;
  peerAvatarUrl?: string | null;
  connect: () => Promise<{ url: string; token: string }>;
  onClose: () => void;
}

export default function CallModal({ callType, peerName, peerAvatarUrl, connect, onClose }: CallModalProps) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [error, setError] = useState('');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(callType === 'video');
  const [peerConnected, setPeerConnected] = useState(false);
  const [duration, setDuration] = useState(0);

  const roomRef = useRef<Room | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let mounted = true;
    const room = new Room();
    roomRef.current = room;

    room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _pub, _participant: RemoteParticipant) => {
      if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
        track.attach(remoteVideoRef.current);
      } else if (track.kind === Track.Kind.Audio && remoteAudioRef.current) {
        track.attach(remoteAudioRef.current);
      }
      setPeerConnected(true);
    });
    room.on(RoomEvent.ParticipantConnected, () => setPeerConnected(true));
    room.on(RoomEvent.ParticipantDisconnected, () => setPeerConnected(false));
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
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      } catch (err: any) {
        if (!mounted) return;
        setError(err.message || 'Failed to connect to call');
        setStatus('error');
      }
    })();

    return () => {
      mounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
      room.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMic = async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !micOn;
    await room.localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
  };

  const toggleCam = async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !camOn;
    await room.localParticipant.setCameraEnabled(next);
    if (next) {
      const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (camPub?.track && localVideoRef.current) camPub.track.attach(localVideoRef.current);
    }
    setCamOn(next);
  };

  const hangUp = () => {
    roomRef.current?.disconnect();
    onClose();
  };

  const fmtDuration = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0F172A', zIndex: 500, display: 'flex', flexDirection: 'column' }}>
      {/* Remote video / avatar background */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {callType === 'video' && peerConnected ? (
          <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 120, height: 120, borderRadius: '50%', overflow: 'hidden', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, fontWeight: 800, color: 'white', margin: '0 auto 16px' }}>
              {peerAvatarUrl ? <img src={peerAvatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : peerName.charAt(0).toUpperCase()}
            </div>
            <div style={{ color: 'white', fontSize: 20, fontWeight: 700 }}>{peerName}</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 6 }}>
              {status === 'connecting' ? 'Connecting…' : status === 'error' ? error : peerConnected ? fmtDuration(duration) : 'Ringing…'}
            </div>
          </div>
        )}
        <audio ref={remoteAudioRef} autoPlay />

        {/* Local video PiP */}
        {callType === 'video' && camOn && (
          <video ref={localVideoRef} autoPlay playsInline muted style={{ position: 'absolute', top: 16, right: 16, width: 100, height: 140, borderRadius: 12, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)' }} />
        )}

        {/* Top bar with call info when in video mode + connected */}
        {callType === 'video' && peerConnected && (
          <div style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(0,0,0,0.5)', color: 'white', padding: '6px 12px', borderRadius: 999, fontSize: 13 }}>
            {peerName} · {fmtDuration(duration)}
          </div>
        )}

        {status === 'error' && (
          <div style={{ position: 'absolute', bottom: 140, left: 20, right: 20, textAlign: 'center', color: '#FCA5A5', fontSize: 13 }}>{error}</div>
        )}
      </div>

      {/* Controls */}
      <div style={{ padding: '24px 20px 40px', display: 'flex', justifyContent: 'center', gap: 20 }}>
        <button onClick={toggleMic} style={{
          width: 56, height: 56, borderRadius: '50%', border: 0, cursor: 'pointer',
          background: micOn ? 'rgba(255,255,255,0.15)' : 'white', color: micOn ? 'white' : '#0F172A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} title={micOn ? 'Mute' : 'Unmute'}>
          {micOn ? (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 24, height: 24 }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
          ) : (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 24, height: 24 }}><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.25l13.5 13.5M15 10.5V4.5a3 3 0 00-5.94-.6M12 18.75a6 6 0 006-6v-1.5m-9 4.243A5.978 5.978 0 016 12.75v-1.5m6 7.5v3.75m-3.75 0h7.5" /></svg>
          )}
        </button>
        {callType === 'video' && (
          <button onClick={toggleCam} style={{
            width: 56, height: 56, borderRadius: '50%', border: 0, cursor: 'pointer',
            background: camOn ? 'rgba(255,255,255,0.15)' : 'white', color: camOn ? 'white' : '#0F172A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} title={camOn ? 'Turn off camera' : 'Turn on camera'}>
            {camOn ? (
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 24, height: 24 }}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
            ) : (
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 24, height: 24 }}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
            )}
          </button>
        )}
        <button onClick={hangUp} style={{
          width: 56, height: 56, borderRadius: '50%', border: 0, cursor: 'pointer',
          background: '#EF4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} title="Hang up">
          <svg fill="currentColor" viewBox="0 0 24 24" style={{ width: 24, height: 24, transform: 'rotate(135deg)' }}><path d="M3.62 6.395a1.5 1.5 0 01.13-2.014l1.048-1.048a1.5 1.5 0 012.12 0l2.401 2.4a1.5 1.5 0 01.29 1.723L8.4 9.665a12.045 12.045 0 005.936 5.936l1.209-1.208a1.5 1.5 0 011.723.29l2.4 2.4a1.5 1.5 0 010 2.121l-1.048 1.048a1.5 1.5 0 01-2.013.13C10.856 16.842 6.157 12.144 3.62 6.395z" /></svg>
        </button>
      </div>
    </div>
  );
}
