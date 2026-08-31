'use client';

import Link from 'next/link';
import { useAuth } from '../../../lib/auth';
import ConnectGlyph from '../../../components/ConnectGlyph';
import Avatar from '../../../components/Avatar';

const menuGroups = [
  {
    title: 'Account',
    items: [
      { label: 'My Profile', href: '/dashboard/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
      { label: 'Year Groups', href: '/dashboard/groups', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2a4 4 0 100-8 4 4 0 000 8z' },
      { label: 'Alumni Directory', href: '/dashboard/alumni', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2a4 4 0 100-8 4 4 0 000 8z' },
    ],
  },
  {
    title: 'Community',
    items: [
      { label: 'Events', href: '/dashboard/events', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
      { label: 'OPASS Connect', href: '/dashboard/assembly', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z' },
      { label: 'Projects', href: '/dashboard/projects', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
      { label: 'Dues & Payments', href: '/dashboard/payments', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H5a3 3 0 00-3 3v8a3 3 0 003 3z' },
      { label: 'Elections', href: '/dashboard/elections', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
      { label: 'Business Directory', href: '/dashboard/business', icon: 'M21 13.255A48.108 48.108 0 0112 21c-2.272 0-4.459-.334-6.512-.955M21 13.255a48.108 48.108 0 00-3.74-9.876M21 13.255c.18 1.078.272 2.183.272 3.295' },
    ],
  },
  {
    title: 'Tools',
    items: [
      { label: 'Chat with Mamaaa AI', href: '/dashboard/chat/mamaaa-ai-bot', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 3v-3z' },
      { label: 'Mamaaa AI Dashboard', href: '/dashboard/mamaaa', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 00-2-2H7a2 2 0 00-2 2zm12-9a6 6 0 11-12 0 6 6 0 0112 0z' },
      { label: 'Admin Console', href: '/dashboard/admin', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6z', adminOnly: true },
    ],
  },
  {
    title: 'More',
    items: [
      { label: 'Settings', href: '/dashboard/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
      { label: 'Help & Support', href: '/dashboard/support', icon: 'M18.364 12.364l5.657 5.657m-6.364-6.364a3 3 0 11-4.243-4.243 3 3 0 014.243 4.243zm-1.414-7.071a8 8 0 100 16 8 8 0 000-16z' },
      { label: 'About OPASS CONNECT', href: '/dashboard/about', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    ],
  },
];

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  YEAR_ADMIN: 'Year Admin',
  MODERATOR: 'Moderator',
  MEMBER: 'Member',
};

export default function MenuPage() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const role = roleLabel[user?.role || 'MEMBER'] || 'Member';

  return (
    <div className="app-screen">
      <div className="app-scroll" style={{ background: 'var(--bg)' }}>
        <div className="app-pad">
          {/* Profile summary card */}
          <Link href="/dashboard/profile" className="card menu-profile-card">
            <Avatar src={user?.profile?.avatarUrl} name={user?.profile?.fullName || user?.email} size={60} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>{user?.profile?.fullName || 'Member'}</h3>
              <p style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
              <span className="menu-role-badge" style={{ background: isAdmin ? 'var(--blue-50)' : 'var(--bg)' }}>
                {user?.verification === 'VERIFIED' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green, #22C55E)', display: 'inline-block' }} />}
                {role}
              </span>
            </div>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 22, height: 22, color: 'var(--muted)', flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {/* Menu groups */}
          {menuGroups.map((group) => {
            const visible = group.items.filter(item => !item.adminOnly || isAdmin);
            if (visible.length === 0) return null;
            return (
              <div key={group.title} className="menu-group">
                <div className="menu-group-title">{group.title}</div>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {visible.map((item, idx) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="menu-row"
                      style={{ borderBottom: idx < visible.length - 1 ? '1px solid var(--border)' : 0 }}
                    >
                      <div className="menu-row-icon">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                        </svg>
                      </div>
                      <span className="menu-row-label">{item.label}</span>
                      <svg className="menu-row-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Logout */}
          <button className="btn btn-block menu-logout" onClick={logout}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>

          {/* Footer */}
          <div className="menu-footer">
            <div className="menu-footer-brand">OPASS C<span className="c-link"><ConnectGlyph /></span>NNECT</div>
            <div>Version 1.0.0</div>
            <div className="menu-footer-tag">Developed by SmartThinkers™ Tech</div>
          </div>
        </div>
      </div>
    </div>
  );
}
