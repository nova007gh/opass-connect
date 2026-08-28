'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../../../lib/api';

interface Candidate { id: string; userId: string; position: string; manifesto?: string | null; user?: { profile?: { fullName?: string | null; avatarUrl?: string | null } | null } | null; }
interface Election { id: string; title: string; description?: string | null; status: string; opensAt: string; closesAt: string; yearGroup?: { year: number; name: string } | null; _count: { candidates: number; votes: number }; candidates?: Candidate[]; }
interface VoteResult { candidateId: string; position: string; _count: { _all: number }; }

export default function ElectionsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Election | null>(null);
  const [results, setResults] = useState<VoteResult[] | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [voting, setVoting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () => { apiGet<Election[]>('/elections').then(setElections).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(load, []);

  const openElection = async (e: Election) => {
    setError(''); setSuccess('');
    try {
      const detail = await apiGet<Election & { candidates: Candidate[] }>(`/elections/${e.id}`);
      setSelected(detail);
      setResults(null);
      setHasVoted(false);
      // Try to fetch results to show live counts (works for admins or closed elections)
      try {
        const r = await apiGet<VoteResult[]>(`/elections/${e.id}/results`);
        setResults(r);
      } catch {
        // Results not available - that's ok for open elections
      }
    } catch { setSelected(e); }
  };

  const statusBadge: Record<string, string> = { DRAFT: 'badge-gray', SCHEDULED: 'badge-blue', OPEN: 'badge-green', CLOSED: 'badge-amber', CERTIFIED: 'badge-dark' };

  const vote = async (candidateId: string, position: string) => {
    if (!selected) return;
    setVoting(candidateId);
    setError('');
    setSuccess('');
    try {
      await apiPost(`/elections/${selected.id}/vote`, { candidateId, position });
      setSuccess('Vote cast successfully! Thank you for participating.');
      setHasVoted(true);
      // Refresh results
      try {
        const r = await apiGet<VoteResult[]>(`/elections/${selected.id}/results`);
        setResults(r);
      } catch {}
      // Reload election list to update vote count
      load();
    } catch (err: any) {
      if (err.message?.includes('already voted')) { setHasVoted(true); setError('You have already voted for this position.'); }
      else setError(err.message || 'Voting failed');
    } finally { setVoting(null); }
  };

  const getVoteCount = (candidateId: string) => {
    if (!results) return 0;
    const r = results.find(v => v.candidateId === candidateId);
    return r ? r._count._all : 0;
  };

  const totalVotes = results ? results.reduce((sum, r) => sum + r._count._all, 0) : 0;
  const maxVotes = results ? Math.max(...results.map(r => r._count._all), 0) : 0;

  if (selected) {
    return (
      <div className="app-screen fade-in" style={{ background: 'var(--bg)' }}>
        <div className="screen-header" style={{ position: 'sticky', top: 0 }}>
          <button onClick={() => { setSelected(null); setResults(null); }} className="back">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1>{selected.title}</h1>
        </div>
        <div className="app-scroll">
          <div className="app-pad">
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {/* Election info card */}
            <div className="card mb-16" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span className={`badge ${statusBadge[selected.status]}`}>{selected.status}</span>
                <span className="text-sm" style={{ color: 'var(--muted)' }}>
                  {new Date(selected.opensAt).toLocaleDateString('en-US', { dateStyle: 'medium' })} — {new Date(selected.closesAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                </span>
              </div>
              {selected.description && <p style={{ margin: 0, fontSize: 14, color: 'var(--black)' }}>{selected.description}</p>}
              {selected.yearGroup && (
                <div style={{ marginTop: 8, fontSize: 13, color: 'var(--blue)' }}>
                  Class of {selected.yearGroup.year} · {selected.yearGroup.name}
                </div>
              )}
            </div>

            {/* Statistics card */}
            {results && results.length > 0 && (
              <div className="card mb-16" style={{ padding: 16, background: 'var(--blue-50)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--blue)' }}>{totalVotes}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>Total Votes Cast</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--blue)' }}>{selected.candidates?.length || 0}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>Candidates</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--blue)' }}>{selected._count?.votes ?? totalVotes}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>Participation</div>
                  </div>
                </div>
              </div>
            )}

            {/* Candidates */}
            <div className="text-muted text-sm" style={{ marginBottom: 10, fontWeight: 600 }}>
              Candidates ({selected.candidates?.length || 0})
            </div>
            {(!selected.candidates || selected.candidates.length === 0) ? (
              <div className="empty-state"><h3>No candidates</h3><p>No candidates have registered for this election yet.</p></div>
            ) : (
              <div className="feed">
                {selected.candidates.map(c => {
                  const voteCount = getVoteCount(c.id);
                  const pct = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                  const isLeading = maxVotes > 0 && voteCount === maxVotes && voteCount > 0;
                  const name = c.user?.profile?.fullName || `Candidate ${c.userId.slice(-6)}`;
                  const initials = name.charAt(0).toUpperCase();
                  return (
                    <div className="feed-card" key={c.id} style={{ border: isLeading ? '2px solid var(--green)' : '1px solid var(--border)' }}>
                      <div className="feed-card-header">
                        <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', background: 'var(--blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, flexShrink: 0 }}>
                          {c.user?.profile?.avatarUrl ? <img src={c.user.profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {name}
                            {isLeading && <span className="badge badge-green" style={{ fontSize: 10 }}>Leading</span>}
                          </div>
                          <div className="time">Position: {c.position}</div>
                        </div>
                        {results && (
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--blue)' }}>{voteCount}</div>
                            <div style={{ fontSize: 10, color: 'var(--muted)' }}>votes</div>
                          </div>
                        )}
                      </div>
                      {c.manifesto && (
                        <div className="feed-card-body">
                          <p style={{ color: 'var(--black)', fontSize: 14 }}>{c.manifesto}</p>
                        </div>
                      )}
                      {results && totalVotes > 0 && (
                        <div style={{ padding: '0 16px 12px' }}>
                          <div className="progress" style={{ height: 6 }}>
                            <div className="progress-bar" style={{ width: `${pct}%`, background: isLeading ? 'var(--green)' : 'var(--blue-bright)' }} />
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{pct.toFixed(1)}% of votes</div>
                        </div>
                      )}
                      {selected.status === 'OPEN' && !hasVoted && (
                        <div className="feed-card-actions">
                          <button className="btn btn-block btn-sm" onClick={() => vote(c.id, c.position)} disabled={voting === c.id} style={{ background: 'var(--blue)', color: 'white' }}>
                            {voting === c.id ? <span className="spinner" /> : 'Vote for this candidate'}
                          </button>
                        </div>
                      )}
                      {hasVoted && selected.status === 'OPEN' && (
                        <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--green)', fontWeight: 600, textAlign: 'center', background: 'rgba(16,185,129,0.05)' }}>
                          ✓ You have voted in this election
                        </div>
                      )}
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

  return (
    <div className="app-screen fade-in" style={{ background: 'var(--bg)' }}>
      <div className="screen-header">
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
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: e.status === 'OPEN' ? 'var(--green)' : 'var(--blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg fill="none" stroke={e.status === 'OPEN' ? 'white' : 'var(--blue)'} viewBox="0 0 24 24" strokeWidth={2} style={{ width: 24, height: 24 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="name">{e.title}</div>
                      <div className="time">{e._count?.candidates ?? 0} candidates · {e._count?.votes ?? 0} votes cast</div>
                    </div>
                    <span className={`badge ${statusBadge[e.status]}`}>{e.status}</span>
                  </div>
                  {e.description && <div className="feed-card-body"><p>{e.description}</p></div>}
                  {e.status === 'OPEN' && (
                    <div style={{ padding: '8px 16px', fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>
                      ● Voting open until {new Date(e.closesAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
