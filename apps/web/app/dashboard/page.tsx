'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import ConnectGlyph from '../../components/ConnectGlyph';
import Avatar from '../../components/Avatar';
import { getYearGroupColor } from '../../lib/houseColors';

interface YearGroup { id: string; year: number; name: string; imageUrl?: string | null; _count: { memberships: number } }
interface Project { id: string; title: string; description: string; targetAmount: string; raisedAmount: string; status: string; imageUrl?: string | null }
interface EventItem { id: string; title: string; startsAt: string; venue?: string | null; streamUrl?: string | null }

interface ActivityItem {
  id: string;
  type: 'post' | 'comment' | 'like';
  createdAt: string;
  userId: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  nickname?: string | null;
  body?: string | null;
  imageUrl?: string | null;
  likesCount?: number;
  commentsCount?: number;
  postPreview?: string | null;
}
interface ActivityResponse {
  activities: ActivityItem[];
  counts: { posts: number; comments: number; likes: number; members: number };
  yearGroup: { id: string; name: string; year: number; imageUrl?: string | null };
}

const menuItems = [
  { label: 'My Profile', href: '/dashboard/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', color: 'linear-gradient(135deg, #0B2D6B 0%, #0051FF 100%)' },
  { label: 'Year Groups', href: '/dashboard/groups', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2a4 4 0 100-8 4 4 0 000 8z', color: 'linear-gradient(135deg, #0051FF 0%, #10B981 100%)' },
  { label: 'Events', href: '/dashboard/events', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', color: 'linear-gradient(135deg, #10B981 0%, #F59E0B 100%)' },
  { label: 'Assembly Hall', href: '/dashboard/assembly', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z', live: true, color: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)' },
  { label: 'Support Projects', href: '/dashboard/projects', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', color: 'linear-gradient(135deg, #EF4444 0%, #8B5CF6 100%)' },
  { label: 'Dues & Payments', href: '/dashboard/payments', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H5a3 3 0 00-3 3v8a3 3 0 003 3z', color: 'linear-gradient(135deg, #8B5CF6 0%, #0B2D6B 100%)' },
  { label: 'Elections', href: '/dashboard/elections', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', color: 'linear-gradient(135deg, #0B2D6B 0%, #2563EB 100%)' },
  { label: 'Business', href: '/dashboard/business', icon: 'M21 13.255A48.108 48.108 0 0112 21c-2.272 0-4.459-.334-6.512-.955M21 13.255c.18 1.078.272 2.183.272 3.295 0 2.272-.334 4.459-.955 6.512M3 13.255A48.093 48.093 0 016.74 3.379M3 13.255c-.18 1.078-.272 2.183-.272 3.295 0 2.272-.334 4.459-.955 6.512', color: 'linear-gradient(135deg, #2563EB 0%, #10B981 100%)' },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatEventDate(d: string) {
  const date = new Date(d);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days > 0 && days <= 7) return `In ${days} days`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function DashboardHome() {
  const { user } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [yearGroups, setYearGroups] = useState<YearGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activity, setActivity] = useState<ActivityResponse | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) router.push(`/dashboard/alumni?search=${encodeURIComponent(search.trim())}`);
  };

  useEffect(() => {
    Promise.all([
      apiGet<YearGroup[]>('/year-groups?mine=true').catch(() => []),
      apiGet<Project[]>('/projects').catch(() => []),
      apiGet<EventItem[]>('/events').catch(() => []),
    ]).then(([yg, pr, ev]) => {
      setYearGroups(yg);
      setProjects(pr);
      setEvents(ev);
      setLoading(false);
      // Load activity for the first (primary) year group
      if (yg.length > 0) {
        setActivityLoading(true);
        apiGet<ActivityResponse>(`/year-groups/${yg[0].id}/activity?limit=15`)
          .then(setActivity)
          .catch(() => {})
          .finally(() => setActivityLoading(false));
      }
    });
  }, []);

  const upcoming = events.filter(e => new Date(e.startsAt) > new Date()).slice(0, 3);
  const firstName = user?.profile?.fullName?.split(' ')[0] || 'Alumnus';
  const nickname = user?.profile?.nickname || 'POPASSION';
  const totalRaised = projects.reduce((sum, p) => sum + Number(p.raisedAmount), 0);
  const activeProjects = projects.filter(p => p.status === 'ACTIVE').length;
  const myYearGroups = yearGroups;
  const primaryYg = yearGroups[0];

  return (
    <div className="app-screen fade-in" style={{ background: 'var(--bg)' }}>
      <div className="app-scroll">
        {/* Header */}
        <div className="home-header">
          <div className="home-greeting">{getGreeting()}, {firstName}!</div>
          <div className="home-brand">
            <img src="/opass-crest.jpeg" alt="OPASS" className="home-crest" />
            <div className="home-brand-text">
              <div className="home-logo-text">OPASS C<span className="c-link"><ConnectGlyph /></span>NNECT</div>
              <div className="home-sub">OFORI PANIN SENIOR HIGH SCHOOL</div>
            </div>
          </div>
          <div className="home-tagline">ONE SCHOOL. ONE NETWORK. ONE <span>LEGACY.</span></div>
          <form className="home-search" onSubmit={submitSearch}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search classmates, groups, events..." />
          </form>
        </div>

        {/* Quick Stats */}
        <div className="home-content">
          <div className="quick-stats fade-in-up">
            <div className="quick-stat-card">
              <div className="quick-stat-value">{loading ? '–' : yearGroups.length}</div>
              <div className="quick-stat-label">Year Groups</div>
            </div>
            <div className="quick-stat-card">
              <div className="quick-stat-value">{loading ? '–' : activeProjects}</div>
              <div className="quick-stat-label">Projects</div>
            </div>
            <div className="quick-stat-card">
              <div className="quick-stat-value">{loading ? '–' : `GHS ${totalRaised.toLocaleString()}`}</div>
              <div className="quick-stat-label">Raised</div>
            </div>
          </div>

          {/* Menu grid */}
          <div className="menu-grid">
            {menuItems.map(item => (
              <Link href={item.href} className="menu-grid-item fade-in-up" key={item.label}>
                <div className="menu-grid-icon" style={{ background: item.color }}>
                  <svg fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  {item.live && <span className="live-badge">LIVE</span>}
                </div>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* My Year Groups with House Colors + Neon */}
          {myYearGroups.length > 0 && (
            <>
              <div className="section-header fade-in-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 17, color: 'var(--blue)', fontWeight: 800 }}>My Year Group{myYearGroups.length > 1 ? 's' : ''}</h3>
                <Link href="/dashboard/groups" style={{ color: 'var(--blue)', fontSize: 13, fontWeight: 700 }}>View all</Link>
              </div>
              {myYearGroups.map(yg => {
                const hc = getYearGroupColor(yg.year, user?.profile?.house);
                return (
                  <Link
                    key={yg.id}
                    href={`/dashboard/groups/${yg.id}`}
                    className="yg-card yg-card-neon fade-in-up"
                    style={{
                      background: hc.baseGradient,
                      color: hc.text,
                      marginBottom: 12,
                      ['--yg-neon' as any]: hc.neon,
                      ['--yg-neon-glow' as any]: hc.neon + '66',
                    }}
                  >
                    <div className="yg-card-year" style={{ color: hc.text }}>
                      {yg.imageUrl ? <img src={yg.imageUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: 12, objectFit: 'cover' }} /> : yg.year}
                    </div>
                    <div className="yg-card-body">
                      <div className="yg-card-name">{yg.name}</div>
                      <div className="yg-card-meta">{yg._count?.memberships ?? 0} members</div>
                      {activity && activity.yearGroup.id === yg.id && (
                        <div className="yg-card-stats">
                          <span>📝 {activity.counts.posts}</span>
                          <span>💬 {activity.counts.comments}</span>
                          <span>❤️ {activity.counts.likes}</span>
                        </div>
                      )}
                    </div>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 20, height: 20, opacity: 0.7, flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </Link>
                );
              })}
            </>
          )}

          {/* Year Group Activity Status/Story View */}
          {primaryYg && (
            <>
              <div className="section-header fade-in-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 8 }}>
                <h3 style={{ margin: 0, fontSize: 17, color: 'var(--blue)', fontWeight: 800 }}>Year Group Activity</h3>
                <Link href={`/dashboard/groups/${primaryYg.id}`} style={{ color: 'var(--blue)', fontSize: 13, fontWeight: 700 }}>Open group</Link>
              </div>

              {/* Stats pills */}
              {activity && (
                <div className="stats-pills fade-in-up">
                  <div className="stats-pill">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    <span className="count">{activity.counts.posts}</span> Posts
                  </div>
                  <div className="stats-pill">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    <span className="count">{activity.counts.comments}</span> Comments
                  </div>
                  <div className="stats-pill">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    <span className="count">{activity.counts.likes}</span> Likes
                  </div>
                  <div className="stats-pill">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2a4 4 0 100-8 4 4 0 000 8z" /></svg>
                    <span className="count">{activity.counts.members}</span> Members
                  </div>
                </div>
              )}

              {/* Status rings (WhatsApp/Instagram story style) */}
              {activity && activity.activities.length > 0 && (
                <div className="status-bar fade-in-up">
                  {activity.activities.slice(0, 10).map(a => (
                    <Link key={a.id} href={`/dashboard/groups/${primaryYg.id}`} className="status-ring">
                      <div className="status-ring-avatar">
                        <Avatar src={a.avatarUrl} name={a.fullName} size={51} />
                      </div>
                      <span className="status-ring-label">{a.nickname || a.fullName?.split(' ')[0] || 'Alumnus'}</span>
                    </Link>
                  ))}
                </div>
              )}

              {/* Vertical activity timeline */}
              {activityLoading ? (
                <div className="card fade-in-up" style={{ marginBottom: 20, padding: 16 }}>
                  <div className="skeleton skeleton-text" style={{ width: '40%', marginBottom: 10 }} />
                  <div className="skeleton skeleton-text sm" style={{ marginBottom: 10 }} />
                  <div className="skeleton skeleton-text sm" style={{ width: '70%' }} />
                </div>
              ) : activity && activity.activities.length > 0 ? (
                <div className="card fade-in-up" style={{ marginBottom: 20, padding: '8px 16px' }}>
                  <div className="activity-timeline">
                    {activity.activities.map(a => (
                      <div key={a.id} className="activity-item">
                        <div className="activity-dot">
                          <Avatar src={a.avatarUrl} name={a.fullName} size={36} />
                        </div>
                        <div className="activity-content">
                          <div className="activity-header">
                            <span className="activity-name">{a.fullName || 'Alumnus'}</span>
                            <span className={`activity-type activity-type-${a.type}`}>{a.type}</span>
                          </div>
                          <div className="activity-body">
                            {a.type === 'post' && (a.body || (a.imageUrl ? '📷 Shared a photo' : 'Shared a post'))}
                            {a.type === 'comment' && `💬 "${a.body}"` + (a.postPreview ? ` on "${a.postPreview}..."` : '')}
                            {a.type === 'like' && `❤️ liked a post${a.postPreview ? ` "${a.postPreview}..."` : ''}`}
                          </div>
                          {a.type === 'post' && a.imageUrl && (
                            <img src={a.imageUrl} alt="" className="activity-image" />
                          )}
                          {a.type === 'post' && (a.likesCount || a.commentsCount) ? (
                            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                              {a.likesCount ? `❤️ ${a.likesCount}` : ''} {a.commentsCount ? `💬 ${a.commentsCount}` : ''}
                            </div>
                          ) : null}
                          <div className="activity-time">{timeAgo(a.createdAt)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="empty-state card fade-in-up" style={{ marginBottom: 20 }}>
                  <h3>No recent activity</h3>
                  <p>Be the first to post in your year group!</p>
                  <Link href={`/dashboard/groups/${primaryYg.id}`} className="btn btn-sm" style={{ marginTop: 12 }}>Open Year Group</Link>
                </div>
              )}
            </>
          )}

          {/* Upcoming Events */}
          {upcoming.length > 0 && (
            <>
              <div className="section-header fade-in-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 17, color: 'var(--blue)', fontWeight: 800 }}>Upcoming Events</h3>
                <Link href="/dashboard/events" style={{ color: 'var(--blue)', fontSize: 13, fontWeight: 700 }}>View all</Link>
              </div>
              <div className="events-scroll fade-in-up" style={{ marginBottom: 24 }}>
                {upcoming.map(ev => (
                  <Link key={ev.id} href="/dashboard/events" className="event-mini-card">
                    <div className="event-mini-date">
                      <span className="event-mini-day">{new Date(ev.startsAt).getDate()}</span>
                      <span className="event-mini-month">{new Date(ev.startsAt).toLocaleDateString('en-US', { month: 'short' })}</span>
                    </div>
                    <div className="event-mini-body">
                      <div className="event-mini-title">{ev.title}</div>
                      <div className="event-mini-meta">
                        <span>{formatEventDate(ev.startsAt)}</span>
                        {ev.venue && <><span>·</span><span>{ev.venue}</span></>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* Active Projects */}
          <div className="section-header fade-in-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 17, color: 'var(--blue)', fontWeight: 800 }}>Active Projects</h3>
            {projects.length > 0 && <Link href="/dashboard/projects" style={{ color: 'var(--blue)', fontSize: 13, fontWeight: 700 }}>View all</Link>}
          </div>
          {loading ? (
            <div className="card skeleton-card" style={{ marginBottom: 20, padding: 16 }}>
              <div className="skeleton skeleton-text" style={{ width: '60%', marginBottom: 10 }} />
              <div className="skeleton skeleton-text sm" style={{ marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 8, borderRadius: 4 }} />
            </div>
          ) : projects.length > 0 ? (
            <div className="card fade-in-up" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
              {projects.slice(0, 3).map((p, i) => {
                const target = Number(p.targetAmount);
                const raised = Number(p.raisedAmount);
                const pct = target > 0 ? Math.min(100, (raised / target) * 100) : 0;
                const isFunded = pct >= 100;
                return (
                  <Link key={p.id} href="/dashboard/projects" style={{ display: 'block', padding: 16, borderBottom: i < Math.min(2, projects.length - 1) ? '1px solid var(--border)' : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{p.title}</span>
                      {isFunded && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 6 }}>FUNDED</span>}
                    </div>
                    <div className="text-sm text-muted" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600, color: 'var(--blue)' }}>GHS {raised.toLocaleString()}</span>
                      <span>of GHS {target.toLocaleString()}</span>
                    </div>
                    <div className="progress"><div className="progress-bar" style={{ width: `${pct}%`, background: isFunded ? 'var(--green)' : undefined }} /></div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="empty-state card fade-in-up" style={{ marginBottom: 20 }}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <h3>No active projects</h3>
              <p>Check back later for alumni fundraising initiatives.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
