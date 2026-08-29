'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import { apiGet } from '../../lib/api';
import ConnectGlyph from '../../components/ConnectGlyph';

const allItems = [
  { href: '/dashboard', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/dashboard/profile', label: 'My Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { href: '/dashboard/groups', label: 'Year Groups', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2a4 4 0 100-8 4 4 0 000 8z' },
  { href: '/dashboard/alumni', label: 'Alumni', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  { href: '/dashboard/assembly', label: 'Assembly', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z' },
  { href: '/dashboard/events', label: 'Events', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { href: '/dashboard/projects', label: 'Projects', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { href: '/dashboard/payments', label: 'Payments', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H5a3 3 0 00-3 3v8a3 3 0 003 3z' },
  { href: '/dashboard/elections', label: 'Elections', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { href: '/dashboard/business', label: 'Business', icon: 'M21 13.255A48.108 48.108 0 0112 21c-2.272 0-4.459-.334-6.512-.955M21 13.255c.18 1.078.272 2.183.272 3.295 0 2.272-.334 4.459-.955 6.512M3 13.255A48.093 48.093 0 016.74 3.379M3 13.255c-.18 1.078-.272 2.183-.272 3.295 0 2.272.334 4.459.955 6.512' },
  { href: '/dashboard/mamaaa', label: 'Mamaaa AI', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 3v-3z' },
  { href: '/dashboard/admin', label: 'Admin', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6z' },
  { href: '/dashboard/support', label: 'Support', icon: 'M18.364 12.364l5.657 5.657m-6.364-6.364a3 3 0 11-4.243-4.243 3 3 0 014.243 4.243zm-1.414-7.071a8 8 0 100 16 8 8 0 000-16z' },
];

const tabItems = [
  { href: '/dashboard', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', isCrest: false },
  { href: '/dashboard/assembly', label: 'Chat', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 3v-3z', isCrest: false },
  { href: '/dashboard/alumni', label: 'Directory', icon: '', isCrest: true },
  { href: '/dashboard/notifications', label: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', isCrest: false },
  { href: '/dashboard/menu', label: 'Menu', icon: 'M4 6h16M4 12h16M4 18h16', isCrest: false },
];

function getBreadcrumb(pathname: string): { label: string; href: string }[] {
  const parts = pathname.replace('/dashboard', '').split('/').filter(Boolean);
  const crumbs = [{ label: 'Home', href: '/dashboard' }];
  for (const p of parts) {
    const label = p.charAt(0).toUpperCase() + p.slice(1).replace(/-/g, ' ');
    crumbs.push({ label, href: `/dashboard/${p}` });
  }
  return crumbs;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout, isAdmin } = useAuth();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const closeSidebar = () => setOpen(false);

  const fetchUnread = useCallback(async () => {
    try {
      const data = await apiGet<{ count: number }>('/notifications/unread-count');
      setUnreadCount(data.count);
    } catch {}
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (user) {
      fetchUnread();
      const interval = setInterval(fetchUnread, 15000);
      return () => clearInterval(interval);
    }
  }, [user, fetchUnread]);

  if (loading || !user) {
    return <div className="loading-center" style={{ minHeight: '100vh' }}><span className="spinner" /></div>;
  }

  const isActive = (href: string) => pathname === href;
  const initials = (user.profile?.fullName || user.email).charAt(0).toUpperCase();
  const menu = isAdmin ? allItems : allItems.filter(i => i.href !== '/dashboard/admin');
  const crumbs = getBreadcrumb(pathname);
  const pageTitle = crumbs[crumbs.length - 1].label;

  const handleLogout = () => { logout(); router.replace('/'); };

  return (
    <div className="dash-shell">
      {/* ===== Sidebar ===== */}
      <aside className={'sidebar ' + (open ? 'open' : '')}>
        <Link href="/dashboard" className="sidebar-brand" onClick={closeSidebar}>
          <img src="/opass-crest.jpeg" alt="OPASS" style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover' }} />
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-title">OPASS C<span className="c-link"><ConnectGlyph /></span>NNECT</span>
            <span className="sidebar-brand-sub">Ofori Panin SHS</span>
          </div>
        </Link>
        <nav className="sidebar-nav" onClick={e => { if ((e.target as HTMLElement).closest('a')) setOpen(false); }}>
          {menu.map(item => (
            <Link key={item.href} href={item.href} className={`sidebar-link ${isActive(item.href) ? 'active' : ''}`}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d={item.icon} /></svg>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--blue-bright)', color: 'white', fontSize: 14, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
              {user.profile?.avatarUrl ? <img src={user.profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.profile?.fullName || user.email}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{user.verification === 'VERIFIED' ? 'Verified' : 'Pending'}</div>
            </div>
          </div>
          <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', width: '100%', border: '1px solid rgba(255,255,255,0.15)' }} onClick={handleLogout}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 16, height: 16, marginRight: 6 }}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Sign out
          </button>
        </div>
      </aside>
      <div className={'sidebar-overlay' + (open ? ' visible' : '')} onClick={closeSidebar} aria-hidden="true" />

      {/* ===== Main area ===== */}
      <div className="dash-main">
        {/* ===== Topbar ===== */}
        <header className="topbar">
          <div className="topbar-left">
            <button className="topbar-hamburger" onClick={() => setOpen(!open)} aria-label="Toggle menu">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <nav className="breadcrumb" aria-label="Breadcrumb">
              {crumbs.map((c, i) => (
                <span key={c.href} className="breadcrumb-item">
                  {i < crumbs.length - 1 ? (
                    <Link href={c.href}>{c.label}</Link>
                  ) : (
                    <span className="breadcrumb-current">{c.label}</span>
                  )}
                  {i < crumbs.length - 1 && <svg className="breadcrumb-sep" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>}
                </span>
              ))}
            </nav>
          </div>
          <div className="topbar-right">
            <button className="topbar-icon-btn" onClick={toggle} aria-label="Toggle theme" title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
              {theme === 'light' ? (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
              ) : (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
              )}
            </button>
            <Link href="/dashboard/notifications" className="topbar-icon-btn" aria-label="Notifications">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              {unreadCount > 0 && <span className="badge-red" style={{ position: 'absolute', top: 4, right: 4 }}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
            </Link>
            <Link href="/dashboard/profile" className="topbar-avatar" aria-label="Profile" style={{ overflow: 'hidden' }}>
              {user.profile?.avatarUrl ? (
                <img src={user.profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span>{initials}</span>
              )}
            </Link>
          </div>
        </header>

        {/* ===== Page content ===== */}
        <div className="dash-content">
          {children}
        </div>
      </div>

      {/* ===== Mobile tab bar ===== */}
      <nav className="tabbar">
        {tabItems.map(item => (
          <Link key={item.href} href={item.href} className={`tabbar-item ${isActive(item.href) ? 'active' : ''}`}>
            {item.isCrest ? (
              <div className="tabbar-crest">
                <img src="/opass-crest.jpeg" alt="OPASS" />
              </div>
            ) : (
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d={item.icon} /></svg>
            )}
            {item.label}
            {item.href === '/dashboard/notifications' && unreadCount > 0 && <span className="badge-red">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </Link>
        ))}
      </nav>
    </div>
  );
}
