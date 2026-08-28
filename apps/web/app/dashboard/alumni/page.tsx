'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiGet } from '../../../lib/api';

interface Alumni {
  userId: string;
  fullName: string;
  graduationYear: number;
  house?: string | null;
  country?: string | null;
  city?: string | null;
  profession?: string | null;
  avatarUrl?: string | null;
}

export default function AlumniPage() {
  const searchParams = useSearchParams();
  const [results, setResults] = useState<Alumni[]>([]);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [year, setYear] = useState('');
  const [house, setHouse] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const searchAlumni = async (overrides?: { search?: string }) => {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      const q = overrides?.search ?? search;
      if (q) params.set('search', q);
      if (year) params.set('year', year);
      if (house) params.set('house', house);
      const data = await apiGet<Alumni[]>(`/alumni?${params.toString()}`);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { searchAlumni({ search: searchParams.get('search') || '' }); }, []);

  return (
    <div className="app-screen fade-in" style={{ background: 'var(--bg)' }}>
      <div className="screen-header">
        <h1>Alumni Directory</h1>
      </div>
      <div className="app-scroll">
        <div className="app-pad">
          {/* Search bar */}
          <div className="card" style={{ marginBottom: 16, padding: 16 }}>
            <div className="input-wrap" style={{ marginBottom: 10 }}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 20, height: 20, color: 'var(--blue)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name..." onKeyDown={e => e.key === 'Enter' && searchAlumni()} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input className="input" type="number" value={year} onChange={e => setYear(e.target.value)} placeholder="Year" style={{ flex: 1, marginBottom: 0 }} onKeyDown={e => e.key === 'Enter' && searchAlumni()} />
              <input className="input" value={house} onChange={e => setHouse(e.target.value)} placeholder="House" style={{ flex: 1, marginBottom: 0 }} onKeyDown={e => e.key === 'Enter' && searchAlumni()} />
            </div>
            <button className="btn btn-block btn-sm" onClick={() => searchAlumni()} disabled={loading}>
              {loading ? <span className="spinner" /> : 'Search'}
            </button>
          </div>

          {/* Results */}
          {searched && !loading && results.length === 0 ? (
            <div className="empty-state"><h3>No alumni found</h3><p>Try adjusting your search.</p></div>
          ) : loading ? (
            <div className="loading-center"><span className="spinner" /></div>
          ) : (
            <>
              <div className="text-muted text-sm" style={{ marginBottom: 12, padding: '0 4px' }}>
                {results.length} {results.length === 1 ? 'alumnus' : 'alumni'} found
              </div>
              <div className="feed">
                {results.map(a => (
                  <div className="feed-card" key={a.userId}>
                    <div className="feed-card-header">
                      <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800 }}>
                        {a.avatarUrl ? <img src={a.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : a.fullName.charAt(0)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="name">{a.fullName}</div>
                        <div className="time">Class of {a.graduationYear}{a.house ? ` · ${a.house}` : ''}</div>
                      </div>
                    </div>
                    {(a.profession || a.city || a.country) && (
                      <div className="feed-card-body">
                        {a.profession && <p>💼 {a.profession}</p>}
                        {(a.city || a.country) && <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14 }}>📍 {[a.city, a.country].filter(Boolean).join(', ')}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
