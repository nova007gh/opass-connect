'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import Avatar from '../../../components/Avatar';

interface Ticket {
  id: string;
  subject: string;
  body: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  user?: { email: string; profile?: { fullName?: string | null; avatarUrl?: string | null } | null } | null;
}

const statusBadge: Record<string, string> = {
  OPEN: 'badge-blue',
  IN_PROGRESS: 'badge-amber',
  RESOLVED: 'badge-green',
  CLOSED: 'badge-dark',
};

const statusLabel: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
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

export default function SupportPage() {
  const { isAdmin } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');
  const [replying, setReplying] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<Ticket[]>('/tickets');
      setTickets(data);
    } catch { setTickets([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) { setError('Please fill all fields'); return; }
    setSubmitting(true);
    setError('');
    try {
      await apiPost('/tickets', { subject: subject.trim(), body: body.trim() });
      setSuccess('Ticket submitted! We will get back to you soon.');
      setSubject(''); setBody(''); setShowForm(false);
      setTimeout(() => setSuccess(''), 5000);
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to submit ticket');
    } finally { setSubmitting(false); }
  };

  const sendReply = async (id: string) => {
    if (!reply.trim()) return;
    setReplying(true);
    try {
      await apiPost(`/tickets/${id}/reply`, { message: reply.trim() });
      setReply('');
      setSuccess('Reply sent!');
      setTimeout(() => setSuccess(''), 3000);
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to send reply');
    } finally { setReplying(false); }
  };

  const closeTicket = async (id: string) => {
    try {
      await apiPost(`/tickets/${id}/close`);
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to close ticket');
    }
  };

  if (selected) {
    return (
      <div className="app-screen fade-in" style={{ background: 'var(--bg)' }}>
        <div className="screen-header" style={{ position: 'sticky', top: 0 }}>
          <button onClick={() => setSelected(null)} className="back">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1>Ticket Details</h1>
        </div>
        <div className="app-scroll">
          <div className="app-pad">
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span className={`badge ${statusBadge[selected.status]}`}>{statusLabel[selected.status] || selected.status}</span>
                <span className="text-sm text-muted">{timeAgo(selected.createdAt)}</span>
              </div>
              <h2 style={{ margin: '0 0 12px', fontSize: 18, color: 'var(--black)' }}>{selected.subject}</h2>
              {selected.user && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Avatar src={selected.user.profile?.avatarUrl} name={selected.user.profile?.fullName || selected.user.email} size={32} />
                  <span className="text-sm text-muted">{selected.user.profile?.fullName || selected.user.email}</span>
                </div>
              )}
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#374151' }}>{selected.body}</p>
            </div>
            {isAdmin && selected.status !== 'CLOSED' && (
              <div className="card" style={{ marginBottom: 16 }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Reply to user</h3>
                <textarea className="textarea" value={reply} onChange={e => setReply(e.target.value)} placeholder="Type your response..." style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, minHeight: 80, width: '100%', marginBottom: 12 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-sm" onClick={() => sendReply(selected.id)} disabled={replying || !reply.trim()}>
                    {replying ? <span className="spinner" /> : 'Send Reply'}
                  </button>
                  <button className="btn btn-sm" style={{ background: 'var(--muted)' }} onClick={() => closeTicket(selected.id)}>
                    Close Ticket
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-screen fade-in" style={{ background: 'var(--bg)' }}>
      <div className="screen-header">
        <h1>Support</h1>
        {!showForm && (
          <button className="btn btn-sm" onClick={() => setShowForm(true)}>New Ticket</button>
        )}
      </div>
      <div className="app-scroll">
        <div className="app-pad">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {showForm ? (
            <form onSubmit={submit} className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Create Support Ticket</h3>
              <div className="form-group">
                <label>Subject</label>
                <div className="input-wrap">
                  <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief description of your issue" maxLength={200} required />
                </div>
              </div>
              <div className="form-group">
                <label>Details</label>
                <textarea className="textarea" value={body} onChange={e => setBody(e.target.value)} placeholder="Describe your issue in detail..." maxLength={5000} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, minHeight: 120, width: '100%' }} required />
                <div className="hint">{body.length}/5000</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" type="submit" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : 'Submit Ticket'}
                </button>
                <button className="btn" type="button" style={{ background: 'var(--muted)' }} onClick={() => { setShowForm(false); setSubject(''); setBody(''); }}>
                  Cancel
                </button>
              </div>
            </form>
          ) : null}

          {loading ? (
            <div className="loading-center"><span className="spinner" /></div>
          ) : tickets.length === 0 ? (
            <div className="empty-state" style={{ padding: 60 }}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} style={{ width: 48, height: 48, color: 'var(--muted)', marginBottom: 12 }}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 12.364l5.657 5.657m-6.364-6.364a3 3 0 11-4.243-4.243 3 3 0 014.243 4.243zm-1.414-7.071a8 8 0 100 16 8 8 0 000-16z" /></svg>
              <h3>No support tickets</h3>
              <p>{isAdmin ? "No tickets from users yet." : "Need help? Create a ticket and our team will assist you."}</p>
            </div>
          ) : (
            <div className="feed">
              {tickets.map(t => (
                <div className="feed-card" key={t.id} onClick={() => setSelected(t)} style={{ cursor: 'pointer' }}>
                  <div className="feed-card-header">
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg fill="none" stroke="var(--blue)" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 22, height: 22 }}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 12.364l5.657 5.657m-6.364-6.364a3 3 0 11-4.243-4.243 3 3 0 014.243 4.243zm-1.414-7.071a8 8 0 100 16 8 8 0 000-16z" /></svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {t.subject}
                        <span className={`badge ${statusBadge[t.status]}`} style={{ fontSize: 10 }}>{statusLabel[t.status] || t.status}</span>
                      </div>
                      <div className="time">
                        {isAdmin && t.user ? `${t.user.profile?.fullName || t.user.email} · ` : ''}
                        {timeAgo(t.createdAt)}
                      </div>
                    </div>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18, color: 'var(--muted)', flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </div>
                  <div className="feed-card-body">
                    <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
