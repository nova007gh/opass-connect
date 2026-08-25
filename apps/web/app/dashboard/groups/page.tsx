'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';

interface YearGroup { id: string; year: number; name: string; description?: string | null; _count: { memberships: number } }

export default function YearGroupsPage() {
  const { user, refresh } = useAuth();
  const [groups, setGroups] = useState<YearGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    apiGet<YearGroup[]>('/year-groups')
      .then(setGroups)
      .catch(() => setError('Failed to load year groups'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const joinedIds = new Set(user?.memberships?.map(m => m.yearGroupId) || []);

  const join = async (id: string) => {
    setJoining(id);
    setError('');
    try {
      await apiPost(`/year-groups/${id}/join`);
      await refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to join group');
    } finally {
      setJoining(null);
    }
  };

  return (
    <div className="app-screen" style={{ background: 'var(--bg)' }}>
      <div className="screen-header">
        <Link href="/dashboard" className="back">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1>Year Groups</h1>
      </div>
      <div className="app-scroll">
        <div className="app-pad">
          {error && <div className="alert alert-error">{error}</div>}
          {loading ? (
            <div className="loading-center"><span className="spinner" /></div>
          ) : groups.length === 0 ? (
            <div className="empty-state"><h3>No year groups yet</h3><p>Year groups are created by administrators.</p></div>
          ) : (
            <div className="feed">
              {groups.map(yg => {
                const joined = joinedIds.has(yg.id);
                return (
                  <div className="feed-card" key={yg.id}>
                    <div className="feed-card-header">
                      <div className="avatar" style={{ width: 48, height: 48, background: 'var(--blue)', color: 'white', fontSize: 16, fontWeight: 800 }}>
                        {yg.year.toString().slice(-2)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="name">Class of {yg.year}</div>
                        <div className="time">{yg.name} · {yg._count.memberships} members</div>
                      </div>
                      {joined ? (
                        <span className="badge badge-green">✓ Joined</span>
                      ) : (
                        <button className="btn btn-sm" onClick={() => join(yg.id)} disabled={joining === yg.id}>
                          {joining === yg.id ? <span className="spinner" /> : 'Join'}
                        </button>
                      )}
                    </div>
                    {yg.description && (
                      <div className="feed-card-body">
                        <p>{yg.description}</p>
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
