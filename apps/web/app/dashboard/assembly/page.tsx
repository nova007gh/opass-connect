'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '../../../lib/api';

interface Meeting { id: string; title: string; description?: string | null; mode: string; status: string; startsAt: string; capacity: number; roomKey: string; yearGroup?: { year: number; name: string } | null; }
interface ChatRoom { id: string; name: string; isAssemblyHall: boolean; yearGroup?: { year: number; name: string } | null; _count: { messages: number }; }
interface Message { id: string; body: string; createdAt: string; user: { profile: { fullName: string; avatarUrl?: string | null } | null }; }

const modeBadge: Record<string, string> = { INTERACTIVE: 'badge-blue', WEBINAR: 'badge-amber', BROADCAST: 'badge-dark' };

export default function AssemblyPage() {
  const [tab, setTab] = useState<'meetings' | 'chat'>('meetings');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', mode: 'INTERACTIVE', startsAt: '', capacity: '500' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [tokenInfo, setTokenInfo] = useState<{ url: string; token: string; mode: string } | null>(null);
  const [joining, setJoining] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [roomName, setRoomName] = useState('');
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      apiGet<Meeting[]>('/meetings').then(setMeetings).catch(() => {}),
      apiGet<ChatRoom[]>('/chat/rooms').then(setRooms).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const m = await apiPost<Meeting>('/meetings', { title: form.title, description: form.description || undefined, mode: form.mode, startsAt: new Date(form.startsAt).toISOString(), capacity: parseInt(form.capacity, 10) });
      setMeetings(prev => [m, ...prev]);
      setShowCreate(false);
      setForm({ title: '', description: '', mode: 'INTERACTIVE', startsAt: '', capacity: '500' });
    } catch (err: any) { setError(err.message || 'Failed to create meeting'); } finally { setCreating(false); }
  };

  const join = async (id: string) => {
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

  const sendMessage = async () => {
    if (!chatInput.trim() || !activeRoom) return;
    const text = chatInput.trim();
    setChatInput('');
    setSending(true);
    try { const msg = await apiPost<Message>(`/chat/rooms/${activeRoom.id}/messages`, { body: text }); setMessages(prev => [...prev, msg]); } catch (err: any) { setError(err.message); } finally { setSending(false); }
  };

  const createRoom = async () => {
    if (!roomName.trim()) return;
    setSending(true);
    try { const room = await apiPost<ChatRoom>('/chat/rooms', { name: roomName, isAssemblyHall: false }); setRooms(prev => [...prev, room]); setRoomName(''); setShowCreateRoom(false); } catch (err: any) { setError(err.message); } finally { setSending(false); }
  };

  return (
    <div className="app-screen" style={{ background: 'var(--bg)' }}>
      <div className="screen-header">
        <Link href="/dashboard" className="back">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1>Assembly Hall</h1>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'white' }}>
        <button onClick={() => setTab('meetings')} className="btn" style={{
          flex: 1, borderRadius: 0, background: tab === 'meetings' ? 'var(--blue-bright)' : 'transparent',
          color: tab === 'meetings' ? 'white' : 'var(--muted)', borderBottom: tab === 'meetings' ? '2px solid var(--blue-bright)' : 'none', fontSize: 14, padding: '14px', fontWeight: 700
        }}>Meetings</button>
        <button onClick={() => setTab('chat')} className="btn" style={{
          flex: 1, borderRadius: 0, background: tab === 'chat' ? 'var(--blue-bright)' : 'transparent',
          color: tab === 'chat' ? 'white' : 'var(--muted)', borderBottom: tab === 'chat' ? '2px solid var(--blue-bright)' : 'none', fontSize: 14, padding: '14px', fontWeight: 700
        }}>Chat Rooms</button>
      </div>

      {error && <div className="alert alert-error" style={{ margin: 16 }}>{error}</div>}

      {tab === 'meetings' ? (
        <div className="app-scroll">
          <div className="app-pad">
            <button className="btn btn-block mb-16" onClick={() => setShowCreate(!showCreate)}>Schedule meeting</button>
            {showCreate && (
              <div className="card mb-16">
                <form onSubmit={create}>
                  <div className="form-group">
                    <label>Title *</label>
                    <div className="input-wrap"><input type="text" value={form.title} onChange={e => set('title', e.target.value)} required placeholder="e.g. 2006 Reunion" /></div>
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea className="textarea" value={form.description} onChange={e => set('description', e.target.value)} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14 }} />
                  </div>
                  <div className="form-group">
                    <label>Mode</label>
                    <select className="select" value={form.mode} onChange={e => set('mode', e.target.value)} style={{ width: '100%' }}>
                      <option value="INTERACTIVE">Interactive (up to ~500)</option>
                      <option value="WEBINAR">Webinar</option>
                      <option value="BROADCAST">Broadcast</option>
                    </select>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Start *</label>
                      <div className="input-wrap"><input type="datetime-local" value={form.startsAt} onChange={e => set('startsAt', e.target.value)} required /></div>
                    </div>
                    <div className="form-group">
                      <label>Capacity</label>
                      <div className="input-wrap"><input type="number" value={form.capacity} onChange={e => set('capacity', e.target.value)} /></div>
                    </div>
                  </div>
                  <button className="btn btn-block" type="submit" disabled={creating}>{creating ? <span className="spinner" /> : 'Create'}</button>
                </form>
              </div>
            )}
            {tokenInfo && (
              <div className="card mb-16" style={{ borderColor: 'var(--blue)', borderWidth: 2 }}>
                <h3>Meeting token</h3>
                <p>Mode: <span className={`badge ${modeBadge[tokenInfo.mode]}`}>{tokenInfo.mode}</span></p>
                <div className="alert alert-info">URL: {tokenInfo.url}<br />Token: {tokenInfo.token.slice(0, 40)}...</div>
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
                      <button onClick={() => join(m.id)} disabled={joining === m.id} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, color: 'var(--blue)', fontSize: 14, fontWeight: 600, background: 'none', border: 0, cursor: 'pointer' }}>
                        {joining === m.id ? <span className="spinner" /> : '🔗 Join'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : activeRoom ? (
        <>
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
                <div className="avatar" style={{ width: 36, height: 36, background: 'var(--blue)', color: 'white', fontSize: 14, flexShrink: 0 }}>
                  {(m.user?.profile?.fullName || '?').charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 2 }}>{m.user?.profile?.fullName || 'Alumnus'}</div>
                  <div style={{ padding: '10px 14px', borderRadius: '14px 14px 14px 4px', background: 'white', border: '1px solid var(--border)', fontSize: 14, lineHeight: 1.4 }}>{m.body}</div>
                </div>
              </div>
            ))}
            <div ref={messagesEnd} />
          </div>
          <div style={{ padding: '12px 16px calc(20px + env(safe-area-inset-bottom, 0px))', borderTop: '1px solid var(--border)', background: 'white', display: 'flex', gap: 10 }}>
            <input className="input" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type..." onKeyDown={e => e.key === 'Enter' && sendMessage()} disabled={sending} style={{ flex: 1, marginBottom: 0 }} />
            <button className="btn" onClick={sendMessage} disabled={sending || !chatInput.trim()} style={{ minHeight: 48 }}>Send</button>
          </div>
        </>
      ) : (
        <div className="app-scroll">
          <div className="app-pad">
            <button className="btn btn-block mb-16" onClick={() => setShowCreateRoom(!showCreateRoom)}>Create room</button>
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
            {loading ? <div className="loading-center"><span className="spinner" /></div> : rooms.length === 0 ? (
              <div className="empty-state"><h3>No chat rooms</h3><p>Create one above.</p></div>
            ) : (
              <div className="feed">
                {rooms.map(r => (
                  <div className="feed-card" key={r.id} onClick={() => openRoom(r)} style={{ cursor: 'pointer' }}>
                    <div className="feed-card-header">
                      <div className="avatar" style={{ width: 48, height: 48, background: r.isAssemblyHall ? 'var(--blue-dark)' : 'var(--blue)', color: 'white', fontSize: 20 }}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 24, height: 24 }}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="name">{r.name}</div>
                        <div className="time">{r._count.messages} messages</div>
                      </div>
                      {r.isAssemblyHall && <span className="badge badge-dark">Assembly</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
