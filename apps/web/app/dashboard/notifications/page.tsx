'use client';

import Link from 'next/link';

const notifications = [
  { id: 1, title: 'Dues Payment Successful', body: 'Your payment of GHS 200 has been received.', time: '2 hours ago', type: 'payment' },
  { id: 2, title: 'New Event: OPASS Homecoming 2026', body: 'Registration is now open. Nov 14, 2026 - Accra.', time: '5 hours ago', type: 'event' },
  { id: 3, title: 'Project Update', body: 'Science Lab Renovation is 95% funded. Great work!', time: 'Yesterday', type: 'project' },
];

export default function NotificationsPage() {
  return (
    <div className="app-screen">
      <div className="screen-header">
        <Link href="/dashboard" className="back">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1>Notifications</h1>
      </div>
      <div className="app-scroll" style={{ background: 'var(--bg)' }}>
        <div className="app-pad" style={{ padding: 0 }}>
          {notifications.map(n => (
            <div key={n.id} className="card" style={{ borderRadius: 0, borderLeft: 0, borderRight: 0, borderBottom: '1px solid var(--border)' }}>
              <div className="flex gap-12" style={{ alignItems: 'flex-start' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: n.type === 'payment' ? 'var(--blue-50)' : n.type === 'event' ? 'var(--blue-50)' : '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 22, height: 22, color: 'var(--blue)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={n.type === 'payment' ? 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H5a3 3 0 00-3 3v8a3 3 0 003 3z' : n.type === 'event' ? 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' : 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'} />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 4px', fontSize: 15 }}>{n.title}</h3>
                  <p style={{ margin: '0 0 4px', fontSize: 14 }}>{n.body}</p>
                  <div className="text-sm text-muted">{n.time}</div>
                </div>
              </div>
            </div>
          ))}
          {notifications.length === 0 && (
            <div className="empty-state"><h3>No notifications</h3><p>You&apos;re all caught up.</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
