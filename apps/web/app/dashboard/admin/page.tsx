'use client';

import { useEffect, useState } from 'react';
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

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<'overview' | 'members' | 'quotes'>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [pending, setPending] = useState<PendingMember[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);

  const loadAll = () => {
    Promise.all([
      apiGet<Stats>('/admin/stats').catch(() => null),
      apiGet<PendingMember[]>('/admin/members/pending').catch(() => []),
      apiGet<Quote[]>('/admin/quotes').catch(() => []),
    ]).then(([s, p, q]) => {
      setStats(s);
      setPending(p);
      setQuotes(q);
      setLoading(false);
    });
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

  const statCards = stats ? [
    { label: 'Total users', value: stats.users, color: 'var(--blue)' },
    { label: 'Verified', value: stats.verified, color: 'var(--green)' },
    { label: 'Projects', value: stats.projects, color: 'var(--blue)' },
    { label: 'Revenue', value: `GHS ${Number(stats.revenue).toLocaleString()}`, color: 'var(--blue)' },
    { label: 'Open tickets', value: stats.openTickets, color: 'var(--amber)' },
    { label: 'Pending ads', value: stats.pendingAds, color: 'var(--red)' },
    { label: 'Pending quotes', value: stats.pendingQuotes, color: 'var(--red)' },
    { label: 'Active events', value: 3, color: 'var(--blue)' },
  ] : [];

  const renderOverview = () => (
    <>
      <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {statCards.map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: 16 }}>
            <strong style={{ fontSize: 28, color: s.color, display: 'block' }}>{s.value}</strong>
            <small className="text-muted" style={{ fontSize: 12 }}>{s.label}</small>
          </div>
        ))}
      </div>
      <div className="card mt-24">
        <h3>Quick actions</h3>
        <p>Review pending member verifications, approve advertising campaigns, and manage quote requests from the tabs above.</p>
      </div>
    </>
  );

  return (
    <div className="app-screen" style={{ background: 'var(--bg)' }}>
      <div className="screen-header">
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
                <button className={`btn btn-sm ${tab === 'quotes' ? '' : 'btn-outline'}`} onClick={() => setTab('quotes')}>
                  Quotes {quotes.length > 0 && <span className="badge badge-blue" style={{ marginLeft: 6 }}>{quotes.length}</span>}
                </button>
              </div>
              {tab === 'overview' ? renderOverview() : tab === 'members' ? (
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
              ) : (
                <div className="card">
                  <h3>Quote requests</h3>
                  {quotes.length === 0 ? (
                    <div className="empty-state"><p>No quote requests.</p></div>
                  ) : (
                    quotes.map(q => (
                      <div key={q.id} className="list-item" style={{ flexWrap: 'wrap' }}>
                        <div>
                          <strong style={{ display: 'block' }}>{q.quoteNumber}</strong>
                          <div className="text-muted text-sm">{q.intake.clientName} · {q.intake.requestType} · {q.currency} {Number(q.total).toLocaleString()}</div>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
