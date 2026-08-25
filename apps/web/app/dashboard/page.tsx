'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '../../lib/api';
import { useAuth } from '../../lib/auth';

interface YearGroup { id: string; year: number; name: string; _count: { memberships: number } }
interface Project { id: string; title: string; description: string; targetAmount: string; raisedAmount: string; status: string }
interface EventItem { id: string; title: string; startsAt: string; venue?: string | null; streamUrl?: string | null }

const menuItems = [
  { label: 'My Profile', href: '/dashboard/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { label: 'Year Groups', href: '/dashboard/groups', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2a4 4 0 100-8 4 4 0 000 8z' },
  { label: 'Events', href: '/dashboard/events', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { label: 'Assembly Hall', href: '/dashboard/assembly', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z', live: true },
  { label: 'Support Projects', href: '/dashboard/projects', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
  { label: 'Dues & Payments', href: '/dashboard/payments', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H5a3 3 0 00-3 3v8a3 3 0 003 3z' },
  { label: 'Elections', href: '/dashboard/elections', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { label: 'More', href: '/dashboard/menu', icon: 'M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z' },
];

export default function DashboardHome() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [yearGroups, setYearGroups] = useState<YearGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<YearGroup[]>('/year-groups').catch(() => []),
      apiGet<Project[]>('/projects').catch(() => []),
      apiGet<EventItem[]>('/events').catch(() => []),
    ]).then(([yg, pr, ev]) => {
      setYearGroups(yg);
      setProjects(pr);
      setEvents(ev);
      setLoading(false);
    });
  }, []);

  const upcoming = events.filter(e => new Date(e.startsAt) > new Date()).slice(0, 1);
  const townHall = events.find(e => e.title.toLowerCase().includes('town hall'));
  const liveEvent = townHall || upcoming[0] || { title: 'OPASS Global Town Hall', startsAt: new Date().toISOString(), venue: 'Virtual' };
  const firstName = user?.profile?.fullName?.split(' ')[0] || 'Alumnus';
  const initials = (user?.profile?.fullName || user?.email || '?').charAt(0).toUpperCase();

  return (
    <div className="app-screen" style={{ background: 'var(--bg)' }}>
      <div className="app-scroll">
        {/* Header */}
        <div className="home-header">
          <div className="home-header-top">
            <Link href="/dashboard/notifications" className="bell">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="badge-red">3</span>
            </Link>
            <Link href="/dashboard/profile" className="profile-thumb">
              {user?.profile?.avatarUrl ? (
                <img src={user.profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <>{initials}</>
              )}
            </Link>
          </div>
          <div className="home-greeting">Good Morning, {firstName}!</div>
          <div className="home-brand">
            <img src="/opass-crest.jpeg" alt="OPASS" className="home-crest" />
            <div className="home-brand-text">
              <div className="home-logo-text">OPASS <span className="c-link">C</span>ONNECT</div>
              <div className="home-sub">OFORI PANIN SENIOR HIGH SCHOOL</div>
            </div>
          </div>
          <div className="home-tagline">ONE SCHOOL. ONE NETWORK. ONE <span>LEGACY.</span></div>
          <div className="home-search">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Search classmates, groups, events..." />
          </div>
        </div>

        {/* Menu grid */}
        <div className="home-content">
          <div className="menu-grid">
            {menuItems.map(item => (
              <Link href={item.href} className="menu-grid-item" key={item.label}>
                <div className="menu-grid-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  {item.live && <span className="live-badge">LIVE</span>}
                </div>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Live card */}
          <div className="live-card">
            <div className="live-now">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
              LIVE NOW
            </div>
            <h3>{liveEvent.title}</h3>
            <div className="meta">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 16, height: 16, display: 'inline', verticalAlign: 'middle', marginRight: 4 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {new Date(liveEvent.startsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · 7:00 PM GMT<br />
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 16, height: 16, display: 'inline', verticalAlign: 'middle', marginRight: 4, marginTop: 4 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2a4 4 0 100-8 4 4 0 000 8z" />
              </svg>
              1,234 Attending
            </div>
            <div className="attendees">
              <div className="attendee-avatars">
                <div className="avatar">K</div>
                <div className="avatar">A</div>
                <div className="avatar">Y</div>
              </div>
              <div className="more-avatars">+999</div>
            </div>
            <Link className="join-btn" href="/dashboard/assembly">Join Live</Link>
          </div>

          {/* Announcement */}
          <div className="section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 17, color: 'var(--blue)', fontWeight: 800 }}>Announcements</h3>
            <Link href="/dashboard/notifications" style={{ color: 'var(--blue)', fontSize: 13, fontWeight: 700 }}>See All</Link>
          </div>
          <div className="announcement-card" style={{ marginBottom: 24 }}>
            <div className="icon" style={{ background: 'linear-gradient(135deg, var(--blue-50), #dbeafe)' }}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 22, height: 22, color: 'var(--blue)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.341 7.625-3 0 0 0 0 0 0v13.659a2 2 0 01-2 2H5.436z" />
              </svg>
            </div>
            <div className="body">
              <h4>Homecoming 2026</h4>
              <p>Registration is now open! 🎉</p>
            </div>
          </div>

          {/* Quick stats / projects */}
          {projects.length > 0 && (
            <>
              <div className="section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 17, color: 'var(--blue)', fontWeight: 800 }}>Active Projects</h3>
                <Link href="/dashboard/projects" style={{ color: 'var(--blue)', fontSize: 13, fontWeight: 700 }}>View all</Link>
              </div>
              <div className="card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
                {projects.slice(0, 3).map((p, i) => {
                  const target = Number(p.targetAmount);
                  const raised = Number(p.raisedAmount);
                  const pct = target > 0 ? Math.min(100, (raised / target) * 100) : 0;
                  return (
                    <div key={p.id} style={{ padding: 16, borderBottom: i < Math.min(2, projects.length - 1) ? '1px solid var(--border)' : 0 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 15 }}>{p.title}</div>
                      <div className="text-sm text-muted" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                        <span>GHS {raised.toLocaleString()}</span>
                        <span>of GHS {target.toLocaleString()}</span>
                      </div>
                      <div className="progress"><div className="progress-bar" style={{ width: `${pct}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
