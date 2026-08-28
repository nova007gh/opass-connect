'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '../../../lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
}

const typeIcon: Record<string, string> = {
  CHAT: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  EVENT: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  PROJECT: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  ELECTION: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  PROFILE: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  ANNOUNCEMENT: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.341 7.625-3 0 0 0 0 0 0v13.659a2 2 0 01-2 2H5.436z',
  SYSTEM: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};

const typeColor: Record<string, string> = {
  CHAT: '#3b82f6',
  EVENT: '#f59e0b',
  PROJECT: '#10b981',
  ELECTION: '#8b5cf6',
  PROFILE: '#ec4899',
  ANNOUNCEMENT: '#0B2D6B',
  SYSTEM: '#6B7280',
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const load = useCallback(async () => {
    try {
      const data = await apiGet<Notification[]>(`/notifications?unreadOnly=${filter === 'unread'}&limit=50`);
      setNotifications(data);
    } catch { setNotifications([]); } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try { await apiPost(`/notifications/${id}/read`); } catch {}
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try { await apiPost('/notifications/read-all'); } catch {}
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="app-screen" style={{ background: 'var(--bg)' }}>
      <div className="screen-header">
        <h1>Notifications</h1>
        {unreadCount > 0 && (
          <button onClick={markAllRead} style={{ background: 'none', border: 0, color: 'var(--blue)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Mark all read
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--white)' }}>
        <button onClick={() => setFilter('all')} style={{
          flex: 1, padding: '8px 12px', borderRadius: 8, border: 0, cursor: 'pointer', fontWeight: 700, fontSize: 13,
          background: filter === 'all' ? 'var(--blue)' : 'var(--bg)', color: filter === 'all' ? 'white' : 'var(--muted)',
        }}>All</button>
        <button onClick={() => setFilter('unread')} style={{
          flex: 1, padding: '8px 12px', borderRadius: 8, border: 0, cursor: 'pointer', fontWeight: 700, fontSize: 13,
          background: filter === 'unread' ? 'var(--blue)' : 'var(--bg)', color: filter === 'unread' ? 'white' : 'var(--muted)',
        }}>Unread{unreadCount > 0 ? ` (${unreadCount})` : ''}</button>
      </div>

      <div className="app-scroll" style={{ background: 'var(--bg)' }}>
        {loading ? (
          <div className="loading-center"><span className="spinner" /></div>
        ) : notifications.length === 0 ? (
          <div className="empty-state" style={{ padding: 60 }}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            <h3>No notifications</h3>
            <p>You're all caught up.</p>
          </div>
        ) : (
          <div>
            {notifications.map(n => {
              const icon = typeIcon[n.type] || typeIcon.SYSTEM;
              const color = typeColor[n.type] || typeColor.SYSTEM;
              const content = (
                <>
                  <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: n.read ? 500 : 700, color: 'var(--black)' }}>{n.title}</h3>
                  <p style={{ margin: '0 0 6px', fontSize: 14, color: 'var(--muted)', lineHeight: 1.4 }}>{n.body}</p>
                  <div className="text-sm text-muted">{timeAgo(n.createdAt)}</div>
                </>
              );
              return (
                <div key={n.id} onClick={() => !n.read && markRead(n.id)} style={{
                  background: n.read ? 'var(--white)' : 'var(--blue-50)',
                  borderBottom: '1px solid var(--border)',
                  padding: '14px 16px',
                  cursor: n.read ? 'default' : 'pointer',
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  transition: 'background 0.15s',
                }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg fill="none" stroke={color} viewBox="0 0 24 24" strokeWidth={2} style={{ width: 20, height: 20 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {n.link ? <Link href={n.link} style={{ textDecoration: 'none', color: 'inherit' }}>{content}</Link> : content}
                  </div>
                  {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue-bright)', flexShrink: 0, marginTop: 6 }} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
