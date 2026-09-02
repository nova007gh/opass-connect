'use client';

import { useCall } from './CallProvider';

export default function FloatingCallWidget() {
  const { activeCall, isMinimized, duration, micOn, camOn, participantCount, status, endCall, maximize, toggleMic, toggleCam } = useCall();

  if (!activeCall || !isMinimized) return null;

  const fmtDuration = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  return (
    <div style={{
      position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
      left: 12, right: 12, zIndex: 9000,
      background: 'rgba(15, 23, 42, 0.92)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      backdropFilter: 'blur(20px) saturate(180%)',
      borderRadius: 16, padding: '10px 14px',
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.1)',
    }}>
      {/* Tap to expand */}
      <div onClick={maximize} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', minWidth: 0 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: activeCall.callType === 'video' ? 'linear-gradient(135deg, #0051FF 0%, #0B2D6B 100%)' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <span style={{ fontSize: 18 }}>{activeCall.callType === 'video' ? '🎥' : '📞'}</span>
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ color: 'white', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {activeCall.peerName}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: status === 'connected' ? '#22C55E' : '#EAB308', display: 'inline-block' }} />
            {status === 'connecting' ? 'Connecting…' : status === 'reconnecting' ? 'Reconnecting…' : `${fmtDuration(duration)} · ${participantCount} in call`}
          </div>
        </div>
      </div>

      {/* Quick controls */}
      <button onClick={toggleMic} style={{
        width: 36, height: 36, borderRadius: '50%', border: 0, cursor: 'pointer',
        background: micOn ? 'rgba(255,255,255,0.15)' : 'rgba(239,68,68,0.8)',
        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }} title={micOn ? 'Mute' : 'Unmute'}>
        {micOn ? (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
        ) : (
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.25l13.5 13.5M15 10.5V4.5a3 3 0 00-5.94-.6" /></svg>
        )}
      </button>
      {activeCall.callType === 'video' && (
        <button onClick={toggleCam} style={{
          width: 36, height: 36, borderRadius: '50%', border: 0, cursor: 'pointer',
          background: camOn ? 'rgba(255,255,255,0.15)' : 'rgba(239,68,68,0.8)',
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }} title={camOn ? 'Camera off' : 'Camera on'}>
          {camOn ? (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
          ) : (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
          )}
        </button>
      )}
      <button onClick={endCall} style={{
        width: 36, height: 36, borderRadius: '50%', border: 0, cursor: 'pointer',
        background: '#EF4444', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }} title="Hang up">
        <svg fill="currentColor" viewBox="0 0 24 24" style={{ width: 18, height: 18, transform: 'rotate(135deg)' }}><path d="M3.62 6.395a1.5 1.5 0 01.13-2.014l1.048-1.048a1.5 1.5 0 012.12 0l2.401 2.4a1.5 1.5 0 01.29 1.723L8.4 9.665a12.045 12.045 0 005.936 5.936l1.209-1.208a1.5 1.5 0 011.723.29l2.4 2.4a1.5 1.5 0 010 2.121l-1.048 1.048a1.5 1.5 0 01-2.013.13C10.856 16.842 6.157 12.144 3.62 6.395z" /></svg>
      </button>
    </div>
  );
}
