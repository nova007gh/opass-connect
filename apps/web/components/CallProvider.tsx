'use client';

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { Room, RoomEvent, Track, RemoteTrack, RemoteParticipant, LocalParticipant, VideoPresets, ConnectionQuality } from 'livekit-client';

interface CallSession {
  callType: 'audio' | 'video';
  peerName: string;
  peerAvatarUrl?: string | null;
  isGroupCall: boolean;
  url: string;
  token: string;
  roomId: string;
}

interface RemoteParticipantInfo {
  identity: string;
  name: string;
  hasVideo: boolean;
  hasAudio: boolean;
  quality: ConnectionQuality;
}

interface CallContextValue {
  activeCall: CallSession | null;
  isMinimized: boolean;
  duration: number;
  micOn: boolean;
  camOn: boolean;
  participantCount: number;
  status: 'connecting' | 'connected' | 'reconnecting' | 'error';
  error: string;
  remoteParticipants: Map<string, RemoteParticipantInfo>;
  activeSpeakerId: string | null;
  localQuality: ConnectionQuality;
  camFacing: 'front' | 'back';
  room: Room | null;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRefs: React.MutableRefObject<Map<string, HTMLVideoElement>>;
  remoteAudioRefs: React.MutableRefObject<Map<string, HTMLAudioElement>>;
  startCall: (session: CallSession) => void;
  endCall: () => void;
  minimize: () => void;
  maximize: () => void;
  toggleMic: () => Promise<void>;
  toggleCam: () => Promise<void>;
  flipCamera: () => Promise<void>;
}

const CallContext = createContext<CallContextValue | null>(null);

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [duration, setDuration] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'error'>('connecting');
  const [error, setError] = useState('');
  const [remoteParticipants, setRemoteParticipants] = useState<Map<string, RemoteParticipantInfo>>(new Map());
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [localQuality, setLocalQuality] = useState<ConnectionQuality>(ConnectionQuality.Excellent);
  const [camFacing, setCamFacing] = useState<'front' | 'back'>('front');

  const roomRef = useRef<Room | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const remoteAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

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

  const startCall = useCallback((session: CallSession) => {
    // End any existing call first
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setActiveCall(session);
    setIsMinimized(false);
    setDuration(0);
    setMicOn(true);
    setCamOn(session.callType === 'video');
    setStatus('connecting');
    setError('');
    setParticipantCount(1);
    setRemoteParticipants(new Map());
    setActiveSpeakerId(null);
    setCamFacing('front');

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
      if (participant instanceof LocalParticipant) {
        setLocalQuality(quality as ConnectionQuality);
      } else {
        updateRemoteParticipant(participant as RemoteParticipant);
      }
    });
    room.on(RoomEvent.Reconnecting, () => setStatus('reconnecting'));
    room.on(RoomEvent.Reconnected, () => setStatus('connected'));
    room.on(RoomEvent.Disconnected, () => {
      // Only auto-clear if we didn't intentionally end the call
      if (roomRef.current === room) {
        setActiveCall(null);
        setIsMinimized(false);
      }
    });

    (async () => {
      try {
        await room.connect(session.url, session.token);
        await room.localParticipant.setMicrophoneEnabled(true);
        if (session.callType === 'video') {
          await room.localParticipant.setCameraEnabled(true);
          const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
          if (camPub?.track && localVideoRef.current) camPub.track.attach(localVideoRef.current);
        }
        setStatus('connected');
        setParticipantCount(room.remoteParticipants.size + 1);
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
        room.remoteParticipants.forEach(p => updateRemoteParticipant(p));
      } catch (err: any) {
        setError(err.message || 'Failed to connect to call');
        setStatus('error');
      }
    })();
  }, [updateRemoteParticipant, removeRemoteParticipant]);

  const endCall = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setActiveCall(null);
    setIsMinimized(false);
    setDuration(0);
    setStatus('connecting');
    setRemoteParticipants(new Map());
    setActiveSpeakerId(null);
  }, []);

  const minimize = useCallback(() => setIsMinimized(true), []);
  const maximize = useCallback(() => setIsMinimized(false), []);

  const toggleMic = useCallback(async () => {
    if (!roomRef.current) return;
    const next = !micOn;
    await roomRef.current.localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
  }, [micOn]);

  const toggleCam = useCallback(async () => {
    if (!roomRef.current) return;
    const next = !camOn;
    await roomRef.current.localParticipant.setCameraEnabled(next);
    if (next) {
      const camPub = roomRef.current.localParticipant.getTrackPublication(Track.Source.Camera);
      if (camPub?.track && localVideoRef.current) camPub.track.attach(localVideoRef.current);
    }
    setCamOn(next);
  }, [camOn]);

  const flipCamera = useCallback(async () => {
    if (!roomRef.current) return;
    const next = camFacing === 'front' ? 'back' : 'front';
    try {
      await roomRef.current.localParticipant.setCameraEnabled(false);
      await roomRef.current.switchActiveDevice('videoinput', next === 'back' ? 'environment' : 'user');
      await roomRef.current.localParticipant.setCameraEnabled(true);
      const camPub = roomRef.current.localParticipant.getTrackPublication(Track.Source.Camera);
      if (camPub?.track && localVideoRef.current) camPub.track.attach(localVideoRef.current);
      setCamFacing(next);
    } catch {
      await roomRef.current.localParticipant.setCameraEnabled(true);
    }
  }, [camFacing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) roomRef.current.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Update participant count when remote participants change
  useEffect(() => {
    setParticipantCount(remoteParticipants.size + 1);
  }, [remoteParticipants]);

  return (
    <CallContext.Provider value={{
      activeCall,
      isMinimized,
      duration,
      micOn,
      camOn,
      participantCount,
      status,
      error,
      remoteParticipants,
      activeSpeakerId,
      localQuality,
      camFacing,
      room: roomRef.current,
      localVideoRef,
      remoteVideoRefs,
      remoteAudioRefs,
      startCall,
      endCall,
      minimize,
      maximize,
      toggleMic,
      toggleCam,
      flipCamera,
    }}>
      {children}
      {/* Persistent hidden audio elements — keep playing even when CallModal is
          unmounted (minimized), so background calls don't lose audio. */}
      {activeCall && Array.from(remoteParticipants.values()).map(p => (
        <audio
          key={p.identity}
          ref={el => {
            if (!el) return;
            remoteAudioRefs.current.set(p.identity, el);
            const track = roomRef.current?.remoteParticipants.get(p.identity)?.getTrackPublication(Track.Source.Microphone)?.track;
            if (track && !el.srcObject) track.attach(el);
          }}
          autoPlay
          style={{ display: 'none' }}
        />
      ))}
    </CallContext.Provider>
  );
}
