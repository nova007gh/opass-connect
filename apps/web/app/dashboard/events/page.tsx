'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '../../../lib/api';

interface EventItem {
  id: string;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt?: string | null;
  venue?: string | null;
  streamUrl?: string | null;
  ticketPrice?: string | null;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    apiGet<EventItem[]>('/events')
      .then(setEvents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const upcoming = events.filter(e => new Date(e.startsAt) > now);
  const past = events.filter(e => new Date(e.startsAt) <= now);
  const list = tab === 'upcoming' ? upcoming : past;

  const month = (d: string) => new Date(d).toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const day = (d: string) => new Date(d).getDate();

  return (
    <div className="app-screen" style={{ background: 'var(--bg)' }}>
      <div className="screen-header">
        <h1 style={{ flex: 1 }}>Events</h1>
      </div>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'white' }}>
        <button onClick={() => setTab('upcoming')} className="btn" style={{
          flex: 1, borderRadius: 0, background: tab === 'upcoming' ? 'var(--blue-bright)' : 'transparent',
          color: tab === 'upcoming' ? 'white' : 'var(--muted)', borderBottom: tab === 'upcoming' ? '2px solid var(--blue-bright)' : 'none', fontSize: 14,
          padding: '14px', fontWeight: 700
        }}>Upcoming</button>
        <button onClick={() => setTab('past')} className="btn" style={{
          flex: 1, borderRadius: 0, background: tab === 'past' ? 'var(--blue-bright)' : 'transparent',
          color: tab === 'past' ? 'white' : 'var(--muted)', borderBottom: tab === 'past' ? '2px solid var(--blue-bright)' : 'none', fontSize: 14,
          padding: '14px', fontWeight: 700
        }}>Past</button>
      </div>
      <div className="app-scroll">
        <div className="app-pad">
          {loading ? (
            <div className="loading-center"><span className="spinner" /></div>
          ) : list.length === 0 ? (
            <div className="empty-state"><h3>No {tab} events</h3><p>Check back soon for updates.</p></div>
          ) : (
            <div className="feed">
              {list.map(ev => (
                <div className="feed-card" key={ev.id}>
                  <div className="feed-card-header">
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--blue-50)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)', fontWeight: 800 }}>
                      <span style={{ fontSize: 10 }}>{month(ev.startsAt)}</span>
                      <span style={{ fontSize: 18, lineHeight: 1 }}>{day(ev.startsAt)}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="name" style={{ fontSize: 16 }}>{ev.title}</div>
                      <div className="time">{ev.venue || 'Virtual'}</div>
                    </div>
                    {ev.ticketPrice && <span className="badge badge-blue">GHS {Number(ev.ticketPrice).toLocaleString()}</span>}
                  </div>
                  <div className="feed-card-body">
                    <p style={{ color: '#374151', fontSize: 15 }}>{ev.description}</p>
                    <div className="text-sm text-muted">
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
                    {ev.ticketPrice ? (
                      <a href="/dashboard/payments" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, color: 'var(--blue)', fontSize: 14, fontWeight: 600 }}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                        Register
                      </a>
                    ) : (
                      <span style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, color: 'var(--muted)', fontSize: 14, fontWeight: 600 }}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        {new Date(ev.startsAt).toLocaleDateString('en-US', { timeStyle: 'short' })}
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
