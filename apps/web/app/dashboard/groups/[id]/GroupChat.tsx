'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth';
import Avatar from '../../../../components/Avatar';
import EmojiPicker from '../../../../components/EmojiPicker';
import CallModal from '../../../../components/CallModal';
import { playSchoolBell, playPop, playGunshot, playWhistle, playDrumRoll, playTada, playShush, primeAudio } from '../../../../lib/sound';

interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  body: string;
  reactions?: Record<string, string[]> | null;
  replyToId?: string | null;
  createdAt: string;
  replyTo?: { id: string; body: string; userId: string; user: { profile?: { fullName?: string | null } | null } } | null;
  user: { id: string; profile?: { fullName?: string | null; avatarUrl?: string | null } | null };
}

interface ChatRoom { id: string; name: string; yearGroupId?: string | null; }

interface Member {
  id: string; userId: string; banned: boolean; restricted: boolean; isLeader: boolean;
  user: { id: string; email: string; profile?: { fullName?: string | null; avatarUrl?: string | null; graduationYear?: number | null } | null };
}

// ===== Helpers =====
function timeLabel(date: string) { return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }
function dateKey(date: string) { return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }
function isSameDay(d1: string, d2: string) { return dateKey(d1) === dateKey(d2); }

function isEmojiOnly(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.length > 20) return false;
  try { return /^(\p{Extended_Pictographic}|\p{Emoji_Component}|\u200d|\ufe0f)+$/u.test(trimmed); } catch { return false; }
}
function isSticker(text: string): boolean { return text?.startsWith('🎴:') || false; }
function stickerContent(text: string): string { return text?.replace(/^🎴:/, '') || ''; }

// Check if a message is an activity message (prefixed with 🎯ACT:)
function isActivity(text: string): boolean { return text?.startsWith('🎯ACT:') || false; }
interface ActivityData { type: string; emoji: string; label: string; }
function parseActivity(text: string): ActivityData | null {
  if (!isActivity(text)) return null;
  const parts = text.replace('🎯ACT:', '').split(':');
  return { type: parts[0] || '', emoji: parts[1] || '', label: parts.slice(2).join(':') || '' };
}

// ===== Fun OPASS Activities =====
const ACTIVITIES = [
  { type: 'assembly', emoji: '🔔', label: 'Assembly!', sound: () => playSchoolBell('loud'), message: 'ASSEMBLY! All students to the assembly hall NOW! 🔔' },
  { type: 'rollcall', emoji: '📢', label: 'Roll Call', sound: () => playWhistle(), message: 'ROLL CALL! Answer when your name is called! 📢' },
  { type: 'preps', emoji: '📚', label: 'Preps Time', sound: () => playDrumRoll(), message: 'PREPS TIME! Quiet please, study in progress! 📚🤫' },
  { type: 'gunshot', emoji: '🔫', label: 'Gunshot!', sound: () => playGunshot(), message: '💥 BANG! 🔫' },
  { type: 'choptime', emoji: '🍲', label: 'Chop Time!', sound: () => playTada(), message: '🍲 CHOP TIME! Food is ready! Run before it finishes! 🏃‍♂️💨' },
  { type: 'lightsout', emoji: '😴', label: 'Lights Out', sound: () => playShush(), message: '😴 LIGHTS OUT! Everyone to bed! Shhh... 🌙🤫' },
  { type: 'late', emoji: '🏃', label: "I'm Late!", sound: () => playPop(), message: '🏃 I\'M RUNNING LATE! Save me a seat! 😅' },
  { type: 'celebrate', emoji: '🎉', label: 'Celebrate!', sound: () => playTada(), message: '🎉🎉🎉 CELEBRATION TIME! 🎉🎉🎉' },
];

