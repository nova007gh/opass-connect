'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth';
import Avatar from '../../../../components/Avatar';
import EmojiPicker from '../../../../components/EmojiPicker';
import CallModal from '../../../../components/CallModal';

interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  body: string;
  createdAt: string;
  user: { id: string; profile?: { fullName?: string | null; avatarUrl?: string | null } | null };
}

interface ChatRoom {
  id: string;
  name: string;
  yearGroupId?: string | null;
}

interface Member {
  id: string;
  userId: string;
  banned: boolean;
  restricted: boolean;
  isLeader: boolean;
  user: { id: string; email: string; profile?: { fullName?: string | null; avatarUrl?: string | null; graduationYear?: number | null } | null };
}

function timeLabel(date: string) {
  return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function isEmojiOnly(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.length > 20) return false;
  const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Component}|\u200d|\ufe0f)+$/u;
  try { return emojiRegex.test(trimmed); } catch { return false; }
}

function isSticker(text: string): boolean { return text?.startsWith('🎴:') || false; }
function stickerContent(text: string): string { return text?.replace(/^🎴:/, '') || ''; }

interface Props {
  groupId: string;
  groupName: string;
  groupYear: number;
  canManage: boolean;
  isRestricted: boolean;
}

export default function GroupChat({ groupId, groupName, groupYear, canManage, isRestricted }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [activeCall, setActiveCall] = useState<{ type: 'audio' | 'video'; peerId: string; peerName: string; peerAvatar?: string | null } | null>(null);
  const [callError, setCallError] = useState('');

  const messagesEnd = useRef<HTMLDivElement>(null);
  const messagesContainer = useRef<HTMLDivElement>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load or create the chat room for this year group
  const loadRoom = useCallback(async () => {
    try {
      const r = await apiGet<ChatRoom>(`/year-groups/${groupId}/chat-room`);
      setRoom(r);
      return r;
    } catch (err: any) {
      setError(err.message || 'Failed to load chat room');
      setLoading(false);
      return null;
    }
  }, [groupId]);

  // Load messages for the room
  const loadMessages = useCallback(async (roomId: string, initial: boolean) => {
    try {
      const msgs = await apiGet<ChatMessage[]>(`/chat/rooms/${roomId}/messages?limit=50`);
      // Reverse so oldest is at top
      const sorted = [...msgs].reverse();
      if (initial) {
        setMessages(sorted);
        sorted.forEach(m => seenIdsRef.current.add(m.id));
      } else {
        // Only append new messages we haven't seen
        const newOnes = sorted.filter(m => !seenIdsRef.current.has(m.id));
        if (newOnes.length > 0) {
          setMessages(prev => [...prev, ...newOnes]);
          newOnes.forEach(m => seenIdsRef.current.add(m.id));
        }
      }
    } catch { /* noop */ } finally {
      if (initial) setLoading(false);
    }
  }, []);

  // Initialize room and messages
  useEffect(() => {
    let mounted = true;
    (async () => {
      const r = await loadRoom();
      if (!r || !mounted) return;
      await loadMessages(r.id, true);
    })();
    return () => { mounted = false; };
  }, [loadRoom, loadMessages]);

  // Poll for new messages every 3 seconds
  useEffect(() => {
    if (!room) return;
    pollRef.current = setInterval(() => loadMessages(room.id, false), 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [room, loadMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainer.current) {
      const el = messagesContainer.current;
      // Only auto-scroll if user is near the bottom (within 150px)
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
      if (isNearBottom) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [messages]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!loading && messagesContainer.current) {
      messagesContainer.current.scrollTop = messagesContainer.current.scrollHeight;
    }
  }, [loading]);

  const send = async () => {
    if (!input.trim() || !room || isRestricted) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    setError('');
    try {
      const msg = await apiPost<ChatMessage>(`/chat/rooms/${room.id}/messages`, { body: text });
      seenIdsRef.current.add(msg.id);
      setMessages(prev => [...prev, msg]);
      // Scroll to bottom immediately
      if (messagesContainer.current) messagesContainer.current.scrollTop = messagesContainer.current.scrollHeight;
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      setInput(text); // Restore input on failure
    } finally {
      setSending(false);
    }
  };

  const loadMembers = async () => {
    setMembersLoading(true);
    try {
      const list = await apiGet<Member[]>(`/year-groups/${groupId}/members`);
      setMembers(list);
    } catch { setMembers([]); } finally { setMembersLoading(false); }
  };

  const startDm = (userId: string) => {
    if (userId === user?.id) return;
    router.push(`/dashboard/chat/${userId}`);
  };

  const startCall = async (type: 'audio' | 'video', member: Member) => {
    if (member.userId === user?.id) return;
    setCallError('');
    setActiveCall({ type, peerId: member.userId, peerName: member.user.profile?.fullName || member.user.email, peerAvatar: member.user.profile?.avatarUrl });
  };

  const connectCall = async () => {
    if (!activeCall) throw new Error('No active call');
    const data = await apiPost<{ url: string; token: string }>(`/dm/${activeCall.peerId}/call`, { type: activeCall.type });
    return data;
  };

  if (loading) {
    return <div className="loading-center" style={{ minHeight: 200 }}><span className="spinner" /></div>;
  }

  if (!room) {
    return <div className="empty-state card"><h3>Chat unavailable</h3><p>{error || 'Could not load the group chat room.'}</p></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)', minHeight: 400 }}>
      {error && <div className="alert alert-error" style={{ marginBottom: 8, fontSize: 13 }}>{error}</div>}
      {callError && <div className="alert alert-error" style={{ marginBottom: 8, fontSize: 13 }}>{callError}</div>}

      {/* Chat header bar */}
      <div className="card" style={{ padding: '10px 14px', marginBottom: 0, borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--blue)', color: 'white', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {groupYear.toString().slice(-2)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{groupName}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Group chat · {members.length || '...'} members</div>
        </div>
        <button onClick={() => { setShowMembers(v => !v); if (!showMembers) loadMembers(); }} className="topbar-icon-btn" title="Members" style={{ width: 36, height: 36, flexShrink: 0 }}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} style={{ width: 20, height: 20 }}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.049-.032a6.375 6.375 0 01-1.096-1.052M5 6.375a2.625 2.625 0 115.25 0 2.625 2.625 0 01-5.25 0zm12.75 0a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
        </button>
      </div>

      {/* Messages area */}
      <div ref={messagesContainer} style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)', borderRadius: 0, borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)', padding: '12px 10px' }}>
        {messages.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <p style={{ fontSize: 14, color: 'var(--muted)' }}>No messages yet. Say hello to your classmates!</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const isMe = m.userId === user?.id;
            const prevMsg = messages[i - 1];
            const showAvatar = !prevMsg || prevMsg.userId !== m.userId || (new Date(m.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 5 * 60 * 1000);
            const senderName = m.user?.profile?.fullName || 'A member';
            return (
              <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 4, gap: 6, alignItems: 'flex-end' }}>
                {!isMe && (
                  <div style={{ width: showAvatar ? 30 : 30, flexShrink: 0 }}>
                    {showAvatar && <Avatar src={m.user?.profile?.avatarUrl} name={senderName} size={30} />}
                  </div>
                )}
                <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                  {!isMe && showAvatar && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)', marginBottom: 2, marginLeft: 4 }}>{senderName}</div>
                  )}
                  <div style={{
                    background: isMe ? 'var(--blue)' : 'var(--white)',
                    color: isMe ? 'white' : 'var(--text)',
                    borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    padding: isSticker(m.body) ? '4px 8px' : isEmojiOnly(m.body) ? '4px 8px' : '8px 14px',
                    border: isMe ? 'none' : '1px solid var(--border)',
                    fontSize: isSticker(m.body) ? 48 : isEmojiOnly(m.body) ? 32 : 14,
                    lineHeight: isSticker(m.body) || isEmojiOnly(m.body) ? 1.2 : 1.4,
                    wordBreak: 'break-word',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}>
                    {isSticker(m.body) ? stickerContent(m.body) : isEmojiOnly(m.body) ? m.body : m.body}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, marginRight: isMe ? 4 : 0, marginLeft: isMe ? 0 : 4 }}>{timeLabel(m.createdAt)}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEnd} />
      </div>

      {/* Input bar */}
      <div className="card" style={{ padding: '8px 10px', borderRadius: '0 0 12px 12px', borderTop: '1px solid var(--border)', position: 'relative' }}>
        {showEmojiPicker && (
          <EmojiPicker
            onPick={(emoji) => setInput(prev => prev + emoji)}
            onStickerPick={(sticker) => { setInput(`🎴:${sticker}`); setShowEmojiPicker(false); }}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}
        {isRestricted ? (
          <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 13, color: 'var(--muted)' }}>
            Your posting access is restricted. You can read but not send messages.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button type="button" onClick={() => setShowEmojiPicker(v => !v)} title="Emojis & stickers" style={{ width: 36, height: 36, borderRadius: 10, background: showEmojiPicker ? 'var(--blue-50)' : 'var(--bg)', border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              😊
            </button>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Type a message..."
              style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 999, padding: '8px 14px', fontSize: 14, outline: 0, background: 'var(--white)' }}
              maxLength={4000}
            />
            <button
              className="btn btn-sm"
              onClick={send}
              disabled={sending || !input.trim()}
              style={{ flexShrink: 0, width: 36, height: 36, borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {sending ? <span className="spinner" /> : (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Members sidebar / modal */}
      {showMembers && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowMembers(false)}>
          <div className="card" style={{ width: '100%', borderRadius: '20px 20px 0 0', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Group Members</h3>
              <button className="btn btn-sm" style={{ background: 'var(--muted)' }} onClick={() => setShowMembers(false)}>Close</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {membersLoading ? (
                <div className="loading-center"><span className="spinner" /></div>
              ) : members.length === 0 ? (
                <p className="text-muted text-sm" style={{ textAlign: 'center', padding: 20 }}>No members found.</p>
              ) : (
                members.map(m => {
                  const isMe = m.userId === user?.id;
                  const name = m.user.profile?.fullName || m.user.email;
                  return (
                    <div key={m.id} className="list-item" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px', borderBottom: '1px solid var(--border)' }}>
                      <Avatar src={m.user.profile?.avatarUrl} name={name} size={40} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {name}
                          {isMe && <span className="badge badge-blue" style={{ fontSize: 10 }}>You</span>}
                          {m.isLeader && <span className="badge badge-green" style={{ fontSize: 10 }}>Leader</span>}
                          {m.banned && <span className="badge badge-red" style={{ fontSize: 10 }}>Banned</span>}
                        </div>
                        {m.user.profile?.graduationYear && (
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Class of {m.user.profile.graduationYear}</div>
                        )}
                      </div>
                      {!isMe && (
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button onClick={() => startDm(m.userId)} title="Message" style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--blue-50)', border: 0, color: 'var(--blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                          </button>
                          <button onClick={() => startCall('audio', m)} title="Voice call" style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--blue-50)', border: 0, color: 'var(--blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h1.5a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106a2.25 2.25 0 00-2.239.68l-.665.766c-.283.326-.756.409-1.079.226a11.978 11.978 0 01-4.994-4.994c-.183-.323-.1-.796.226-1.079l.766-.665a2.25 2.25 0 00.68-2.239L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                          </button>
                          <button onClick={() => startCall('video', m)} title="Video call" style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--blue-50)', border: 0, color: 'var(--blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Call modal */}
      {activeCall && (
        <CallModal
          callType={activeCall.type}
          peerName={activeCall.peerName}
          peerAvatarUrl={activeCall.peerAvatar}
          connect={connectCall}
          onClose={() => setActiveCall(null)}
        />
      )}
    </div>
  );
}
