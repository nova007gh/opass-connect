'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { apiGet, apiPost, apiUpload } from '../../../lib/api';
import Avatar from '../../../components/Avatar';
import EmojiPicker from '../../../components/EmojiPicker';

function isEmojiOnly(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.length > 20) return false;
  const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Component}|\u200d|\ufe0f)+$/u;
  try { return emojiRegex.test(trimmed); } catch { return false; }
}
function isSticker(text: string): boolean { return text?.startsWith('🎴:') || false; }
function stickerContent(text: string): string { return text?.replace(/^🎴:/, '') || ''; }

interface Meeting { id: string; title: string; description?: string | null; mode: string; status: string; startsAt: string; capacity: number; roomKey: string; yearGroup?: { year: number; name: string } | null; }
interface ChatRoom { id: string; name: string; isAssemblyHall: boolean; imageUrl?: string | null; yearGroup?: { year: number; name: string } | null; _count: { messages: number }; }
interface Message { id: string; body: string; createdAt: string; user: { profile: { fullName: string; avatarUrl?: string | null } | null }; }

const modeBadge: Record<string, string> = { INTERACTIVE: 'badge-blue', WEBINAR: 'badge-amber', BROADCAST: 'badge-dark' };

export default function ChatroomPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomSearch, setRoomSearch] = useState('');
  const [uploadingRoomId, setUploadingRoomId] = useState<string | null>(null);
  const roomFileRef = useRef<HTMLInputElement>(null);
  const [roomUploadTarget, setRoomUploadTarget] = useState<string | null>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);

  // Meeting creation state
  const [showCreateMeeting, setShowCreateMeeting] = useState(false);
  const [meetingForm, setMeetingForm] = useState({ title: '', description: '', mode: 'INTERACTIVE', startsAt: '', capacity: '500' });
  const [creatingMeeting, setCreatingMeeting] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<{ url: string; token: string; mode: string } | null>(null);
  const [joining, setJoining] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [view, setView] = useState<'rooms' | 'meetings'>('rooms');

  useEffect(() => {
    Promise.all([
      apiGet<ChatRoom[]>('/chat/rooms').then(setRooms).catch(() => {}),
      apiGet<Meeting[]>('/meetings').then(setMeetings).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const set = (k: string, v: string) => setMeetingForm(f => ({ ...f, [k]: v }));

  const createMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingMeeting(true);
    setError('');
    try {
      const m = await apiPost<Meeting>('/meetings', { title: meetingForm.title, description: meetingForm.description || undefined, mode: meetingForm.mode, startsAt: new Date(meetingForm.startsAt).toISOString(), capacity: parseInt(meetingForm.capacity, 10) });
      setMeetings(prev => [m, ...prev]);
      setShowCreateMeeting(false);
      setMeetingForm({ title: '', description: '', mode: 'INTERACTIVE', startsAt: '', capacity: '500' });
    } catch (err: any) { setError(err.message || 'Failed to create meeting'); } finally { setCreatingMeeting(false); }
  };

  const joinMeeting = async (id: string) => {
    setJoining(id);
    setError('');
    try {
      const data = await apiPost<{ url: string; token: string; mode: string }>(`/meetings/${id}/token`);
      setTokenInfo(data);
    } catch (err: any) { setError(err.message || 'Failed to join meeting.'); } finally { setJoining(null); }
  };

  const openRoom = async (room: ChatRoom) => {
    setActiveRoom(room);
    setChatLoading(true);
    try { const msgs = await apiGet<Message[]>(`/chat/rooms/${room.id}/messages`); setMessages(msgs.reverse()); } catch { setMessages([]); } finally { setChatLoading(false); }
  };

  // Poll for new messages every 3 seconds
  useEffect(() => {
    if (!activeRoom) return;
    const interval = setInterval(async () => {
      try {
        const msgs = await apiGet<Message[]>(`/chat/rooms/${activeRoom.id}/messages`);
        const reversed = msgs.reverse();
        setMessages(prev => prev.length !== reversed.length ? reversed : prev);
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [activeRoom]);

  const sendMessage = async () => {
    if (!chatInput.trim() || !activeRoom) return;
    const text = chatInput.trim();
    setChatInput('');
    setSending(true);
    try {
      const msg = await apiPost<Message>(`/chat/rooms/${activeRoom.id}/messages`, { body: text });
      setMessages(prev => [...prev, msg]);
    } catch (err: any) { setError(err.message); setChatInput(text); } finally { setSending(false); }
  };

  const createRoom = async () => {
    if (!roomName.trim()) return;
    setSending(true);
    try { const room = await apiPost<ChatRoom>('/chat/rooms', { name: roomName, isAssemblyHall: false }); setRooms(prev => [...prev, room]); setRoomName(''); setShowCreateRoom(false); } catch (err: any) { setError(err.message); } finally { setSending(false); }
  };

  const pickRoomImage = (id: string) => {
    setRoomUploadTarget(id);
    roomFileRef.current?.click();
  };

  const onRoomImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !roomUploadTarget) return;
    if (!/image\/(jpeg|png|webp|gif)/.test(file.type)) { setError('Please choose a valid image.'); return; }
    if (file.size > 5_000_000) { setError('Image must be under 5MB.'); return; }
    setError('');
    setUploadingRoomId(roomUploadTarget);
    try {
      const { imageUrl } = await apiUpload<{ imageUrl: string }>(`/chat/rooms/${roomUploadTarget}/image`, file);
      setRooms(prev => prev.map(r => r.id === roomUploadTarget ? { ...r, imageUrl } : r));
    } catch (err: any) { setError(err.message || 'Upload failed'); }
    finally { setUploadingRoomId(null); setRoomUploadTarget(null); if (roomFileRef.current) roomFileRef.current.value = ''; }
  };

  const filteredRooms = roomSearch.trim()
    ? rooms.filter(r => r.name.toLowerCase().includes(roomSearch.toLowerCase()))
    : rooms;

  // ===== Active room chat view =====
  if (activeRoom) {
    return (
      <div className="app-screen" style={{ background: 'var(--bg)' }}>
        <div className="screen-header" style={{ position: 'sticky', top: 0 }}>
          <button onClick={() => { setActiveRoom(null); setMessages([]); }} className="back">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1>{activeRoom.name}</h1>
        </div>
        <div className="app-scroll" style={{ flex: 1, padding: '0 16px 16px' }}>
          {chatLoading ? <div className="loading-center"><span className="spinner" /></div> : messages.length === 0 ? (
            <div className="empty-state"><p>No messages yet. Start the conversation!</p></div>
          ) : messages.map(m => (
            <div key={m.id} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <Avatar src={m.user?.profile?.avatarUrl} name={m.user?.profile?.fullName} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 700 }}>{m.user?.profile?.fullName || 'Alumnus'}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{new Date(m.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                </div>
                {isSticker(m.body) ? (
                  <div style={{ fontSize: 64, lineHeight: 1.1 }}>{stickerContent(m.body)}</div>
                ) : isEmojiOnly(m.body) ? (
                  <div style={{ fontSize: 40, lineHeight: 1.2 }}>{m.body}</div>
                ) : (
                  <div style={{ padding: '10px 14px', borderRadius: '4px 14px 14px 14px', background: 'var(--white)', border: '1px solid var(--border)', fontSize: 14, lineHeight: 1.5, color: 'var(--black)', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{m.body}</div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEnd} />
        </div>
        <div style={{ position: 'relative', padding: '12px 16px calc(20px + env(safe-area-inset-bottom, 0px))', borderTop: '1px solid var(--border)', background: 'var(--white)', display: 'flex', gap: 10, alignItems: 'center' }}>
          {showEmojiPicker && (
            <EmojiPicker
              onPick={(emoji) => setChatInput(prev => prev + emoji)}
              onStickerPick={(sticker) => {
                setChatInput('');
                setShowEmojiPicker(false);
                setSending(true);
                apiPost(`/chat/${activeRoom?.id}/messages`, { body: `🎴:${sticker}` }).then(async () => {
                  try { const msgs = await apiGet<Message[]>(`/chat/rooms/${activeRoom?.id}/messages`); setMessages(msgs.reverse()); } catch {}
                  setSending(false);
                }).catch(() => setSending(false));
              }}
              onClose={() => setShowEmojiPicker(false)}
            />
          )}
          <button onClick={() => setShowEmojiPicker(prev => !prev)} className={`emoji-btn-toggle ${showEmojiPicker ? 'active' : ''}`} title="Emojis & stickers" disabled={sending}>😊</button>
          <input className="input" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type a message..." onKeyDown={e => e.key === 'Enter' && sendMessage()} disabled={sending} style={{ flex: 1, marginBottom: 0 }} />
          <button className="btn" onClick={sendMessage} disabled={sending || !chatInput.trim()} style={{ minHeight: 48, padding: '0 20px' }}>
            {sending ? <span className="spinner" /> : <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 20, height: 20 }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>}
          </button>
        </div>
      </div>
    );
  }

  // ===== Main chatroom listing view =====
  return (
    <div className="app-screen" style={{ background: 'var(--bg)' }}>
      <div className="screen-header">
        <h1>Chatroom</h1>
      </div>

      <div className="app-scroll">
        <div className="app-pad">
          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

          {/* Toggle between Rooms and Meetings */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              onClick={() => setView('rooms')}
              className="btn btn-sm"
              style={{
                flex: 1,
                background: view === 'rooms' ? 'var(--blue-bright)' : 'var(--bg)',
                color: view === 'rooms' ? 'white' : 'var(--muted)',
                border: view === 'rooms' ? 'none' : '1px solid var(--border)',
              }}
            >
              💬 Chat Rooms
            </button>
            <button
              onClick={() => setView('meetings')}
              className="btn btn-sm"
              style={{
                flex: 1,
                background: view === 'meetings' ? 'var(--blue-bright)' : 'var(--bg)',
                color: view === 'meetings' ? 'white' : 'var(--muted)',
                border: view === 'meetings' ? 'none' : '1px solid var(--border)',
              }}
            >
              📅 Meetings
            </button>
          </div>

          {view === 'rooms' ? (
            <>
              {/* Search chat rooms */}
              <form className="home-search" style={{ marginBottom: 12 }} onSubmit={(e) => e.preventDefault()}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  placeholder="Search chat rooms..."
                  style={{ background: 'transparent' }}
                />
              </form>

              {/* Create room button */}
              <button className="btn btn-block mb-16" onClick={() => setShowCreateRoom(!showCreateRoom)}>
                + Create Chat Room
              </button>

              {showCreateRoom && (
                <div className="card mb-16">
                  <div className="input-wrap" style={{ marginBottom: 10 }}>
                    <input type="text" value={roomName} onChange={e => setRoomName(e.target.value)} placeholder="Room name..." />
                  </div>
                  <button className="btn btn-block btn-sm" onClick={createRoom} disabled={sending || !roomName.trim()}>
                    {sending ? <span className="spinner" /> : 'Create'}
                  </button>
                </div>
              )}

              {/* Room list */}
              {loading ? <div className="loading-center"><span className="spinner" /></div> : filteredRooms.length === 0 ? (
                <div className="empty-state">
                  <h3>No chat rooms found</h3>
                  <p>{roomSearch ? 'Try a different search.' : 'Create one above.'}</p>
                </div>
              ) : (
                <div className="feed">
                  {filteredRooms.map(r => (
                    <div className="feed-card" key={r.id} onClick={() => openRoom(r)} style={{ cursor: 'pointer' }}>
                      <div className="feed-card-header">
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <div style={{ width: 52, height: 52, borderRadius: '50%', background: r.isAssemblyHall ? 'var(--blue-dark)' : 'var(--blue)', color: 'white', fontSize: 20, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {r.imageUrl ? <img src={r.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 24, height: 24 }}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                            )}
                          </div>
                          {!r.isAssemblyHall && (
                            <button onClick={(e) => { e.stopPropagation(); pickRoomImage(r.id); }} style={{
                              position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: '50%',
                              background: 'var(--blue-bright)', border: '2px solid var(--white)', color: 'white',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 10, zIndex: 2,
                            }} title="Upload room photo">
                              {uploadingRoomId === r.id ? '...' : '+'}
                            </button>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="name">{r.name}</div>
                          <div className="time">{r._count?.messages ?? 0} messages</div>
                        </div>
                        {r.isAssemblyHall && <span className="badge badge-dark">Connect</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Meetings view */}
              <button className="btn btn-block mb-16" onClick={() => setShowCreateMeeting(!showCreateMeeting)}>
                + Schedule Meeting
              </button>

              {showCreateMeeting && (
                <div className="card mb-16">
                  <form onSubmit={createMeeting}>
                    <div className="form-group">
                      <label>Title *</label>
                      <div className="input-wrap"><input type="text" value={meetingForm.title} onChange={e => set('title', e.target.value)} required placeholder="e.g. 2006 Reunion" /></div>
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea className="textarea" value={meetingForm.description} onChange={e => set('description', e.target.value)} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14 }} />
                    </div>
                    <div className="form-group">
                      <label>Mode</label>
                      <select className="select" value={meetingForm.mode} onChange={e => set('mode', e.target.value)} style={{ width: '100%' }}>
                        <option value="INTERACTIVE">Interactive (up to ~500)</option>
                        <option value="WEBINAR">Webinar</option>
                        <option value="BROADCAST">Broadcast</option>
                      </select>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Start *</label>
                        <div className="input-wrap"><input type="datetime-local" value={meetingForm.startsAt} onChange={e => set('startsAt', e.target.value)} required /></div>
                      </div>
                      <div className="form-group">
                        <label>Capacity</label>
                        <div className="input-wrap"><input type="number" value={meetingForm.capacity} onChange={e => set('capacity', e.target.value)} /></div>
                      </div>
                    </div>
                    <button className="btn btn-block" type="submit" disabled={creatingMeeting}>{creatingMeeting ? <span className="spinner" /> : 'Create'}</button>
                  </form>
                </div>
              )}

              {tokenInfo && (
                <div className="card mb-16" style={{ borderColor: 'var(--blue)', borderWidth: 2 }}>
                  <h3>Meeting token</h3>
                  <p>Mode: <span className={`badge ${modeBadge[tokenInfo.mode]}`}>{tokenInfo.mode}</span></p>
                  <div className="alert alert-info">URL: {tokenInfo.url}<br />Token: {tokenInfo.token?.slice(0, 40) ?? '—'}...</div>
                </div>
              )}

              {loading ? <div className="loading-center"><span className="spinner" /></div> : meetings.length === 0 ? (
                <div className="empty-state"><h3>No meetings</h3><p>Schedule one above.</p></div>
              ) : (
                <div className="feed">
                  {meetings.map(m => (
                    <div className="feed-card" key={m.id}>
                      <div className="feed-card-header">
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: m.status === 'LIVE' ? 'var(--red)' : 'var(--blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg fill="none" stroke={m.status === 'LIVE' ? 'white' : 'var(--blue)'} viewBox="0 0 24 24" strokeWidth={2} style={{ width: 24, height: 24 }}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="name">{m.title}</div>
                          <div className="time">{new Date(m.startsAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                        </div>
                        <span className={`badge ${modeBadge[m.mode] || 'badge-gray'}`}>{m.mode}</span>
                      </div>
                      {m.description && <div className="feed-card-body"><p>{m.description}</p></div>}
                      <div className="feed-card-actions">
                        <button onClick={() => joinMeeting(m.id)} disabled={joining === m.id} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, color: 'var(--blue)', fontSize: 14, fontWeight: 600, background: 'none', border: 0, cursor: 'pointer' }}>
                          {joining === m.id ? <span className="spinner" /> : '🔗 Join'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <input ref={roomFileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onRoomImageChange} style={{ display: 'none' }} />
        </div>
      </div>
    </div>
  );
}
