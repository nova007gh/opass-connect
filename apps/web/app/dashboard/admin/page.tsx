'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost, apiPatch } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';

interface Stats {
  users: number;
  verified: number;
  projects: number;
  revenue: number;
  openTickets: number;
  pendingAds: number;
  pendingQuotes: number;
}
interface PendingMember {
  id: string;
  email: string;
  phone?: string | null;
  createdAt: string;
  profile?: { fullName: string; graduationYear: number } | null;
}
interface Quote {
  id: string;
  quoteNumber: string;
  currency: string;
  subtotal: string;
  total: string;
  status: string;
  intake: { clientName: string; clientEmail: string; requestType: string };
}
interface AdCampaign {
  id: string;
  placement: string;
  durationDays: number;
  audience: string;
  quotedAmount: string;
  status: string;
  creativeUrl?: string | null;
  business: { name: string; logoUrl?: string | null; category: string };
}
interface ActivityItem {
  id: string;
  type: 'user' | 'payment';
  label: string;
  at: string;
}
interface TeamMember {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  verification: string;
  createdAt: string;
  profile?: { fullName: string; graduationYear: number; avatarUrl?: string | null; profession?: string | null; house?: string | null } | null;
}
interface MamaaStats {
  total: number;
  byCategory: { category: string; _count: { _all: number } }[];
}

