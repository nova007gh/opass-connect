'use client';

import Link from 'next/link';
import { useAuth } from '../../../lib/auth';

const menuGroups = [
  [
    { label: 'My Profile', href: '/dashboard/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { label: 'Year Groups', href: '/dashboard/groups', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2a4 4 0 100-8 4 4 0 000 8z' },
    { label: 'Alumni Directory', href: '/dashboard/alumni', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2a4 4 0 100-8 4 4 0 000 8z' },
  ],
  [
    { label: 'Events', href: '/dashboard/events', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { label: 'Assembly Hall', href: '/dashboard/assembly', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z' },
    { label: 'Projects', href: '/dashboard/projects', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { label: 'Dues & Payments', href: '/dashboard/payments', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H5a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { label: 'Elections', href: '/dashboard/elections', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    { label: 'Business Directory', href: '/dashboard/business', icon: 'M21 13.255A48.108 48.108 0 0112 21c-2.272 0-4.459-.334-6.512-.955M21 13.255a48.108 48.108 0 00-3.74-9.876M21 13.255c.18 1.078.272 2.183.272 3.295' },
  ],
  [
    { label: 'Mamaaa AI', href: '/dashboard/mamaaa', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 3v-3z' },
    { label: 'Admin Console', href: '/dashboard/admin', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6z' },
  ],
  [
    { label: 'Settings', href: '/dashboard/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
    { label: 'About OPASS CONNECT', href: '/dashboard/about', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  ],
];

export default function MenuPage() {
  const { user, logout } = useAuth();
  const initials = (user?.profile?.fullName || user?.email || '?').charAt(0).toUpperCase();

  return (
    <div className="app-screen">
      {/* Header */}
      <div className="screen-header">
        <div className="profile-thumb" style={{ background: 'var(--blue)', color: 'white' }}>{initials}</div>
        <h1>Menu</h1>
      </div>

      <div className="app-scroll" style={{ background: 'var(--bg)' }}>
        {/* Profile summary card */}
        <div className="app-pad">
          <Link href="/dashboard/profile" className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, textDecoration: 'none', marginBottom: 20 }}>
            <div className="avatar" style={{ width: 56, height: 56, fontSize: 22, background: 'var(--blue)', color: 'white' }}>{initials}</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 4px' }}>{user?.profile?.fullName || 'Member'}</h3>
              <p style={{ margin: 0 }}>{user?.email}</p>
            </div>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 22, height: 22, color: 'var(--muted)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {menuGroups.map((group, i) => (
            <div key={i} className="card" style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
              {group.map((item, idx) => {
                if (item.label === 'Admin Console' && user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') return null;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex-between"
                    style={{ padding: '16px 20px', borderBottom: idx < group.length - 1 ? '1px solid var(--border)' : 0, textDecoration: 'none', color: 'var(--black)' }}
                  >
                    <div className="flex gap-12" style={{ alignItems: 'center' }}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 22, height: 22, color: 'var(--blue)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                      </svg>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{item.label}</span>
                    </div>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18, color: 'var(--muted)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                );
              })}
            </div>
          ))}

          <button className="btn btn-block" style={{ background: 'var(--red)' }} onClick={logout}>Logout</button>
          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--muted)' }}>
            OPASS CONNECT v1.0<br />Developed by SmartThinkers™ Tech
          </div>
        </div>
      </div>
    </div>
  );
}
