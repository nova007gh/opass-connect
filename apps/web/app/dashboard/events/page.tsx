'use client';

import { useEffect, useState, useRef } from 'react';
import { apiGet, apiPost, apiUpload } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';

interface EventItem {
  id: string;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt?: string | null;
  venue?: string | null;
  streamUrl?: string | null;
  imageUrl?: string | null;
  ticketPrice?: string | null;
}

export default function EventsPage() {
  const { isAdmin } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', description: '', startsAt: '', venue: '', streamUrl: '', ticketPrice: '' });
  const [createImage, setCreateImage] = useState<File | null>(null);
  const [createImagePreview, setCreateImagePreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    apiGet<EventItem[]>('/events')
      .then(setEvents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const upcoming = events.filter(e => new Date(e.startsAt) > now).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const past = events.filter(e => new Date(e.startsAt) <= now).sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
  const list = tab === 'upcoming' ? upcoming : past;

  const month = (d: string) => new Date(d).toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const day = (d: string) => new Date(d).getDate();

  const onCreateImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/image\/(jpeg|png|webp|gif)/.test(file.type)) { setError('Please choose a valid image.'); return; }
    if (file.size > 5_000_000) { setError('Image must be under 5MB.'); return; }
    setCreateImage(file);
    setCreateImagePreview(URL.createObjectURL(file));
  };

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title || !createForm.startsAt) { setError('Title and start date are required'); return; }
    setCreating(true); setError('');
    try {
      const payload: any = {
        title: createForm.title,
        description: createForm.description || undefined,
        startsAt: new Date(createForm.startsAt).toISOString(),
        venue: createForm.venue || undefined,
        streamUrl: createForm.streamUrl || undefined,
        ticketPrice: createForm.ticketPrice ? parseFloat(createForm.ticketPrice) : undefined,
      };
      const ev = await apiPost<EventItem>('/events', payload);
      if (createImage) {
        try {
          const { imageUrl } = await apiUpload<{ imageUrl: string }>(`/events/${ev.id}/image`, createImage);
          ev.imageUrl = imageUrl;
        } catch {}
      }
      setEvents(prev => [ev, ...prev]);
      setCreateForm({ title: '', description: '', startsAt: '', venue: '', streamUrl: '', ticketPrice: '' });
      setCreateImage(null); setCreateImagePreview(null); setShowCreate(false);
      setSuccess('Event created successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { setError(err.message || 'Failed to create event'); }
    finally { setCreating(false); }
  };

  return (
    <div className="app-screen fade-in" style={{ background: 'var(--bg)' }}>
      <div className="screen-header">
        <h1 style={{ flex: 1 }}>Events</h1>
      </div>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--white)' }}>
        <button onClick={() => setTab('upcoming')} className="assembly-tab" style={{
          flex: 1, borderRadius: 0, background: 'transparent',
          color: tab === 'upcoming' ? 'var(--blue)' : 'var(--muted)', borderBottom: tab === 'upcoming' ? '2px solid var(--blue-bright)' : '2px solid transparent', fontSize: 14, padding: '14px', fontWeight: 700
        }}>Upcoming</button>
        <button onClick={() => setTab('past')} className="assembly-tab" style={{
          flex: 1, borderRadius: 0, background: 'transparent',
          color: tab === 'past' ? 'var(--blue)' : 'var(--muted)', borderBottom: tab === 'past' ? '2px solid var(--blue-bright)' : '2px solid transparent', fontSize: 14, padding: '14px', fontWeight: 700
        }}>Past</button>
      </div>
      <div className="app-scroll">
        <div className="app-pad">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {isAdmin && tab === 'upcoming' && (
            <>
              <button className="btn btn-block mb-16" onClick={() => setShowCreate(!showCreate)}>
                {showCreate ? 'Cancel' : '+ Create Event'}
              </button>
              {showCreate && (
                <div className="card mb-16" style={{ padding: 16 }}>
                  <form onSubmit={createEvent}>
                    <div className="form-group">
                      <label>Title *</label>
                      <div className="input-wrap"><input type="text" value={createForm.title} onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Homecoming 2026" required /></div>
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea className="textarea" value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} placeholder="Event details..." style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, minHeight: 80 }} />
                    </div>
                    <div className="form-group">
                      <label>Start Date & Time *</label>
                      <div className="input-wrap"><input type="datetime-local" value={createForm.startsAt} onChange={e => setCreateForm(f => ({ ...f, startsAt: e.target.value }))} required /></div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Venue</label>
                        <div className="input-wrap"><input type="text" value={createForm.venue} onChange={e => setCreateForm(f => ({ ...f, venue: e.target.value }))} placeholder="e.g. School Hall" /></div>
                      </div>
                      <div className="form-group">
                        <label>Ticket Price (GHS)</label>
                        <div className="input-wrap"><input type="number" value={createForm.ticketPrice} onChange={e => setCreateForm(f => ({ ...f, ticketPrice: e.target.value }))} placeholder="0 = Free" /></div>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Stream URL</label>
                      <div className="input-wrap"><input type="url" value={createForm.streamUrl} onChange={e => setCreateForm(f => ({ ...f, streamUrl: e.target.value }))} placeholder="https://..." /></div>
                    </div>
                    <div className="form-group">
                      <label>Event Banner Image</label>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden', background: 'var(--blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border)', flexShrink: 0 }}>
                          {createImagePreview ? <img src={createImagePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: 'var(--muted)', fontSize: 12 }}>No image</span>}
                        </div>
                        <button type="button" className="btn btn-sm" onClick={() => document.getElementById('create-event-image')?.click()}>Choose Photo</button>
                        {createImage && <button type="button" className="btn btn-sm" style={{ background: 'var(--red)', color: 'white' }} onClick={() => { setCreateImage(null); setCreateImagePreview(null); }}>Remove</button>}
                        <input id="create-event-image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onCreateImageChange} style={{ display: 'none' }} />
                      </div>
                    </div>
                    <button className="btn btn-block" type="submit" disabled={creating}>
                      {creating ? <span className="spinner" /> : 'Create Event'}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}

          {loading ? (
            <div className="loading-center"><span className="spinner" /></div>
          ) : list.length === 0 ? (
            <div className="empty-state"><h3>No {tab} events</h3><p>Check back soon for updates.</p></div>
          ) : (
            <div className="feed">
              {list.map(ev => (
                <div className="feed-card" key={ev.id}>
                  {ev.imageUrl && (
                    <img src={ev.imageUrl} alt="" style={{ width: '100%', height: 180, objectFit: 'cover' }} />
                  )}
                  <div className="feed-card-header">
                    <div className="event-date-badge" style={{
                      width: 52, height: 52, borderRadius: 12,
                      background: 'rgba(11,45,107,0.08)', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0,
                      color: 'var(--blue-bright)',
                    }}>
                      <span style={{ fontSize: 10, lineHeight: 1 }}>{month(ev.startsAt)}</span>
                      <span style={{ fontSize: 20, lineHeight: 1, marginTop: 2 }}>{day(ev.startsAt)}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="name" style={{ fontSize: 16 }}>{ev.title}</div>
                      <div className="time">{ev.venue || 'Virtual'}</div>
                    </div>
                    {ev.ticketPrice && <span className="badge badge-blue">GHS {Number(ev.ticketPrice).toLocaleString()}</span>}
                  </div>
                  <div className="feed-card-body">
                    {ev.description && <p style={{ color: 'var(--black)', fontSize: 15, margin: 0 }}>{ev.description}</p>}
                    <div className="text-sm" style={{ marginTop: 8, color: 'var(--blue-bright)', fontWeight: 600 }}>
                      {new Date(ev.startsAt).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}
                    </div>
                  </div>
                  <div className="feed-card-actions">
                    {ev.streamUrl && (
                      <a href={ev.streamUrl} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, color: 'var(--blue)', fontSize: 14, fontWeight: 600 }}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        Watch
                      </a>
                    )}
                    {tab === 'upcoming' && ev.ticketPrice ? (
                      <a href="/dashboard/payments" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, color: 'var(--blue)', fontSize: 14, fontWeight: 600 }}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                        Register
                      </a>
                    ) : (
                      <span style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, color: 'var(--muted)', fontSize: 14, fontWeight: 600 }}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        {new Date(ev.startsAt).toLocaleTimeString('en-US', { timeStyle: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