// ===== Quick reactions (Telegram-style) =====
const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '👏', '😮', '😢', '🙏'];

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
  const [showActivities, setShowActivities] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [activeCall, setActiveCall] = useState<{ type: 'audio' | 'video'; peerId: string; peerName: string; peerAvatar?: string | null } | null>(null);
  const [callError, setCallError] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [reactingTo, setReactingTo] = useState<string | null>(null);
  const [showActivityBar, setShowActivityBar] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [lastMessageCount, setLastMessageCount] = useState(0);

  const messagesEnd = useRef<HTMLDivElement>(null);
  const messagesContainer = useRef<HTMLDivElement>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPollRef = useRef<number>(0);

  // Load or create the chat room
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

  // Load messages
  const loadMessages = useCallback(async (roomId: string, initial: boolean) => {
    try {
      const msgs = await apiGet<ChatMessage[]>(`/chat/rooms/${roomId}/messages?limit=50`);
      const sorted = [...msgs].reverse();
      if (initial) {
        setMessages(sorted);
        sorted.forEach(m => seenIdsRef.current.add(m.id));
        setLastMessageCount(sorted.length);
      } else {
        const newOnes = sorted.filter(m => !seenIdsRef.current.has(m.id));
        if (newOnes.length > 0) {
          // Check for new messages from others — play sound
          const hasNewFromOthers = newOnes.some(m => m.userId !== user?.id);
          if (hasNewFromOthers) {
            const latest = newOnes[newOnes.length - 1];
            if (isActivity(latest.body)) {
              const act = parseActivity(latest.body);
              const activity = ACTIVITIES.find(a => a.type === act?.type);
              if (activity) activity.sound();
            } else {
              playPop();
            }
          }
          setMessages(prev => [...prev, ...newOnes]);
          newOnes.forEach(m => seenIdsRef.current.add(m.id));
        }
        // Update reactions on existing messages
        setMessages(prev => prev.map(m => {
          const updated = sorted.find(s => s.id === m.id);
          return updated ? { ...m, reactions: updated.reactions, replyTo: updated.replyTo } : m;
        }));
      }
      lastPollRef.current = Date.now();
    } catch { /* noop */ } finally {
      if (initial) setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const r = await loadRoom();
      if (!r || !mounted) return;
      await loadMessages(r.id, true);
    })();
    return () => { mounted = false; };
  }, [loadRoom, loadMessages]);

  // Poll for new messages every 2.5 seconds
  useEffect(() => {
    if (!room) return;
    pollRef.current = setInterval(() => loadMessages(room.id, false), 2500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [room, loadMessages]);

  // Auto-scroll
  useEffect(() => {
    if (messagesContainer.current) {
      const el = messagesContainer.current;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
      if (isNearBottom) el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!loading && messagesContainer.current) {
      messagesContainer.current.scrollTop = messagesContainer.current.scrollHeight;
    }
  }, [loading]);

  const send = async (text?: string) => {
    const body = (text || input).trim();
    if (!body || !room || isRestricted) return;
    setInput('');
    setSending(true);
    setError('');
    const replyId = replyTo?.id;
    setReplyTo(null);
    try {
      const msg = await apiPost<ChatMessage>(`/chat/rooms/${room.id}/messages`, { body, replyToId: replyId });
      seenIdsRef.current.add(msg.id);
      setMessages(prev => [...prev, msg]);
      if (messagesContainer.current) messagesContainer.current.scrollTop = messagesContainer.current.scrollHeight;
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      setInput(body);
    } finally {
      setSending(false);
    }
  };

  const sendActivity = async (activity: typeof ACTIVITIES[0]) => {
    if (!room || isRestricted) return;
    setShowActivities(false);
    setShowActivityBar(false);
    activity.sound();
    const body = `🎯ACT:${activity.type}:${activity.emoji}:${activity.message}`;
    setSending(true);
    try {
      const msg = await apiPost<ChatMessage>(`/chat/rooms/${room.id}/messages`, { body });
      seenIdsRef.current.add(msg.id);
      setMessages(prev => [...prev, msg]);
      if (messagesContainer.current) messagesContainer.current.scrollTop = messagesContainer.current.scrollHeight;
    } catch (err: any) {
      setError(err.message || 'Failed to send activity');
    } finally {
      setSending(false);
    }
  };

  const toggleReaction = async (msgId: string, emoji: string) => {
    setReactingTo(null);
    if (!room) return;
    // Optimistic update
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const reactions = { ...(m.reactions || {}) };
      const users = reactions[emoji] || [];
      if (users.includes(user?.id || '')) {
        reactions[emoji] = users.filter(u => u !== user?.id);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else {
        reactions[emoji] = [...users, user?.id || ''];
      }
      return { ...m, reactions };
    }));
    playPop();
    try {
      await apiPost(`/chat/rooms/${room.id}/messages/${msgId}/react`, { emoji });
    } catch { /* revert on next poll */ }
  };

  const loadMembers = async () => {
    setMembersLoading(true);
    try {
      const list = await apiGet<Member[]>(`/year-groups/${groupId}/members`);
      setMembers(list);
    } catch { setMembers([]); } finally { setMembersLoading(false); }
  };

  const startDm = (userId: string) => { if (userId !== user?.id) router.push(`/dashboard/chat/${userId}`); };

  const startCall = async (type: 'audio' | 'video', member: Member) => {
    if (member.userId === user?.id) return;
    setCallError('');
    setActiveCall({ type, peerId: member.userId, peerName: member.user.profile?.fullName || member.user.email, peerAvatar: member.user.profile?.avatarUrl });
  };

  const connectCall = async () => {
    if (!activeCall) throw new Error('No active call');
    return apiPost<{ url: string; token: string }>(`/dm/${activeCall.peerId}/call`, { type: activeCall.type });
  };

  if (loading) return <div className="loading-center" style={{ minHeight: 200 }}><span className="spinner" /></div>;
  if (!room) return <div className="empty-state card"><h3>Chat unavailable</h3><p>{error || 'Could not load the group chat room.'}</p></div>;

  // Group consecutive messages by same user within 3 minutes
  const groupedMessages: { date: string; items: ChatMessage[] }[] = [];
  let currentDate = '';
  messages.forEach(m => {
    const dKey = dateKey(m.createdAt);
    if (dKey !== currentDate) {
      currentDate = dKey;
      groupedMessages.push({ date: dKey, items: [m] });
    } else {
      groupedMessages[groupedMessages.length - 1].items.push(m);
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', minHeight: 400 }}>
      {error && <div className="alert alert-error" style={{ marginBottom: 8, fontSize: 13, padding: '6px 12px' }}>{error}<button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 0, cursor: 'pointer' }}>×</button></div>}
      {callError && <div className="alert alert-error" style={{ marginBottom: 8, fontSize: 13 }}>{callError}</div>}

      {/* Chat header */}
      <div style={{ padding: '10px 14px', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)', background: 'var(--white)' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--blue)', color: 'white', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
          {groupYear.toString().slice(-2)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{groupName}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
            {members.length || '...'} members
          </div>
        </div>
        <button onClick={() => { setShowMembers(v => !v); if (!showMembers) loadMembers(); }} className="topbar-icon-btn" title="Members" style={{ width: 36, height: 36, flexShrink: 0 }}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} style={{ width: 20, height: 20 }}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.049-.032a6.375 6.375 0 01-1.096-1.052M5 6.375a2.625 2.625 0 115.25 0 2.625 2.625 0 01-5.25 0zm12.75 0a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
        </button>
      </div>

      {/* Messages area — WhatsApp-style wallpaper */}
      <div ref={messagesContainer} style={{
        flex: 1, overflowY: 'auto', padding: '8px 8px',
        background: 'var(--chat-bg, #E5DDD5)',
        backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.03) 1px, transparent 1px), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)',
      }}>
        {messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>💬</div>
            <p style={{ fontSize: 14 }}>No messages yet</p>
            <p style={{ fontSize: 12 }}>Say hello to your classmates or send a fun activity! 🔔</p>
          </div>
        ) : (
          groupedMessages.map((group, gi) => (
            <div key={gi}>
              {/* Date separator */}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0 8px' }}>
                <span style={{ background: 'rgba(0,0,0,0.08)', color: 'var(--muted)', fontSize: 11, fontWeight: 600, padding: '3px 12px', borderRadius: 8, backdropFilter: 'blur(4px)' }}>
                  {group.date === dateKey(new Date().toISOString()) ? 'Today' : group.date}
                </span>
              </div>
              {group.items.map((m, i) => {
                const isMe = m.userId === user?.id;
                const prevMsg = i > 0 ? group.items[i - 1] : null;
                const nextMsg = i < group.items.length - 1 ? group.items[i + 1] : null;
                const isFirstInGroup = !prevMsg || prevMsg.userId !== m.userId || (new Date(m.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 3 * 60 * 1000);
                const isLastInGroup = !nextMsg || nextMsg.userId !== m.userId || (new Date(nextMsg.createdAt).getTime() - new Date(m.createdAt).getTime() > 3 * 60 * 1000);
                const senderName = m.user?.profile?.fullName || 'A member';
                const activity = parseActivity(m.body);
                const reactions = m.reactions || {};

                return (
                  <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: isLastInGroup ? 8 : 1, gap: 6, alignItems: 'flex-end', position: 'relative' }}>
                    {/* Avatar (show only for first message in group, not me) */}
                    {!isMe && (
                      <div style={{ width: 30, flexShrink: 0, visibility: isFirstInGroup ? 'visible' : 'hidden' }}>
                        {isFirstInGroup && <Avatar src={m.user?.profile?.avatarUrl} name={senderName} size={30} />}
                      </div>
                    )}

                    <div
                      style={{ maxWidth: '78%', position: 'relative' }}
                      onDoubleClick={() => toggleReaction(m.id, '❤️')}
                    >
                      {/* Reply quote */}
                      {m.replyTo && (
                        <div style={{
                          background: isMe ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)',
                          borderLeft: '3px solid var(--blue)',
                          borderRadius: '8px 8px 0 0',
                          padding: '4px 10px',
                          fontSize: 12,
                          color: isMe ? 'rgba(255,255,255,0.8)' : 'var(--muted)',
                          marginBottom: 0,
                        }}>
                          <div style={{ fontWeight: 700, fontSize: 11 }}>{m.replyTo.user?.profile?.fullName || 'A member'}</div>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
                            {isSticker(m.replyTo.body) ? '🎴 Sticker' : isActivity(m.replyTo.body) ? '🎯 Activity' : m.replyTo.body}
                          </div>
                        </div>
                      )}

                      {/* Activity message — special card */}
                      {activity ? (
                        <div style={{
                          background: isMe ? 'var(--blue)' : 'var(--white)',
                          borderRadius: '12px',
                          padding: '12px 16px',
                          border: isMe ? 'none' : '1px solid var(--border)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          display: 'flex', alignItems: 'center', gap: 10,
                          animation: 'pop-in 0.3s ease',
                        }}>
                          <span style={{ fontSize: 32 }}>{activity.emoji}</span>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--blue)' }}>Activity</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: isMe ? 'white' : 'var(--text)' }}>{activity.label}</div>
                          </div>
                          <span style={{ fontSize: 10, color: isMe ? 'rgba(255,255,255,0.6)' : 'var(--muted)', marginLeft: 'auto' }}>{timeLabel(m.createdAt)}</span>
                        </div>
                      ) : (
                        /* Regular message bubble — WhatsApp style with tail */
                        <div style={{
                          background: isMe ? 'var(--blue)' : 'var(--white)',
                          color: isMe ? 'white' : 'var(--text)',
                          borderRadius: isMe
                            ? `16px ${isLastInGroup ? '4px' : '16px'} 16px ${isFirstInGroup ? '4px' : '16px'}`
                            : `${isFirstInGroup ? '4px' : '16px'} 16px ${isLastInGroup ? '4px' : '16px'} 16px`,
                          padding: isSticker(m.body) ? '4px 8px' : isEmojiOnly(m.body) ? '4px 10px' : '6px 12px',
                          border: isMe ? 'none' : '1px solid var(--border)',
                          fontSize: isSticker(m.body) ? 48 : isEmojiOnly(m.body) ? 36 : 14,
                          lineHeight: isSticker(m.body) || isEmojiOnly(m.body) ? 1.2 : 1.4,
                          wordBreak: 'break-word',
                          boxShadow: '0 1px 1px rgba(0,0,0,0.08)',
                          position: 'relative',
                          minWidth: 60,
                        }}>
                          {/* Sender name (only for first message in group, not me) */}
                          {!isMe && isFirstInGroup && (
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)', marginBottom: 2 }}>{senderName}</div>
                          )}
                          {isSticker(m.body) ? stickerContent(m.body) : isEmojiOnly(m.body) ? m.body : m.body}
                          {/* Timestamp — WhatsApp style, inline at bottom right */}
                          <span style={{ fontSize: 9, color: isMe ? 'rgba(255,255,255,0.6)' : 'var(--muted)', marginLeft: 8, float: 'right', marginTop: 4, userSelect: 'none' }}>
                            {timeLabel(m.createdAt)}
                          </span>
                        </div>
                      )}

                      {/* Reactions — Telegram/Instagram style */}
                      {Object.keys(reactions).length > 0 && (
                        <div style={{ display: 'flex', gap: 2, marginTop: 2, flexWrap: 'wrap', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                          {Object.entries(reactions).map(([emoji, users]) => {
                            const count = users.length;
                            const reacted = users.includes(user?.id || '');
                            return (
                              <button
                                key={emoji}
                                onClick={() => toggleReaction(m.id, emoji)}
                                style={{
                                  background: reacted ? 'var(--blue-50)' : 'var(--white)',
                                  border: `1px solid ${reacted ? 'var(--blue)' : 'var(--border)'}`,
                                  borderRadius: 12,
                                  padding: '1px 8px',
                                  fontSize: 12,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 3,
                                  transition: 'all 0.15s',
                                }}
                              >
                                <span>{emoji}</span>
                                {count > 1 && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)' }}>{count}</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Quick reaction bar — shows on hover */}
                      <div className="msg-actions" style={{
                        position: 'absolute',
                        bottom: '100%',
                        [isMe ? 'right' : 'left']: 0,
                        marginBottom: 4,
                        display: 'none',
                        gap: 2,
                        background: 'var(--white)',
                        borderRadius: 20,
                        padding: '3px 6px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        zIndex: 10,
                        alignItems: 'center',
                      }}>
                        {QUICK_REACTIONS.slice(0, 5).map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(m.id, emoji)}
                            style={{ background: 'none', border: 0, fontSize: 18, cursor: 'pointer', padding: '2px 4px', transition: 'transform 0.15s' }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.3)'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
                          >{emoji}</button>
                        ))}
                        <button
                          onClick={() => setReplyTo(m)}
                          style={{ background: 'none', border: 0, cursor: 'pointer', padding: '2px 4px', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}
                          title="Reply"
                        >
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 16, height: 16 }}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEnd} />
      </div>

      {/* Reply preview bar */}
      {replyTo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--blue-50)', borderTop: '1px solid var(--border)', borderRadius: 0 }}>
          <svg fill="none" stroke="var(--blue)" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18, flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)' }}>{replyTo.user?.profile?.fullName || 'A member'}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isSticker(replyTo.body) ? '🎴 Sticker' : isActivity(replyTo.body) ? '🎯 Activity' : replyTo.body}
            </div>
          </div>
          <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--muted)', fontSize: 18 }}>×</button>
        </div>
      )}

      {/* Activity bar — quick fun buttons */}
      {showActivityBar && (
        <div style={{ display: 'flex', gap: 6, padding: '8px 10px', overflowX: 'auto', background: 'var(--white)', borderTop: '1px solid var(--border)', scrollbarWidth: 'none' }}>
          {ACTIVITIES.map(a => (
            <button
              key={a.type}
              onClick={() => sendActivity(a)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12,
                padding: '8px 12px', cursor: 'pointer', flexShrink: 0, minWidth: 64,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--blue-50)'; e.currentTarget.style.borderColor = 'var(--blue)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <span style={{ fontSize: 24 }}>{a.emoji}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>{a.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input bar — WhatsApp/Telegram style */}
      <div style={{ padding: '8px 10px', borderRadius: '0 0 12px 12px', borderTop: '1px solid var(--border)', background: 'var(--white)', position: 'relative' }}>
        {showEmojiPicker && (
          <EmojiPicker
            onPick={(emoji) => setInput(prev => prev + emoji)}
            onStickerPick={(sticker) => { send(`🎴:${sticker}`); setShowEmojiPicker(false); }}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}
        {isRestricted ? (
          <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 13, color: 'var(--muted)' }}>
            🔒 Your posting access is restricted. You can read but not send messages.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end' }}>
            {/* Activities button */}
            <button
              type="button"
              onClick={() => { setShowActivityBar(v => !v); setShowEmojiPicker(false); }}
              title="Fun activities"
              style={{
                width: 36, height: 36, borderRadius: '50%', border: 0, cursor: 'pointer',
                background: showActivityBar ? 'var(--blue-50)' : 'var(--bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
                transition: 'all 0.15s', transform: showActivityBar ? 'rotate(45deg)' : 'none',
              }}
            >⚡</button>
            {/* Emoji button */}
            <button
              type="button"
              onClick={() => { setShowEmojiPicker(v => !v); setShowActivityBar(false); }}
              title="Emojis & stickers"
              style={{
                width: 36, height: 36, borderRadius: '50%', border: 0, cursor: 'pointer',
                background: showEmojiPicker ? 'var(--blue-50)' : 'var(--bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
              }}
            >😊</button>
            {/* Text input */}
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Type a message..."
              style={{
                flex: 1, border: '1px solid var(--border)', borderRadius: 22,
                padding: '8px 16px', fontSize: 14, outline: 0, background: 'var(--bg)',
              }}
              maxLength={4000}
            />
            {/* Send button */}
            <button
              onClick={() => send()}
              disabled={sending || !input.trim()}
              style={{
                width: 36, height: 36, borderRadius: '50%', padding: 0, flexShrink: 0,
                border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: input.trim() ? 'var(--blue)' : 'var(--muted)',
                color: 'white', transition: 'all 0.15s',
              }}
            >
              {sending ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Members sidebar */}
      {showMembers && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowMembers(false)}>
          <div className="card" style={{ width: '100%', borderRadius: '20px 20px 0 0', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Group Members</h3>
              <button className="btn btn-sm" style={{ background: 'var(--muted)' }} onClick={() => setShowMembers(false)}>Close</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {membersLoading ? <div className="loading-center"><span className="spinner" /></div> :
               members.length === 0 ? <p className="text-muted text-sm" style={{ textAlign: 'center', padding: 20 }}>No members found.</p> :
               members.map(m => {
                 const isMe = m.userId === user?.id;
                 const name = m.user.profile?.fullName || m.user.email;
                 return (
                   <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px', borderBottom: '1px solid var(--border)' }}>
                     <Avatar src={m.user.profile?.avatarUrl} name={name} size={40} />
                     <div style={{ flex: 1, minWidth: 0 }}>
                       <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                         {name}
                         {isMe && <span className="badge badge-blue" style={{ fontSize: 10 }}>You</span>}
                         {m.isLeader && <span className="badge badge-green" style={{ fontSize: 10 }}>Leader</span>}
                       </div>
                       {m.user.profile?.graduationYear && <div style={{ fontSize: 11, color: 'var(--muted)' }}>Class of {m.user.profile.graduationYear}</div>}
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
               })}
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

      {/* CSS for hover effects and animations */}
      <style jsx>{`
        @keyframes pop-in {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        /* Show message actions on hover (desktop) */
        @media (hover: hover) {
          div:hover > .msg-actions {
            display: flex !important;
          }
        }
        /* On mobile, long-press to show actions */
        @media (hover: none) {
          .msg-actions {
            display: flex !important;
            opacity: 0;
            pointer-events: none;
          }
        }
        /* Hide scrollbar for activity bar */
        ::-webkit-scrollbar { height: 0; width: 0; }
      `}</style>
    </div>
  );
}
