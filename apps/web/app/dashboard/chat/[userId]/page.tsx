'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { apiGet, apiPost, apiUpload } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth';
import { playSchoolBell, playBuzzSound } from '../../../../lib/sound';
import CallModal from '../../../../components/CallModal';

interface DMUser {
  id: string;
  email: string;
  profile?: {
    fullName?: string | null;
    avatarUrl?: string | null;
    graduationYear?: number | null;
    profession?: string | null;
    house?: string | null;
    country?: string | null;
    city?: string | null;
    bio?: string | null;
  } | null;
}

interface DMMessage {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  audioUrl?: string | null;
  callType?: string | null;
  isBuzz?: boolean;
  createdAt: string;
}

function timeLabel(date: string) {
  return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function DirectChatPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const peerId = params.userId as string;

  const [peer, setPeer] = useState<DMUser | null>(null);
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const [recording, setRecording] = useState(false);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [activeCall, setActiveCall] = useState<{ type: 'audio' | 'video'; mode: 'start' | 'join' } | null>(null);
  const [callError, setCallError] = useState('');
  const [shaking, setShaking] = useState(false);

  const messagesEnd = useRef<HTMLDivElement>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ user: DMUser; messages: DMMessage[] }>(`/dm/${peerId}`);
      setPeer(data.user);
      setMessages(data.messages);
      seenIdsRef.current = new Set(data.messages.map(m => m.id));
    } catch (err: any) {
      setError(err.message || 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  }, [peerId]);

  useEffect(() => { load(); }, [load]);

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 700);
  };

  // Auto-launch a call if navigated here with ?call=audio|video
  useEffect(() => {
    const callParam = searchParams.get('call');
    if (peer && (callParam === 'audio' || callParam === 'video')) {
      setActiveCall({ type: callParam, mode: 'start' });
      router.replace(`/dashboard/chat/${peerId}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peer]);

  // Poll for new messages — plays a school-bell sound (or an urgent buzz) when the
  // peer sends something new, and shakes the screen for buzzes.
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await apiGet<{ user: DMUser; messages: DMMessage[] }>(`/dm/${peerId}`);
        const incoming = data.messages.filter(m => !seenIdsRef.current.has(m.id) && m.senderId !== user?.id);
        if (incoming.length > 0) {
          if (incoming.some(m => m.isBuzz)) {
            playBuzzSound();
            triggerShake();
          } else {
            playSchoolBell('normal');
          }
        }
        seenIdsRef.current = new Set(data.messages.map(m => m.id));
        setMessages(prev => prev.length !== data.messages.length ? data.messages : prev);
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [peerId, user?.id]);

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async () => {
    const body = input.trim();
    if (!body) return;
    setInput('');
    setSending(true);
    try {
      const msg = await apiPost<DMMessage>(`/dm/${peerId}`, { body });
      seenIdsRef.current.add(msg.id);
      setMessages(prev => [...prev, msg]);
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      setInput(body);
    } finally {
      setSending(false);
    }
  };

  // ===== Voice notes =====
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size === 0) return;
        setUploadingVoice(true);
        try {
          const ext = (recorder.mimeType || 'audio/webm').includes('mp4') ? 'm4a' : 'webm';
          const file = new File([blob], `voice-note.${ext}`, { type: blob.type });
          const msg = await apiUpload<DMMessage>(`/dm/${peerId}/voice`, file);
          seenIdsRef.current.add(msg.id);
          setMessages(prev => [...prev, msg]);
        } catch (err: any) {
          setError(err.message || 'Failed to send voice note');
        } finally {
          setUploadingVoice(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError('Microphone access denied. Please allow microphone access to send voice notes.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  // ===== Calls =====
  const startCall = async (type: 'audio' | 'video') => {
    setCallError('');
    setActiveCall({ type, mode: 'start' });
  };

  const joinCall = async (type: 'audio' | 'video') => {
    setCallError('');
    setActiveCall({ type, mode: 'join' });
  };

  const connectCall = async () => {
    if (!activeCall) throw new Error('No active call');
    if (activeCall.mode === 'start') {
      const data = await apiPost<{ url: string; token: string }>(`/dm/${peerId}/call`, { type: activeCall.type });
      // Refresh messages so the call log entry shows up
      load();
      return data;
    }
    const data = await apiPost<{ url: string; token: string }>(`/dm/${peerId}/call/join`);
    return data;
  };

  if (loading) {
    return <div className="app-screen fade-in"><div className="loading-center"><span className="spinner" /></div></div>;
  }
  if (!peer) {
    return (
      <div className="app-screen fade-in">
        <div className="empty-state"><h3>User not found</h3><button className="btn btn-sm" onClick={() => router.back()}>Go back</button></div>
      </div>
    );
  }

  const displayName = peer.profile?.fullName || peer.email;

  return (
    <div className={`app-screen fade-in ${shaking ? 'shake-screen' : ''}`} style={{ background: 'var(--bg)' }}>
      <div className="screen-header" style={{ position: 'sticky', top: 0 }}>
        <button onClick={() => router.back()} className="back">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: 'var(--blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0, marginRight: 8 }}>
          {peer.profile?.avatarUrl ? <img src={peer.profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : displayName.charAt(0).toUpperCase()}
        </div>
        <h1 style={{ fontSize: 16 }}>{displayName}</h1>
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          <button onClick={() => startCall('audio')} className="topbar-icon-btn" title="Voice call" aria-label="Voice call">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} style={{ width: 20, height: 20 }}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h1.5a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106a2.25 2.25 0 00-2.239.68l-.665.766c-.283.326-.756.409-1.079.226a11.978 11.978 0 01-4.994-4.994c-.183-.323-.1-.796.226-1.079l.766-.665a2.25 2.25 0 00.68-2.239L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
          </button>
          <button onClick={() => startCall('video')} className="topbar-icon-btn" title="Video call" aria-label="Video call">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} style={{ width: 20, height: 20 }}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
          </button>
        </div>
      </div>

      <div className="app-scroll" style={{ flex: 1, padding: '16px 16px 8px' }}>
        {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
        {callError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{callError}</div>}

        {messages.length === 0 ? (
          <div className="empty-state">
            <h3>Say hello to {peer.profile?.fullName?.split(' ')[0] || 'your classmate'}!</h3>
            <p>{peer.profile?.graduationYear ? `Class of ${peer.profile.graduationYear}` : ''}{peer.profile?.profession ? ` · ${peer.profile.profession}` : ''}</p>
          </div>
        ) : (
          messages.map(m => {
            const isMe = m.senderId === user?.id;
            if (m.isBuzz) {
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'center', margin: '14px 0' }}>
                  <div style={{ background: 'linear-gradient(135deg, #F59E0B, #FBBF24)', color: 'white', borderRadius: 999, padding: '10px 20px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 6px 16px rgba(245,158,11,0.35)' }}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 16, height: 16 }}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
                    {isMe ? `You buzzed ${displayName}!` : `${displayName} buzzed you!`}
                    <span style={{ opacity: 0.85, fontWeight: 400 }}>· {timeLabel(m.createdAt)}</span>
                  </div>
                </div>
              );
            }
            if (m.callType) {
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
                  <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 999, padding: '8px 16px', fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h1.5a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106a2.25 2.25 0 00-2.239.68l-.665.766c-.283.326-.756.409-1.079.226a11.978 11.978 0 01-4.994-4.994c-.183-.323-.1-.796.226-1.079l.766-.665a2.25 2.25 0 00.68-2.239L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                    {isMe ? `You started a ${m.callType} call` : `${displayName} called (${m.callType})`}
                    <span>· {timeLabel(m.createdAt)}</span>
                    {!isMe && (
                      <button className="btn btn-sm" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => joinCall(m.callType as 'audio' | 'video')}>Join</button>
                    )}
                  </div>
                </div>
              );
            }
            return (
              <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
                <div style={{
                  maxWidth: '75%', padding: m.audioUrl ? '8px 10px' : '10px 14px', borderRadius: 16,
                  background: isMe ? 'var(--blue)' : 'var(--white)', color: isMe ? 'white' : 'var(--black)',
                  border: isMe ? 'none' : '1px solid var(--border)',
                  borderBottomRightRadius: isMe ? 4 : 16, borderBottomLeftRadius: isMe ? 16 : 4,
                }}>
                  {m.audioUrl ? (
                    <audio controls src={m.audioUrl} style={{ maxWidth: 220, height: 36 }} />
                  ) : (
                    <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.body}</div>
                  )}
                  <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7, textAlign: 'right' }}>{timeLabel(m.createdAt)}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEnd} />
      </div>

      <div style={{ padding: '12px 16px calc(20px + env(safe-area-inset-bottom, 0px))', borderTop: '1px solid var(--border)', background: 'var(--white)', display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          className="input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={recording ? 'Recording voice note…' : 'Type a message...'}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          disabled={sending || recording || uploadingVoice}
          style={{ flex: 1, marginBottom: 0 }}
        />
        {input.trim() ? (
          <button className="btn" onClick={sendMessage} disabled={sending} style={{ minHeight: 48, width: 48, padding: 0, flexShrink: 0 }}>
            {sending ? <span className="spinner" /> : <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 20, height: 20 }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>}
          </button>
        ) : (
          <button
            onClick={recording ? stopRecording : startRecording}
            disabled={uploadingVoice}
            style={{
              minHeight: 48, width: 48, borderRadius: '50%', border: 0, flexShrink: 0, cursor: 'pointer',
              background: recording ? '#EF4444' : 'var(--blue)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            title={recording ? 'Stop and send' : 'Record voice note'}
          >
            {uploadingVoice ? <span className="spinner" /> : recording ? (
              <svg fill="currentColor" viewBox="0 0 24 24" style={{ width: 18, height: 18 }}><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
            ) : (
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 20, height: 20 }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
            )}
          </button>
        )}
      </div>

      {activeCall && (
        <CallModal
          callType={activeCall.type}
          peerName={displayName}
          peerAvatarUrl={peer.profile?.avatarUrl}
          connect={connectCall}
          onClose={() => setActiveCall(null)}
        />
      )}
    </div>
  );
}
