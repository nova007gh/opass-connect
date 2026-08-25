'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '../../../lib/api';

interface Project { id: string; title: string; description: string; targetAmount: string; raisedAmount: string; status: string; }

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [contributing, setContributing] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () => { apiGet<Project[]>('/projects').then(setProjects).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(load, []);

  const contribute = async (id: string) => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    setContributing(id);
    setError('');
    try {
      await apiPost(`/projects/${id}/contribute`, { amount: amt, anonymous });
      setSuccess('Thank you for your contribution!');
      setAmount('');
      setAnonymous(false);
      load();
    } catch (err: any) { setError(err.message || 'Contribution failed'); } finally { setContributing(null); }
  };

  const statusBadge: Record<string, string> = { ACTIVE: 'badge-blue', FUNDED: 'badge-green', IN_PROGRESS: 'badge-amber', COMPLETED: 'badge-gray' };

  return (
    <div className="app-screen" style={{ background: 'var(--bg)' }}>
      <div className="screen-header">
        <Link href="/dashboard" className="back">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1>Projects</h1>
      </div>
      <div className="app-scroll">
        <div className="app-pad">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          {loading ? <div className="loading-center"><span className="spinner" /></div> : projects.length === 0 ? (
            <div className="empty-state"><h3>No active projects</h3><p>Check back later for campaigns.</p></div>
          ) : (
            <div className="feed">
              {projects.map(p => {
                const target = Number(p.targetAmount);
                const raised = Number(p.raisedAmount);
                const pct = target > 0 ? Math.min(100, (raised / target) * 100) : 0;
                return (
                  <div className="feed-card" key={p.id}>
                    <div className="feed-card-header">
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg fill="none" stroke="var(--blue)" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 24, height: 24 }}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="name">{p.title}</div>
                        <div className="time">{pct.toFixed(0)}% funded</div>
                      </div>
                      <span className={`badge ${statusBadge[p.status] || 'badge-gray'}`}>{p.status}</span>
                    </div>
                    <div className="feed-card-body">
                      <p>{p.description}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6 }}>
                        <strong>GHS {raised.toLocaleString()}</strong>
                        <span className="text-muted">of GHS {target.toLocaleString()}</span>
                      </div>
                      <div className="progress"><div className="progress-bar" style={{ width: `${pct}%` }} /></div>
                    </div>
                    <div style={{ padding: '0 16px 16px' }}>
                      <div className="input-wrap" style={{ marginBottom: 8 }}>
                        <span style={{ color: 'var(--muted)', fontWeight: 600 }}>GHS</span>
                        <input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 10, cursor: 'pointer', color: 'var(--muted)' }}>
                        <input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} />
                        Contribute anonymously
                      </label>
                      <button className="btn btn-block btn-sm" onClick={() => contribute(p.id)} disabled={contributing === p.id}>
                        {contributing === p.id ? <span className="spinner" /> : 'Contribute'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
