'use client';

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { Room, RoomEvent, Track, RemoteTrack, RemoteParticipant, VideoPresets, ConnectionQuality } from 'livekit-client';

interface CallSession {
  callType: 'audio' | 'video';
  peerName: string;
  peerAvatarUrl?: string | null;
  isGroupCall: boolean;
  url: string;
  token: string;
  roomId: string;
}

interface CallContextValue {
  activeCall: CallSession | null;
  isMinimized: boolean;
  duration: number;
  micOn: boolean;
  camOn: boolean;
  participantCount: number;
  status: 'connecting' | 'connected' | 'reconnecting' | 'error';
  startCall: (session: CallSession) => void;
  endCall: () => void;
  minimize: () => void;
  maximize: () => void;
  toggleMic: () => Promise<void>;
  toggleCam: () => Promise<void>;
  room: Room | null;
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

  const roomRef = useRef<Room | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    setParticipantCount(1);

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: { resolution: { width: 640, height: 360 }, facingMode: 'user' },
      publishDefaults: { videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360] },
    });
    roomRef.current = room;

    room.on(RoomEvent.Reconnecting, () => setStatus('reconnecting'));
    room.on(RoomEvent.Reconnected, () => setStatus('connected'));
    room.on(RoomEvent.ParticipantConnected, () => setParticipantCount(room.remoteParticipants.size + 1));
    room.on(RoomEvent.ParticipantDisconnected, () => setParticipantCount(room.remoteParticipants.size + 1));

    (async () => {
      try {
        await room.connect(session.url, session.token);
        await room.localParticipant.setMicrophoneEnabled(true);
        if (session.callType === 'video') {
          await room.localParticipant.setCameraEnabled(true);
        }
        setStatus('connected');
        setParticipantCount(room.remoteParticipants.size + 1);
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      } catch (err) {
        setStatus('error');
      }
    })();
  }, []);

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
    setCamOn(next);
  }, [camOn]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) roomRef.current.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <CallContext.Provider value={{
      activeCall,
      isMinimized,
      duration,
      micOn,
      camOn,
      participantCount,
      status,
      startCall,
      endCall,
      minimize,
      maximize,
      toggleMic,
      toggleCam,
      room: roomRef.current,
    }}>
      {children}
    </CallContext.Provider>
  );
}
