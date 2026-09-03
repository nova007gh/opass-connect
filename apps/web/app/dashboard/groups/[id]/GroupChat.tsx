'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, apiPatch, apiUpload } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth';
import Avatar from '../../../../components/Avatar';
import EmojiPicker from '../../../../components/EmojiPicker';
import CallModal from '../../../../components/CallModal';
import { useCall } from '../../../../components/CallProvider';
import { playSchoolBell, playPop, playGunshot, playWhistle, playDrumRoll, playTada, playShush, primeAudio } from '../../../../lib/sound';

interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  body: string;
  audioUrl?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  reactions?: Record<string, string[]> | null;
  replyToId?: string | null;
  editedAt?: string | null;
  createdAt: string;
  replyTo?: { id: string; body: string; userId: string; audioUrl?: string | null; imageUrl?: string | null; videoUrl?: string | null; user: { profile?: { fullName?: string | null } | null } } | null;
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
  const [memberCount, setMemberCount] = useState(0);
  const [activeCall, setActiveCall] = useState<{ type: 'audio' | 'video'; peerId: string; peerName: string; peerAvatar?: string | null } | null>(null);
  const [callError, setCallError] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [reactingTo, setReactingTo] = useState<string | null>(null);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
  const [showActivityBar, setShowActivityBar] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [activeGroupCall, setActiveGroupCall] = useState<{ type: 'audio' | 'video' } | null>(null);
  const { startCall: startCallCtx, activeCall: activeCallCtx, endCall: endCallCtx } = useCall();

  const messagesEnd = useRef<HTMLDivElement>(null);
  const messagesContainer = useRef<HTMLDivElement>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPollRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const lastTypingRef = useRef<number>(0);

  // Load or create the chat room
  const loadRoom = useCallback(async () => {
    try {
      const r = await apiGet<ChatRoom>(`/year-groups/${groupId}/chat-room`);
      setRoom(r);
      // Fetch member count in parallel
      apiGet<{ _count?: { memberships: number } } & Record<string, any>>(`/year-groups/${groupId}`)
        .then(yg => setMemberCount(yg?._count?.memberships ?? 0))
        .catch(() => {});
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

  // Poll for typing indicators every 2 seconds
  useEffect(() => {
    if (!room) return;
    const interval = setInterval(async () => {
      try {
        const { users } = await apiGet<{ users: string[] }>(`/chat/rooms/${room.id}/typing`);
        // Resolve user names from members or messages
        const names: string[] = [];
        for (const uid of users) {
          const m = members.find(mm => mm.userId === uid);
          const msg = messages.find(mm => mm.userId === uid);
          const name = m?.user?.profile?.fullName || msg?.user?.profile?.fullName || 'Someone';
          if (!names.includes(name)) names.push(name);
        }
        setTypingUsers(names);
      } catch { setTypingUsers([]); }
    }, 2000);
    return () => clearInterval(interval);
  }, [room, members, messages]);

  // Poll for active group calls every 5 seconds
  useEffect(() => {
    if (!room || activeCallCtx) return;
    const checkActiveCall = async () => {
      try {
        const res = await apiGet<{ active: boolean; callMsg: { type: 'audio' | 'video' } | null }>(`/chat/rooms/${room.id}/call/active`);
        setActiveGroupCall(res.active && res.callMsg ? { type: res.callMsg.type } : null);
      } catch { setActiveGroupCall(null); }
    };
    checkActiveCall();
    const interval = setInterval(checkActiveCall, 5000);
    return () => clearInterval(interval);
  }, [room, activeCallCtx]);

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

  const saveEdit = async () => {
    if (!editingMsg || !room || !input.trim()) return;
    setSending(true);
    setError('');
    try {
      const updated = await apiPatch<ChatMessage>(`/chat/rooms/${room.id}/messages/${editingMsg.id}`, { body: input.trim() });
      setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      setEditingMsg(null);
      setInput('');
    } catch (err: any) {
      setError(err.message || 'Failed to edit message');
    } finally {
      setSending(false);
    }
  };

  const startEdit = (m: ChatMessage) => {
    setEditingMsg(m);
    setInput(m.body);
    setReplyTo(null);
  };

  const cancelEdit = () => {
    setEditingMsg(null);
    setInput('');
  };

  // Check if a message can be edited (own message, within 10 minutes, text only)
  const canEdit = (m: ChatMessage) => {
    if (m.userId !== user?.id) return false;
    if (m.audioUrl || m.imageUrl || m.videoUrl) return false;
    if (isSticker(m.body) || isActivity(m.body)) return false;
    const ageMs = Date.now() - new Date(m.createdAt).getTime();
    return ageMs <= 10 * 60 * 1000;
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

  // ===== Voice note recording =====
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (audioChunksRef.current.length === 0) return;
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (blob.size < 1000) return; // too small, probably accidental
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        setUploadingMedia(true);
        try {
          const { audioUrl } = await apiUpload<{ audioUrl: string }>(`/chat/rooms/${room!.id}/voice`, file);
          const msg = await apiPost<ChatMessage>(`/chat/rooms/${room!.id}/messages`, { body: '', audioUrl });
          seenIdsRef.current.add(msg.id);
          setMessages(prev => [...prev, msg]);
          if (messagesContainer.current) messagesContainer.current.scrollTop = messagesContainer.current.scrollHeight;
        } catch (err: any) {
          setError(err.message || 'Failed to upload voice note');
        } finally {
          setUploadingMedia(false);
        }
      };
      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
    } catch (err: any) {
      setError('Microphone access denied. Please allow microphone access to record voice notes.');
    }
  };

  const stopRecording = (cancel: boolean = false) => {
    const recorder = mediaRecorderRef.current;
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    if (recorder && recorder.state !== 'inactive') {
      if (cancel) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.stream.getTracks().forEach(t => t.stop());
      } else {
        recorder.stop();
      }
    }
    setIsRecording(false);
    setRecordingDuration(0);
  };

  // ===== Image upload =====
  const onImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !room) return;
    if (file.size > 5_000_000) { setError('Image must be under 5MB'); return; }
    setUploadingMedia(true);
    setError('');
    try {
      const { imageUrl } = await apiUpload<{ imageUrl: string }>(`/chat/rooms/${room.id}/upload-image`, file);
      const msg = await apiPost<ChatMessage>(`/chat/rooms/${room.id}/messages`, { body: '', imageUrl });
      seenIdsRef.current.add(msg.id);
      setMessages(prev => [...prev, msg]);
      if (messagesContainer.current) messagesContainer.current.scrollTop = messagesContainer.current.scrollHeight;
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
    } finally {
      setUploadingMedia(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  // ===== Video upload =====
  const onVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !room) return;
    if (file.size > 50_000_000) { setError('Video must be under 50MB'); return; }
    setUploadingMedia(true);
    setError('');
    try {
      const { videoUrl } = await apiUpload<{ videoUrl: string }>(`/chat/rooms/${room.id}/video`, file);
      const msg = await apiPost<ChatMessage>(`/chat/rooms/${room.id}/messages`, { body: '', videoUrl });
      seenIdsRef.current.add(msg.id);
      setMessages(prev => [...prev, msg]);
      if (messagesContainer.current) messagesContainer.current.scrollTop = messagesContainer.current.scrollHeight;
    } catch (err: any) {
      setError(err.message || 'Failed to upload video');
    } finally {
      setUploadingMedia(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  // ===== Group call =====
  const startGroupCall = async (type: 'audio' | 'video') => {
    if (!room) return;
    try {
      const res = await apiPost<{ url: string; token: string; roomKey: string; type: string }>(`/chat/rooms/${room.id}/call`, { type });
      setActiveGroupCall({ type });
      startCallCtx({ callType: type, peerName: groupName, peerAvatarUrl: null, isGroupCall: true, url: res.url, token: res.token, roomId: room.id });
    } catch (err: any) {
      setError(err.message || 'Failed to start call');
    }
  };

  const joinGroupCall = async () => {
    if (!room) return;
    try {
      const res = await apiPost<{ url: string; token: string; roomKey: string }>(`/chat/rooms/${room.id}/call/join`, {});
      startCallCtx({ callType: activeGroupCall?.type || 'audio', peerName: groupName, peerAvatarUrl: null, isGroupCall: true, url: res.url, token: res.token, roomId: room.id });
    } catch (err: any) {
      setError(err.message || 'Failed to join call');
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
      setMemberCount(list.length);
    } catch { setMembers([]); } finally { setMembersLoading(false); }
  };

  const startDm = (userId: string) => { if (userId !== user?.id) router.push(`/dashboard/chat/${userId}`); };

  const startCall = async (type: 'audio' | 'video', member: Member) => {
    if (member.userId === user?.id) return;
    setCallError('');
    try {
      const res = await apiPost<{ url: string; token: string }>(`/dm/${member.userId}/call`, { type });
      setActiveCall({ type, peerId: member.userId, peerName: member.user.profile?.fullName || member.user.email, peerAvatar: member.user.profile?.avatarUrl });
      startCallCtx({ callType: type, peerName: member.user.profile?.fullName || member.user.email, peerAvatarUrl: member.user.profile?.avatarUrl || null, isGroupCall: false, url: res.url, token: res.token, roomId: member.userId });
    } catch (err: any) {
      setCallError(err.message || 'Failed to start call');
    }
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
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 220px)', minHeight: 360, paddingBottom: 'calc(var(--safe-bottom, 0px) + 8px)' }}>
      {error && <div className="alert alert-error" style={{ marginBottom: 8, fontSize: 13, padding: '6px 12px' }}>{error}<button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 0, cursor: 'pointer' }}>×</button></div>}
      {callError && <div className="alert alert-error" style={{ marginBottom: 8, fontSize: 13 }}>{callError}</div>}

      {/* Active call banner — join button */}
      {activeGroupCall && !activeCallCtx && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: 'white', borderRadius: 0 }}>
          <span style={{ fontSize: 20 }}>{activeGroupCall.type === 'video' ? '🎥' : '📞'}</span>
          <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>
            A group {activeGroupCall.type} call is live
          </div>
          <button onClick={joinGroupCall} style={{ background: 'white', color: '#059669', border: 0, borderRadius: 999, padding: '6px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            Join
          </button>
        </div>
      )}

      {/* Chat header */}
      <div style={{ padding: '10px 14px', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)', background: 'var(--white)' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--blue)', color: 'white', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
          {groupYear.toString().slice(-2)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{groupName}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
            {memberCount || '...'} members
          </div>
        </div>
        <button onClick={() => startGroupCall('audio')} title="Group voice call" style={{ width: 36, height: 36, borderRadius: '50%', border: 0, cursor: 'pointer', background: 'var(--blue-50)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} style={{ width: 20, height: 20 }}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h1.5a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106a2.25 2.25 0 00-2.239.68l-.665.766c-.283.326-.756.409-1.079.226a11.978 11.978 0 01-4.994-4.994c-.183-.323-.1-.796.226-1.079l.766-.665a2.25 2.25 0 00.68-2.239L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
        </button>
        <button onClick={() => startGroupCall('video')} title="Group video call" style={{ width: 36, height: 36, borderRadius: '50%', border: 0, cursor: 'pointer', background: 'var(--blue-50)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} style={{ width: 20, height: 20 }}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
        </button>
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
                <span className="chat-date-sep" style={{ background: 'rgba(0,0,0,0.08)', color: 'var(--muted)', fontSize: 11, fontWeight: 600, padding: '3px 12px', borderRadius: 8, backdropFilter: 'blur(4px)' }}>
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
                  <div key={m.id}
                    style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: isLastInGroup ? 8 : 1, gap: 6, alignItems: 'flex-end', position: 'relative', touchAction: 'pan-y' }}
                    onTouchStart={(e) => {
                      const touch = e.touches[0];
                      (e.currentTarget as HTMLElement).dataset.swipeStartX = String(touch.clientX);
                      (e.currentTarget as HTMLElement).dataset.swipeStartY = String(touch.clientY);
                      (e.currentTarget as HTMLElement).dataset.swiped = '0';
                    }}
                    onTouchMove={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      const startX = parseFloat(el.dataset.swipeStartX || '0');
                      const startY = parseFloat(el.dataset.swipeStartY || '0');
                      const dx = e.touches[0].clientX - startX;
                      const dy = e.touches[0].clientY - startY;
                      // Only swipe if horizontal movement dominates and is to the right
                      if (Math.abs(dx) > Math.abs(dy) * 1.5 && dx > 20 && el.dataset.swiped === '0') {
                        el.dataset.swiped = '1';
                        setReplyTo(m);
                        // Haptic feedback
                        if (navigator.vibrate) navigator.vibrate(10);
                      }
                    }}
                  >
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
                        <div className={isMe ? '' : 'chat-reply-quote'} style={{
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
                            {m.replyTo.audioUrl ? '🎤 Voice note' : m.replyTo.imageUrl ? '📷 Photo' : m.replyTo.videoUrl ? '🎥 Video' : isSticker(m.replyTo.body) ? '🎴 Sticker' : isActivity(m.replyTo.body) ? '🎯 Activity' : m.replyTo.body}
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
                            <div style={{ fontSize: 14, fontWeight: 600, color: isMe ? 'white' : 'var(--black)' }}>{activity.label}</div>
                          </div>
                          <span style={{ fontSize: 10, color: isMe ? 'rgba(255,255,255,0.6)' : 'var(--muted)', marginLeft: 'auto' }}>{timeLabel(m.createdAt)}</span>
                        </div>
                      ) : (
                        /* Regular message bubble — WhatsApp style with tail */
                        <div style={{
                          background: isMe ? 'var(--blue)' : 'var(--white)',
                          color: isMe ? 'white' : 'var(--black)',
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
                          {/* Voice note */}
                          {m.audioUrl && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                              <audio controls src={m.audioUrl} style={{ height: 36, maxWidth: 220 }} />
                            </div>
                          )}
                          {/* Image */}
                          {m.imageUrl && (
                            <img src={m.imageUrl} alt="" style={{ maxWidth: 240, maxHeight: 240, borderRadius: 8, display: 'block', margin: '2px 0' }} />
                          )}
                          {/* Video */}
                          {m.videoUrl && (
                            <video controls src={m.videoUrl} style={{ maxWidth: 240, maxHeight: 240, borderRadius: 8, display: 'block', margin: '2px 0' }} />
                          )}
                          {/* Text body (skip if it's a sticker or emoji-only) */}
                          {isSticker(m.body) ? stickerContent(m.body) : isEmojiOnly(m.body) ? m.body : m.body}
                          {/* Timestamp — WhatsApp style, inline at bottom right */}
                          <span style={{ fontSize: 9, color: isMe ? 'rgba(255,255,255,0.6)' : 'var(--muted)', marginLeft: 8, float: 'right', marginTop: 4, userSelect: 'none' }}>
                            {m.editedAt && <span style={{ fontStyle: 'italic', marginRight: 3 }}>edited</span>}
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
                        {canEdit(m) && (
                          <button
                            onClick={() => startEdit(m)}
                            style={{ background: 'none', border: 0, cursor: 'pointer', padding: '2px 4px', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}
                            title="Edit"
                          >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                        )}
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
      {replyTo && !editingMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--blue-50)', borderTop: '1px solid var(--border)', borderRadius: 0 }}>
          <svg fill="none" stroke="var(--blue)" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18, flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)' }}>{replyTo.user?.profile?.fullName || 'A member'}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {replyTo.audioUrl ? '🎤 Voice note' : replyTo.imageUrl ? '📷 Photo' : replyTo.videoUrl ? '🎥 Video' : isSticker(replyTo.body) ? '🎴 Sticker' : isActivity(replyTo.body) ? '🎯 Activity' : replyTo.body}
            </div>
          </div>
          <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--muted)', fontSize: 18 }}>×</button>
        </div>
      )}
      {/* Edit preview bar */}
      {editingMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--blue-50)', borderTop: '1px solid var(--border)', borderRadius: 0 }}>
          <svg fill="none" stroke="var(--blue)" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18, flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)' }}>Editing message</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{editingMsg.body}</div>
          </div>
          <button onClick={cancelEdit} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--muted)', fontSize: 18 }}>×</button>
        </div>
      )}

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div style={{ padding: '4px 14px', fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--white)', borderTop: '1px solid var(--border)' }}>
          <span style={{ display: 'inline-flex', gap: 3 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--muted)', animation: 'typing-bounce 1.4s infinite' }} />
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--muted)', animation: 'typing-bounce 1.4s infinite 0.2s' }} />
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--muted)', animation: 'typing-bounce 1.4s infinite 0.4s' }} />
          </span>
          {typingUsers.length === 1 ? `${typingUsers[0]} is typing...` : `${typingUsers.length} people are typing...`}
        </div>
      )}

      {/* Activity panel — scrollable grid of fun buttons */}
      {showActivityBar && (
        <div style={{
          maxHeight: 200, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
          padding: '10px 10px', background: 'var(--white)', borderTop: '1px solid var(--border)',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
        }}>
          {ACTIVITIES.map(a => (
            <button
              key={a.type}
              onClick={() => sendActivity(a)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12,
                padding: '10px 6px', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--blue-50)'; e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <span style={{ fontSize: 28 }}>{a.emoji}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--black)', whiteSpace: 'nowrap', textAlign: 'center' }}>{a.label}</span>
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
        ) : isRecording ? (
          /* Recording UI */
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', borderRadius: 22, padding: '8px 16px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--red)', animation: 'pulse 1s infinite' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--red)' }}>Recording... {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</span>
            </div>
            <button onClick={() => stopRecording(true)} title="Cancel" style={{ width: 36, height: 36, borderRadius: '50%', border: 0, cursor: 'pointer', background: 'var(--muted)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <button onClick={() => stopRecording(false)} title="Send voice note" style={{ width: 36, height: 36, borderRadius: '50%', border: 0, cursor: 'pointer', background: 'var(--blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
            </button>
          </div>
        ) : uploadingMedia ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 0' }}>
            <span className="spinner" style={{ width: 18, height: 18 }} />
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Uploading...</span>
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
            {/* Image upload button */}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              title="Send photo"
              style={{
                width: 36, height: 36, borderRadius: '50%', border: 0, cursor: 'pointer',
                background: 'var(--bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              <svg fill="none" stroke="var(--muted)" viewBox="0 0 24 24" strokeWidth={1.8} style={{ width: 20, height: 20 }}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
            </button>
            {/* Video upload button */}
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              title="Send video"
              style={{
                width: 36, height: 36, borderRadius: '50%', border: 0, cursor: 'pointer',
                background: 'var(--bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              <svg fill="none" stroke="var(--muted)" viewBox="0 0 24 24" strokeWidth={1.8} style={{ width: 20, height: 20 }}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
            </button>
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
              onChange={e => {
                setInput(e.target.value);
                if (room && Date.now() - lastTypingRef.current > 2000) {
                  lastTypingRef.current = Date.now();
                  apiPost(`/chat/rooms/${room.id}/typing`, {}).catch(() => {});
                }
              }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); editingMsg ? saveEdit() : send(); } }}
              placeholder={editingMsg ? 'Edit message...' : "Type a message..."}
              style={{
                flex: 1, border: '1px solid var(--border)', borderRadius: 22,
                padding: '8px 16px', fontSize: 14, outline: 0, background: 'var(--bg)',
              }}
              maxLength={4000}
            />
            {/* Voice note button (when input is empty) or Send button */}
            {input.trim() ? (
              <button
                onClick={() => editingMsg ? saveEdit() : send()}
                disabled={sending}
                style={{
                  width: 36, height: 36, borderRadius: '50%', padding: 0, flexShrink: 0,
                  border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--blue)', color: 'white', transition: 'all 0.15s',
                }}
              >
                {sending ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                )}
              </button>
            ) : (
              <button
                onClick={startRecording}
                title="Record voice note"
                style={{
                  width: 36, height: 36, borderRadius: '50%', padding: 0, flexShrink: 0,
                  border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--blue)', color: 'white',
                }}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
              </button>
            )}
          </div>
        )}
      </div>
      <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onImageSelect} style={{ display: 'none' }} />
      <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/ogg" onChange={onVideoSelect} style={{ display: 'none' }} />

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

      {/* Call modal (1-on-1 from members list) */}
      {activeCall && activeCallCtx && !activeCallCtx.isGroupCall && (
        <CallModal
          callType={activeCall.type}
          peerName={activeCall.peerName}
          peerAvatarUrl={activeCall.peerAvatar}
          onClose={() => { setActiveCall(null); endCallCtx(); }}
        />
      )}

      {/* Group call modal — uses CallProvider's room */}
      {activeCallCtx && activeCallCtx.isGroupCall && (
        <CallModal
          callType={activeCallCtx.callType}
          peerName={activeCallCtx.peerName}
          peerAvatarUrl={activeCallCtx.peerAvatarUrl}
          onClose={() => endCallCtx()}
          isGroupCall
        />
      )}

      {/* CSS for hover effects and animations */}
      <style jsx>{`
        @keyframes pop-in {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
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
