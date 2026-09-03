'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '../../../lib/api';
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
  const [tab, setTab] = useState<'overview' | 'members' | 'ads' | 'quotes' | 'tickets' | 'groupInvites' | 'aiLogs'>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [pending, setPending] = useState<PendingMember[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [ads, setAds] = useState<AdCampaign[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [groupInvites, setGroupInvites] = useState<any[]>([]);
  const [aiConversations, setAiConversations] = useState<any[]>([]);
  const [aiMessages, setAiMessages] = useState<any[] | null>(null);
  const [aiMessagesLoading, setAiMessagesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState('');

  const openAiConversation = async (id: string) => {
    setAiMessagesLoading(true);
    setAiMessages([]);
    try { setAiMessages(await apiGet<any[]>(`/ai/conversations/${id}`)); } catch { setAiMessages([]); } finally { setAiMessagesLoading(false); }
  };

  const loadAll = () => {
    Promise.all([
      apiGet<Stats>('/admin/stats').catch(() => null),
      apiGet<PendingMember[]>('/admin/members/pending').catch(() => []),
      apiGet<Quote[]>('/admin/quotes').catch(() => []),
      apiGet<AdCampaign[]>('/admin/ads?status=PENDING_APPROVAL').catch(() => []),
      apiGet<ActivityItem[]>('/admin/activity').catch(() => []),
      apiGet<any[]>('/tickets').catch(() => []),
      apiGet<any[]>('/admin/year-group-invites').catch(() => []),
      apiGet<any[]>('/ai/conversations').catch(() => []),
    ]).then(([s, p, q, a, act, t, gi, ai]) => {
      setStats(s);
      setPending(p);
      setQuotes(q);
      setAds(a);
      setActivity(act);
      setTickets(t);
      setGroupInvites(gi);
      setAiConversations(ai);
      setLoading(false);
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
                <button className={`btn btn-sm ${tab === 'aiLogs' ? '' : 'btn-outline'}`} onClick={() => setTab('aiLogs')}>
                  Mamaa AI Logs
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
                        </div>
                        {q.status === 'DRAFT' || q.status === 'SENT' ? (
                          <button className="btn btn-sm" onClick={() => approveQuote(q.id)} disabled={action === q.id}>
                            {action === q.id ? <span className="spinner" /> : 'Approve'}
                          </button>
                        ) : (
                          <span className="badge badge-green">{q.status}</span>
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
              {tab === 'aiLogs' && (
                <div className="card">
                  <h3>Mamaa AI Conversation Logs</h3>
                  {aiConversations.length === 0 ? (
                    <div className="empty-state"><p>No AI conversations yet.</p></div>
                  ) : (
                    aiConversations.map((c: any) => (
                      <div key={c.id} className="list-item" style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }} onClick={() => openAiConversation(c.id)}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ display: 'block', fontSize: 14 }}>{c.user?.profile?.fullName || c.user?.email || 'Anonymous'}</strong>
                          <div className="text-muted text-sm">{c._count?.messages ?? 0} messages · {new Date(c.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}</div>
                        </div>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18, color: 'var(--muted)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                      </div>
                    ))
                  )}
                  {aiMessages !== null && (
                    <div className="card" style={{ marginTop: 16, background: 'var(--bg)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <h4 style={{ margin: 0 }}>Conversation Transcript</h4>
                        <button className="btn btn-sm" style={{ background: 'var(--muted)' }} onClick={() => setAiMessages(null)}>Close</button>
                      </div>
                      {aiMessagesLoading ? (
                        <div className="loading-center"><span className="spinner" /></div>
                      ) : aiMessages.length === 0 ? (
                        <p className="text-muted text-sm">No messages found.</p>
                      ) : (
                        aiMessages.map((m: any) => (
                          <div key={m.id} style={{ marginBottom: 10, padding: 10, borderRadius: 10, background: m.role === 'user' ? 'var(--blue-50)' : 'var(--white)' }}>
                            <div className="text-muted text-sm" style={{ fontWeight: 700, marginBottom: 2 }}>{m.role === 'user' ? 'Member' : 'Mamaa AI'}</div>
                            <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{m.content}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
