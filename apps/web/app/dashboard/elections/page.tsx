'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '../../../lib/api';

interface Candidate { id: string; userId: string; position: string; manifesto?: string | null; }
interface Election { id: string; title: string; description?: string | null; status: string; opensAt: string; closesAt: string; yearGroup?: { year: number; name: string } | null; _count: { candidates: number; votes: number }; candidates?: Candidate[]; }
interface VoteResult { candidateId: string; position: string; _count: { _all: number }; }

export default function ElectionsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Election | null>(null);
  const [results, setResults] = useState<VoteResult[] | null>(null);
  const [voting, setVoting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () => { apiGet<Election[]>('/elections').then(setElections).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(load, []);

  const openElection = async (e: Election) => {
    try { const detail = await apiGet<Election & { candidates: Candidate[] }>(`/elections/${e.id}`); setSelected(detail); setResults(null); } catch { setSelected(e); }
  };

  const statusBadge: Record<string, string> = { DRAFT: 'badge-gray', SCHEDULED: 'badge-blue', OPEN: 'badge-green', CLOSED: 'badge-amber', CERTIFIED: 'badge-dark' };

  const vote = async (candidateId: string, position: string) => {
    if (!selected) return;
    setVoting(candidateId);
    setError('');
    setSuccess('');
    try { await apiPost(`/elections/${selected.id}/vote`, { candidateId, position }); setSuccess('Vote cast successfully!'); } catch (err: any) { setError(err.message || 'Voting failed'); } finally { setVoting(null); }
  };

  const viewResults = async () => {
    if (!selected) return;
    try { const r = await apiGet<VoteResult[]>(`/elections/${selected.id}/results`); setResults(r); } catch (err: any) { setError(err.message || 'Results not available'); }
  };

  if (selected) {
    return (
      <div className="app-screen" style={{ background: 'var(--bg)' }}>
        <div className="screen-header">
          <button onClick={() => { setSelected(null); setResults(null); }} className="back">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1>{selected.title}</h1>
        </div>
        <div className="app-scroll">
          <div className="app-pad">
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}
            <div className="card mb-16">
              <div className="flex-between">
                <div className="text-sm text-muted">
                  {new Date(selected.opensAt).toLocaleDateString()} — {new Date(selected.closesAt).toLocaleDateString()}
                </div>
                <span className={`badge ${statusBadge[selected.status]}`}>{selected.status}</span>
              </div>
            </div>
            {results ? (
              <div className="card">
                <h3>Results</h3>
                {results.length === 0 ? <div className="empty-state"><p>No votes recorded.</p></div> : results.map((r, i) => (
                  <div className="list-item" key={i}>
                    <div>
                      <div style={{ fontWeight: 700 }}>Candidate {r.candidateId.slice(-6)}</div>
                      <div className="text-muted text-sm">{r.position}</div>
                    </div>
                    <strong style={{ fontSize: 18, color: 'var(--blue)' }}>{r._count._all}</strong>
                  </div>
                ))}
                <button className="btn btn-outline mt-16" onClick={() => setResults(null)}>Back to candidates</button>
              </div>
            ) : (
              <div className="card">
                <h3>Candidates ({selected.candidates?.length || 0})</h3>
                {(!selected.candidates || selected.candidates.length === 0) ? (
                  <div className="empty-state"><p>No candidates registered.</p></div>
                ) : selected.candidates.map(c => (
                  <div className="list-item" key={c.id}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>Candidate {c.userId.slice(-6)}</div>
                      <div className="text-muted text-sm">Position: {c.position}</div>
                      {c.manifesto && <div className="text-sm" style={{ marginTop: 4, color: '#374151' }}>{c.manifesto}</div>}
                    </div>
                    {selected.status === 'OPEN' && (
                      <button className="btn btn-sm btn-success" onClick={() => vote(c.id, c.position)} disabled={voting === c.id}>
                        {voting === c.id ? <span className="spinner" /> : 'Vote'}
                      </button>
                    )}
                  </div>
                ))}
                {(selected.status === 'CLOSED' || selected.status === 'CERTIFIED') && (
                  <button className="btn btn-outline mt-16" onClick={viewResults}>View results</button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-screen" style={{ background: 'var(--bg)' }}>
      <div className="screen-header">
        <Link href="/dashboard" className="back">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1>Elections</h1>
      </div>
      <div className="app-scroll">
        <div className="app-pad">
          {error && <div className="alert alert-error">{error}</div>}
          {loading ? <div className="loading-center"><span className="spinner" /></div> : elections.length === 0 ? (
            <div className="empty-state"><h3>No active elections</h3><p>When elections are scheduled, they will appear here.</p></div>
          ) : (
            <div className="feed">
              {elections.map(e => (
                <div className="feed-card" key={e.id} onClick={() => openElection(e)} style={{ cursor: 'pointer' }}>
                  <div className="feed-card-header">
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: e.status === 'OPEN' ? 'var(--green)' : 'var(--blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg fill="none" stroke={e.status === 'OPEN' ? 'white' : 'var(--blue)'} viewBox="0 0 24 24" strokeWidth={2} style={{ width: 24, height: 24 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="name">{e.title}</div>
                      <div className="time">{e._count.candidates} candidates · {e._count.votes} votes</div>
                    </div>
                    <span className={`badge ${statusBadge[e.status]}`}>{e.status}</span>
                  </div>
                  {e.description && <div className="feed-card-body"><p>{e.description}</p></div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