const statMeta: Record<string, { icon: string; color: string; bg: string }> = {
  'Total users': { icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2a4 4 0 100-8 4 4 0 000 8z', color: 'var(--blue)', bg: 'var(--blue-50)' },
  Verified: { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: '#22C55E', bg: '#ECFDF5' },
  Projects: { icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'var(--blue)', bg: 'var(--blue-50)' },
  Revenue: { icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H5a3 3 0 00-3 3v8a3 3 0 003 3z', color: 'var(--blue)', bg: 'var(--blue-50)' },
  'Open tickets': { icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M5.636 5.636l3.536 3.536m0 5.656l-3.536 3.536M12 12a3 3 0 11-6 0 3 3 0 016 0z', color: '#D97706', bg: '#FFFBEB' },
  'Pending ads': { icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z', color: '#DC2626', bg: '#FEF2F2' },
  'Pending quotes': { icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: '#DC2626', bg: '#FEF2F2' },
};

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<'overview' | 'members' | 'ads' | 'quotes' | 'tickets' | 'groupInvites' | 'team' | 'mamaa'>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [pending, setPending] = useState<PendingMember[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [ads, setAds] = useState<AdCampaign[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [groupInvites, setGroupInvites] = useState<any[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [availablePerms, setAvailablePerms] = useState<string[]>([]);
  const [mamaaStats, setMamaaStats] = useState<MamaaStats | null>(null);
  const [mamaaArchive, setMamaaArchive] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState('');
  const [teamError, setTeamError] = useState('');
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [memberSearch, setMemberSearch] = useState('');

  const loadAll = () => {
    Promise.all([
      apiGet<Stats>('/admin/stats').catch(() => null),
      apiGet<PendingMember[]>('/admin/members/pending').catch(() => []),
      apiGet<Quote[]>('/admin/quotes').catch(() => []),
      apiGet<AdCampaign[]>('/admin/ads?status=PENDING_APPROVAL').catch(() => []),
      apiGet<ActivityItem[]>('/admin/activity').catch(() => []),
      apiGet<any[]>('/tickets').catch(() => []),
      apiGet<any[]>('/admin/year-group-invites').catch(() => []),
    ]).then(([s, p, q, a, act, t, gi]) => {
      setStats(s);
      setPending(p);
      setQuotes(q);
      setAds(a);
      setActivity(act);
      setTickets(t);
      setGroupInvites(gi);
      setLoading(false);
    });
  };

  const loadTeam = () => {
    Promise.all([
      apiGet<TeamMember[]>('/admin/team').catch(() => []),
      apiGet<string[]>('/admin/permissions').catch(() => []),
    ]).then(([t, p]) => {
      setTeam(t);
      setAvailablePerms(p);
    });
  };

  const loadMembers = (search?: string) => {
    apiGet<TeamMember[]>(`/admin/members${search ? `?search=${encodeURIComponent(search)}` : ''}`).catch(() => []).then(setMembers);
  };

  const loadMamaaArchive = () => {
    Promise.all([
      apiGet<MamaaStats>('/admin/mamaa/stats').catch(() => null),
      apiGet<any[]>('/admin/mamaa/archive?limit=100').catch(() => []),
    ]).then(([s, a]) => {
      setMamaaStats(s);
      setMamaaArchive(a);
    });
  };

  const actOnGroupInvite = async (id: string, action: 'approve' | 'reject') => {
    setAction(id);
    setInviteError('');
    try {
      await apiPost(`/year-group-invites/${id}/${action}`);
      setGroupInvites(prev => prev.filter(g => g.id !== id));
    } catch (err: any) {
      setInviteError(err.message || `Failed to ${action} request`);
    } finally { setAction(null); }
  };

  useEffect(loadAll, []);

  if (!isAdmin) {
    return (
      <div className="card empty-state">
        <h3>Access denied</h3>
        <p>You need administrator privileges to view this page.</p>
      </div>
    );
  }

  const verifyMember = async (id: string) => {
    setAction(id);
    try {
      await apiPost(`/admin/members/${id}/verify`);
      setPending(prev => prev.filter(m => m.id !== id));
    } finally {
      setAction(null);
    }
  };

  const approveQuote = async (id: string) => {
    setAction(id);
    try {
      await apiPost(`/admin/quotes/${id}/approve`);
      setQuotes(prev => prev.map(q => q.id === id ? { ...q, status: 'SENT' } : q));
    } catch (err: any) {
      alert('Failed to approve quote: ' + (err.message || 'Unknown error'));
    } finally {
      setAction(null);
    }
  };
  const rejectQuote = async (id: string) => {
    if (!confirm('Are you sure you want to reject this quote?')) return;
    setAction('reject-' + id);
    try {
      await apiPost(`/admin/quotes/${id}/reject`);
      setQuotes(prev => prev.map(q => q.id === id ? { ...q, status: 'REJECTED' } : q));
    } catch (err: any) {
      alert('Failed to reject quote: ' + (err.message || 'Unknown error'));
    } finally {
      setAction(null);
    }
  };

  const approveAd = async (id: string) => {
    setAction(id);
    try {
      await apiPost(`/admin/ads/${id}/approve`);
      setAds(prev => prev.filter(a => a.id !== id));
    } finally {
      setAction(null);
    }
  };

  const rejectAd = async (id: string) => {
    setAction(id);
    try {
      await apiPost(`/admin/ads/${id}/reject`);
      setAds(prev => prev.filter(a => a.id !== id));
    } finally {
      setAction(null);
    }
  };

  const timeAgo = (iso: string) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.round(hrs / 24)}d ago`;
  };

  const roleLabels: Record<string, string> = {
    'SUPER_ADMIN': 'Super Admin',
    'ADMIN': 'Admin',
    'EXECUTIVE': 'Executive',
    'MODERATOR': 'Moderator',
    'YEAR_ADMIN': 'Year Admin',
    'MEMBER': 'Member',
  };
  const roleColors: Record<string, string> = {
    'SUPER_ADMIN': '#7C3AED',
    'ADMIN': '#2563EB',
    'EXECUTIVE': '#059669',
    'MODERATOR': '#D97706',
    'YEAR_ADMIN': '#0891B2',
    'MEMBER': '#6B7280',
  };

  const saveTeamMember = async (data: { role: string; permissions: string[] }) => {
    if (!editingMember) return;
    setTeamError('');
    setAction('save-' + editingMember.id);
    try {
      await apiPatch(`/admin/team/${editingMember.id}`, data);
      setEditingMember(null);
      loadTeam();
    } catch (err: any) {
      setTeamError(err.message || 'Failed to update team member');
    } finally { setAction(null); }
  };

  const demoteMember = async (id: string) => {
    if (!confirm('Remove this person\'s admin/executive role? They will become a regular member.')) return;
    setAction('demote-' + id);
    try {
      await apiPost(`/admin/team/${id}/demote`);
      loadTeam();
    } catch (err: any) {
      alert(err.message || 'Failed to demote member');
    } finally { setAction(null); }
  };

  const createTeamMember = async (data: { email: string; fullName: string; role: string; permissions: string[]; graduationYear?: number; house?: string }) => {
    setTeamError('');
    setAction('create');
    try {
      await apiPost('/admin/team', data);
      setShowTeamModal(false);
      loadTeam();
    } catch (err: any) {
      setTeamError(err.message || 'Failed to create team member');
    } finally { setAction(null); }
  };

  const promoteMember = async (userId: string, role: string) => {
    setTeamError('');
    setAction('promote-' + userId);
    try {
      await apiPatch(`/admin/team/${userId}`, { role, permissions: [] });
      loadTeam();
      loadMembers(memberSearch);
    } catch (err: any) {
      setTeamError(err.message || 'Failed to promote member');
    } finally { setAction(null); }
  };

  const statCards = stats ? [
    { label: 'Total users', value: stats.users },
    { label: 'Verified', value: stats.verified },
    { label: 'Projects', value: stats.projects },
    { label: 'Revenue', value: `GHS ${Number(stats.revenue).toLocaleString()}` },
    { label: 'Open tickets', value: stats.openTickets },
    { label: 'Pending ads', value: stats.pendingAds },
    { label: 'Pending quotes', value: stats.pendingQuotes },
  ] : [];

  const renderOverview = () => (
    <>
      <div className="admin-stat-grid">
        {statCards.map(s => {
          const meta = statMeta[s.label];
          return (
            <div key={s.label} className="admin-stat-card">
              <div className="admin-stat-icon" style={{ background: meta.bg, color: meta.color }}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d={meta.icon} /></svg>
              </div>
              <div>
                <strong className="admin-stat-value">{s.value}</strong>
                <small className="admin-stat-label">{s.label}</small>
              </div>
            </div>
          );
        })}
      </div>

      <div className="section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '24px 0 12px' }}>
        <h3 style={{ margin: 0, fontSize: 16, color: 'var(--blue)', fontWeight: 800 }}>Recent Activity</h3>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {activity.length === 0 ? (
          <div className="empty-state"><p>No recent activity.</p></div>
        ) : (
          activity.map((a, i) => (
            <div key={a.id} className="admin-activity-row" style={{ borderBottom: i < activity.length - 1 ? '1px solid var(--border)' : 0 }}>
              <div className="admin-activity-icon" style={{ background: a.type === 'user' ? 'var(--blue-50)' : '#ECFDF5', color: a.type === 'user' ? 'var(--blue)' : '#22C55E' }}>
                {a.type === 'user' ? (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                ) : (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H5a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.label}</div>
              </div>
              <span className="text-muted text-sm" style={{ flexShrink: 0 }}>{timeAgo(a.at)}</span>
            </div>
          ))
        )}
      </div>
    </>
  );

  return (
    <div className="app-screen" style={{ background: 'var(--bg)' }}>
      <div className="screen-header">
        <Link href="/dashboard" className="back" aria-label="Back">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 style={{ flex: 1 }}>Admin Dashboard</h1>
      </div>
      <div className="app-scroll">
        <div className="app-pad">
          {loading ? (
            <div className="loading-center"><span className="spinner" /></div>
          ) : (
            <>
              <div className="flex gap-12 mb-24" style={{ flexWrap: 'wrap' }}>
                <button className={`btn btn-sm ${tab === 'overview' ? '' : 'btn-outline'}`} onClick={() => setTab('overview')}>Overview</button>
                <button className={`btn btn-sm ${tab === 'members' ? '' : 'btn-outline'}`} onClick={() => setTab('members')}>
                  Members {pending.length > 0 && <span className="badge badge-amber" style={{ marginLeft: 6 }}>{pending.length}</span>}
                </button>
                <button className={`btn btn-sm ${tab === 'team' ? '' : 'btn-outline'}`} onClick={() => { setTab('team'); loadTeam(); }}>
                  Team
                </button>
                <button className={`btn btn-sm ${tab === 'ads' ? '' : 'btn-outline'}`} onClick={() => setTab('ads')}>
                  Ad Approvals {ads.length > 0 && <span className="badge badge-red" style={{ marginLeft: 6 }}>{ads.length}</span>}
                </button>
                <button className={`btn btn-sm ${tab === 'quotes' ? '' : 'btn-outline'}`} onClick={() => setTab('quotes')}>
                  Quotes {quotes.length > 0 && <span className="badge badge-blue" style={{ marginLeft: 6 }}>{quotes.length}</span>}
                </button>
                <button className={`btn btn-sm ${tab === 'tickets' ? '' : 'btn-outline'}`} onClick={() => setTab('tickets')}>
                  Tickets {tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length > 0 && <span className="badge badge-red" style={{ marginLeft: 6 }}>{tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length}</span>}
                </button>
                <button className={`btn btn-sm ${tab === 'groupInvites' ? '' : 'btn-outline'}`} onClick={() => setTab('groupInvites')}>
                  Group Requests {groupInvites.length > 0 && <span className="badge badge-red" style={{ marginLeft: 6 }}>{groupInvites.length}</span>}
                </button>
                <button className={`btn btn-sm ${tab === 'mamaa' ? '' : 'btn-outline'}`} onClick={() => { setTab('mamaa'); loadMamaaArchive(); }}>
                  Mamaa AI
                </button>
              </div>
              {tab === 'overview' && renderOverview()}
              {tab === 'members' && (
                <div className="card">
                  <h3>Pending member verifications</h3>
                  {pending.length === 0 ? (
                    <div className="empty-state"><p>No pending verifications.</p></div>
                  ) : (
                    pending.map(m => (
                      <div key={m.id} className="list-item" style={{ flexWrap: 'wrap' }}>
                        <div>
                          <strong style={{ display: 'block' }}>{m.profile?.fullName || '—'}</strong>
                          <div className="text-muted text-sm">{m.email} · {m.profile?.graduationYear || '—'}</div>
                        </div>
                        <button className="btn btn-sm btn-success" onClick={() => verifyMember(m.id)} disabled={action === m.id}>
                          {action === m.id ? <span className="spinner" /> : 'Verify'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
              {tab === 'ads' && (
                <div className="card">
                  <h3>Pending ad campaigns</h3>
                  {ads.length === 0 ? (
                    <div className="empty-state"><p>No pending ad campaigns.</p></div>
                  ) : (
                    ads.map(a => (
                      <div key={a.id} className="admin-ad-row">
                        <div className="admin-ad-logo">
                          {a.business?.logoUrl ? <img src={a.business.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} /> : (a.business?.name ?? '?').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ display: 'block', fontSize: 14 }}>{a.business?.name ?? 'Unknown'}</strong>
                          <div className="text-muted text-sm">{a.placement?.replace(/_/g, ' ') ?? '—'} · {a.durationDays}d · GHS {Number(a.quotedAmount ?? 0).toLocaleString()}</div>
                        </div>
                        <div className="flex gap-8" style={{ flexShrink: 0 }}>
                          <button className="admin-icon-btn admin-icon-btn-approve" onClick={() => approveAd(a.id)} disabled={action === a.id} aria-label="Approve">
                            {action === a.id ? <span className="spinner" style={{ width: 16, height: 16 }} /> : (
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            )}
                          </button>
                          <button className="admin-icon-btn admin-icon-btn-reject" onClick={() => rejectAd(a.id)} disabled={action === a.id} aria-label="Reject">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              {tab === 'quotes' && (
                <div className="card">
                  <h3>Quote requests</h3>
                  {quotes.length === 0 ? (
                    <div className="empty-state"><p>No quote requests.</p></div>
                  ) : (
                    quotes.map(q => (
                      <div key={q.id} className="list-item" style={{ flexWrap: 'wrap' }}>
                        <div>
                          <strong style={{ display: 'block' }}>{q.quoteNumber}</strong>
                          <div className="text-muted text-sm">{q.intake?.clientName ?? '—'} · {q.intake?.requestType ?? '—'} · {q.currency} {Number(q.total ?? 0).toLocaleString()}</div>
                          {q.intake?.clientEmail && <div className="text-muted text-sm">📧 {q.intake.clientEmail}</div>}
                        </div>
                        {q.status === 'DRAFT' ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-sm" onClick={() => approveQuote(q.id)} disabled={action === q.id}>
                              {action === q.id ? <span className="spinner" /> : 'Approve & Send'}
                            </button>
                            <button className="btn btn-sm btn-danger" onClick={() => rejectQuote(q.id)} disabled={action === 'reject-' + q.id}>
                              {action === 'reject-' + q.id ? <span className="spinner" /> : 'Reject'}
                            </button>
                          </div>
                        ) : q.status === 'SENT' ? (
                          <span className="badge badge-green">✓ Approved & Sent</span>
                        ) : q.status === 'REJECTED' ? (
                          <span className="badge" style={{ background: '#fee', color: '#c33' }}>✗ Rejected</span>
                        ) : (
                          <span className="badge">{q.status}</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
              {tab === 'tickets' && (
                <div className="card">
                  <h3>Support Tickets</h3>
                  {tickets.length === 0 ? (
                    <div className="empty-state"><p>No support tickets.</p></div>
                  ) : (
                    tickets.map(t => (
                      <div key={t.id} className="list-item" style={{ flexWrap: 'wrap', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ display: 'block', fontSize: 14 }}>{t.subject}</strong>
                          <div className="text-muted text-sm">
                            {t.user?.profile?.fullName || t.user?.email || 'Anonymous'} · {new Date(t.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                          </div>
                          <div className="text-muted text-sm" style={{ marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.body}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                          <span className={`badge ${t.status === 'OPEN' ? 'badge-blue' : t.status === 'IN_PROGRESS' ? 'badge-amber' : t.status === 'CLOSED' ? 'badge-dark' : 'badge-green'}`}>{t.status.replace(/_/g, ' ')}</span>
                          <Link href="/dashboard/support" className="text-sm" style={{ color: 'var(--blue)', fontWeight: 600 }}>View</Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              {tab === 'groupInvites' && (
                <div className="card">
                  <h3>Year Group Join Requests</h3>
                  {inviteError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{inviteError}</div>}
                  {groupInvites.length === 0 ? (
                    <div className="empty-state"><p>No pending group requests.</p></div>
                  ) : (
                    groupInvites.map((inv: any) => (
                      <div key={inv.id} className="list-item" style={{ flexWrap: 'wrap', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ display: 'block', fontSize: 14 }}>
                            {inv.invitedUser?.profile?.fullName || inv.invitedUser?.email || inv.contactEmail || inv.contactPhone || 'Unknown'}
                          </strong>
                          <div className="text-muted text-sm">
                            {inv.selfRequested ? 'Requested to join' : `Invited by ${inv.invitedBy?.profile?.fullName || inv.invitedBy?.email}`} · Class of {inv.yearGroup?.year} ({inv.yearGroup?.name})
                          </div>
                          {inv.awaitingRegistration && (
                            <div className="badge badge-amber" style={{ marginTop: 6, fontSize: 11 }}>Awaiting registration</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {inv.awaitingRegistration ? (
                            <button className="btn btn-sm" style={{ background: 'var(--muted)' }} onClick={() => actOnGroupInvite(inv.id, 'reject')} disabled={action === inv.id}>
                              {action === inv.id ? <span className="spinner" /> : 'Cancel Invite'}
                            </button>
                          ) : (
                            <>
                              <button className="btn btn-sm btn-success" onClick={() => actOnGroupInvite(inv.id, 'approve')} disabled={action === inv.id}>
                                {action === inv.id ? <span className="spinner" /> : 'Approve'}
                              </button>
                              <button className="btn btn-sm" style={{ background: 'var(--muted)' }} onClick={() => actOnGroupInvite(inv.id, 'reject')} disabled={action === inv.id}>
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              {tab === 'team' && (
                <TeamTab
                  team={team}
                  members={members}
                  availablePerms={availablePerms}
                  action={action}
                  teamError={teamError}
                  memberSearch={memberSearch}
                  setMemberSearch={(v: string) => { setMemberSearch(v); loadMembers(v); }}
                  onLoadMembers={() => loadMembers(memberSearch)}
                  onEdit={setEditingMember}
                  onDemote={demoteMember}
                  onSave={saveTeamMember}
                  onCreate={createTeamMember}
                  onPromote={promoteMember}
                  showTeamModal={showTeamModal}
                  setShowTeamModal={setShowTeamModal}
                  editingMember={editingMember}
                  setEditingMember={setEditingMember}
                  roleLabels={roleLabels}
                  roleColors={roleColors}
                />
              )}
              {tab === 'mamaa' && (
                <div>
                  <div className="card" style={{ marginBottom: 16 }}>
                    <h3>Mamaa AI — Silent Mode</h3>
                    <p className="text-muted text-sm" style={{ marginBottom: 12 }}>
                      Mamaa AI is now <strong>silent by default</strong> in all chats. It only responds when explicitly called with <code>@mamaa</code>.
                      It continues to <strong>listen, learn, and archive</strong> all conversations for admin review.
                    </p>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
                      <div style={{ flex: 1, minWidth: 120, padding: 12, borderRadius: 12, background: 'var(--blue-50)', textAlign: 'center' }}>
                        <strong style={{ display: 'block', fontSize: 24, color: 'var(--blue)' }}>{mamaaStats?.total ?? '—'}</strong>
                        <small className="text-muted">Total archived messages</small>
                      </div>
                      {mamaaStats?.byCategory?.map((c) => (
                        <div key={c.category} style={{ flex: 1, minWidth: 120, padding: 12, borderRadius: 12, background: 'var(--bg)', textAlign: 'center' }}>
                          <strong style={{ display: 'block', fontSize: 24, color: 'var(--blue)' }}>{c._count._all}</strong>
                          <small className="text-muted">{c.category.replace(/_/g, ' ')}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="card">
                    <h3>Conversation Archive</h3>
                    <p className="text-muted text-sm" style={{ marginBottom: 12 }}>Recent messages Mamaa AI has recorded from chats.</p>
                    {mamaaArchive.length === 0 ? (
                      <div className="empty-state"><p>No archived conversations yet.</p></div>
                    ) : (
                      <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                        {mamaaArchive.map((item, i) => (
                          <div key={item.id} style={{ padding: '10px 0', borderBottom: i < mamaaArchive.length - 1 ? '1px solid var(--border)' : 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <span className="badge" style={{ background: 'var(--blue-50)', color: 'var(--blue)', fontSize: 10 }}>{item.category.replace(/_/g, ' ')}</span>
                              <span className="text-muted text-sm">{new Date(item.createdAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</span>
                            </div>
                            <div style={{ fontSize: 13 }}>{item.content}</div>
                            {item.source && <div className="text-muted text-sm" style={{ marginTop: 2 }}>— {item.source}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="card" style={{ marginTop: 16 }}>
                    <h3>Mamaa AI Commands (Admin Only)</h3>
                    <p className="text-muted text-sm" style={{ marginBottom: 8 }}>These commands work in any chat but are not shown to regular members.</p>
                    <ul style={{ paddingLeft: 20, fontSize: 14, lineHeight: 1.8 }}>
                      <li><code>@mamaa</code> — Ask Mamaa AI a question (works for everyone)</li>
                      <li><code>@stopmamaa</code> — Put Mamaa on standby (silent, no confirmation)</li>
                      <li><code>@startmamaa</code> — Bring Mamaa back to active mode (silent, no confirmation)</li>
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Team Management Component =====
function TeamTab({
  team, members, availablePerms, action, teamError, memberSearch,
  setMemberSearch, onLoadMembers, onEdit, onDemote, onSave, onCreate, onPromote,
  showTeamModal, setShowTeamModal, editingMember, setEditingMember, roleLabels, roleColors,
}: any) {
  const [newMember, setNewMember] = useState({ email: '', fullName: '', role: 'EXECUTIVE', permissions: [] as string[], graduationYear: new Date().getFullYear(), house: '' });
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [editRole, setEditRole] = useState('EXECUTIVE');
  const [showPromoteSearch, setShowPromoteSearch] = useState(false);

  useEffect(() => {
    if (editingMember) {
      setEditPerms(editingMember.permissions || []);
      setEditRole(editingMember.role);
    }
  }, [editingMember]);

  const togglePerm = (perm: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(perm) ? list.filter((p: string) => p !== perm) : [...list, perm]);
  };

  return (
    <div>
      {teamError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{teamError}</div>}

      {/* Current team */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Admins & Executives ({team.length})</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm" onClick={() => { setShowPromoteSearch(!showPromoteSearch); if (!showPromoteSearch) onLoadMembers(); }}>
              {showPromoteSearch ? 'Close' : 'Promote Member'}
            </button>
            <button className="btn btn-sm btn-success" onClick={() => setShowTeamModal(true)}>+ Add New</button>
          </div>
        </div>

        {team.length === 0 ? (
          <div className="empty-state"><p>No admins or executives yet.</p></div>
        ) : (
          team.map((m: TeamMember) => (
            <div key={m.id} className="list-item" style={{ flexWrap: 'wrap', borderBottom: '1px solid var(--border)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong>{m.profile?.fullName || m.email}</strong>
                  <span className="badge" style={{ background: (roleColors[m.role] || '#6B7280') + '22', color: roleColors[m.role] || '#6B7280', fontSize: 11 }}>
                    {roleLabels[m.role] || m.role}
                  </span>
                </div>
                <div className="text-muted text-sm">{m.email}</div>
                {m.permissions && m.permissions.length > 0 && (
                  <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {m.permissions.map((p) => (
                      <span key={p} className="badge badge-blue" style={{ fontSize: 10 }}>{p.replace(/can_/g, '').replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button className="btn btn-sm" onClick={() => onEdit(m)} disabled={m.role === 'SUPER_ADMIN'}>
                  Edit
                </button>
                {m.role !== 'SUPER_ADMIN' && (
                  <button className="btn btn-sm btn-danger" onClick={() => onDemote(m.id)} disabled={action === 'demote-' + m.id}>
                    {action === 'demote-' + m.id ? <span className="spinner" /> : 'Demote'}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Promote existing member */}
      {showPromoteSearch && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Promote a Member</h3>
          <input
            className="input"
            placeholder="Search by name or email..."
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            style={{ marginBottom: 12 }}
          />
          {members.length === 0 ? (
            <div className="empty-state"><p>{memberSearch ? 'No members found.' : 'Start typing to search members.'}</p></div>
          ) : (
            members.slice(0, 10).map((m: TeamMember) => (
              <div key={m.id} className="list-item" style={{ flexWrap: 'wrap', borderBottom: '1px solid var(--border)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>{m.profile?.fullName || m.email}</strong>
                  <div className="text-muted text-sm">{m.email} · Class of {m.profile?.graduationYear || '—'}</div>
                </div>
                <select
                  className="input"
                  style={{ width: 'auto', padding: '4px 8px', fontSize: 13 }}
                  defaultValue=""
                  onChange={(e) => { if (e.target.value) onPromote(m.id, e.target.value); }}
                >
                  <option value="" disabled>Promote to...</option>
                  <option value="EXECUTIVE">Executive</option>
                  <option value="MODERATOR">Moderator</option>
                  <option value="YEAR_ADMIN">Year Admin</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            ))
          )}
        </div>
      )}

      {/* Edit member modal */}
      {editingMember && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setEditingMember(null)}>
          <div className="card" style={{ maxWidth: 500, width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3>Edit: {editingMember.profile?.fullName || editingMember.email}</h3>
            <label className="text-muted text-sm">Role</label>
            <select className="input" style={{ marginBottom: 12 }} value={editRole} onChange={(e) => setEditRole(e.target.value)} disabled={editingMember.role === 'SUPER_ADMIN'}>
              <option value="MEMBER">Member</option>
              <option value="YEAR_ADMIN">Year Admin</option>
              <option value="MODERATOR">Moderator</option>
              <option value="EXECUTIVE">Executive</option>
              <option value="ADMIN">Admin</option>
            </select>
            <label className="text-muted text-sm">Permissions</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16, maxHeight: 250, overflowY: 'auto', padding: 8, border: '1px solid var(--border)', borderRadius: 8 }}>
              {availablePerms.map((perm: string) => (
                <label key={perm} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={editPerms.includes(perm)} onChange={() => togglePerm(perm, editPerms, setEditPerms)} />
                  {perm.replace(/can_/g, '').replace(/_/g, ' ')}
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-sm btn-outline" onClick={() => setEditingMember(null)}>Cancel</button>
              <button className="btn btn-sm" onClick={() => onSave({ role: editRole, permissions: editPerms })} disabled={action === 'save-' + editingMember.id}>
                {action === 'save-' + editingMember.id ? <span className="spinner" /> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create new team member modal */}
      {showTeamModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowTeamModal(false)}>
          <div className="card" style={{ maxWidth: 500, width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3>Add New Admin / Executive</h3>
            <p className="text-muted text-sm" style={{ marginBottom: 12 }}>An account will be created and login credentials sent via email.</p>
            <input className="input" placeholder="Full name" value={newMember.fullName} onChange={(e) => setNewMember({ ...newMember, fullName: e.target.value })} style={{ marginBottom: 8 }} />
            <input className="input" placeholder="Email address" type="email" value={newMember.email} onChange={(e) => setNewMember({ ...newMember, email: e.target.value })} style={{ marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input className="input" placeholder="Graduation year" type="number" value={newMember.graduationYear} onChange={(e) => setNewMember({ ...newMember, graduationYear: parseInt(e.target.value) || new Date().getFullYear() })} style={{ flex: 1 }} />
              <input className="input" placeholder="House (optional)" value={newMember.house} onChange={(e) => setNewMember({ ...newMember, house: e.target.value })} style={{ flex: 1 }} />
            </div>
            <label className="text-muted text-sm">Role</label>
            <select className="input" style={{ marginBottom: 12 }} value={newMember.role} onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}>
              <option value="EXECUTIVE">Executive</option>
              <option value="MODERATOR">Moderator</option>
              <option value="YEAR_ADMIN">Year Admin</option>
              <option value="ADMIN">Admin</option>
            </select>
            <label className="text-muted text-sm">Permissions</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16, maxHeight: 200, overflowY: 'auto', padding: 8, border: '1px solid var(--border)', borderRadius: 8 }}>
              {availablePerms.map((perm: string) => (
                <label key={perm} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={newMember.permissions.includes(perm)} onChange={() => togglePerm(perm, newMember.permissions, (v) => setNewMember({ ...newMember, permissions: v }))} />
                  {perm.replace(/can_/g, '').replace(/_/g, ' ')}
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-sm btn-outline" onClick={() => setShowTeamModal(false)}>Cancel</button>
              <button className="btn btn-sm btn-success" onClick={() => onCreate(newMember)} disabled={action === 'create' || !newMember.email || !newMember.fullName}>
                {action === 'create' ? <span className="spinner" /> : 'Create & Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
