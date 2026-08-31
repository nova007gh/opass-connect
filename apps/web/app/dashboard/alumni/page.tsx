'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiGet, apiPost } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { playBuzzSound } from '../../../lib/sound';
import Avatar from '../../../components/Avatar';

interface Alumni {
  userId: string;
  fullName: string;
  nickname?: string | null;
  graduationYear: number;
  house?: string | null;
  country?: string | null;
  city?: string | null;
  profession?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
}

export default function AlumniPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [results, setResults] = useState<Alumni[]>([]);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [year, setYear] = useState('');
  const [house, setHouse] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Profile preview modal
  const [profile, setProfile] = useState<Alumni | null>(null);
  const [buzzSent, setBuzzSent] = useState(false);
  const [buzzing, setBuzzing] = useState(false);
  const [buzzError, setBuzzError] = useState('');

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

  // Debounced live search: update results as the user types (single result list, no dropdown)
  useEffect(() => {
    const q = search.trim();
    if (!q) { return; }
    const timer = setTimeout(() => {
      searchAlumni({ search: q });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const openProfile = (a: Alumni) => {
    setBuzzSent(false);
    setBuzzError('');
    setProfile(a);
  };

  const sendBuzz = async () => {
    if (!profile) return;
    setBuzzing(true);
    setBuzzError('');
    try {
      await apiPost(`/dm/${profile.userId}/buzz`);
      playBuzzSound();
      setBuzzSent(true);
      setTimeout(() => setBuzzSent(false), 3000);
    } catch (err: any) {
      setBuzzError(err.message || 'Failed to send buzz');
    } finally {
      setBuzzing(false);
    }
  };

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
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Start typing a classmate's name..."
                onKeyDown={e => e.key === 'Enter' && searchAlumni()}
              />
              {loading && <span className="spinner" style={{ width: 16, height: 16 }} />}
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
                {results.map(a => {
                  const isMe = a.userId === user?.id;
                  return (
                    <div
                      className="feed-card"
                      key={a.userId}
                      onClick={() => { if (!isMe) openProfile(a); }}
                      style={{ cursor: isMe ? 'default' : 'pointer' }}
                    >
                      <div className="feed-card-header">
                        <Avatar src={a.avatarUrl} name={a.fullName} size={48} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="name">{a.fullName}</div>
                          <div className="time">Class of {a.graduationYear}{a.house ? ` · ${a.house}` : ''}</div>
                        </div>
                        {isMe ? (
                          <span className="badge badge-dark" style={{ fontSize: 10 }}>You</span>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/chat/${a.userId}`); }}
                            style={{ flexShrink: 0, width: 38, height: 38, borderRadius: '50%', border: 0, background: 'var(--blue-50)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            title="Chat"
                          >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 20, height: 20 }}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 3v-3z" /></svg>
                          </button>
                        )}
                      </div>
                      {(a.profession || a.city || a.country) && (
                        <div className="feed-card-body">
                          {a.profession && <p>💼 {a.profession}</p>}
                          {(a.city || a.country) && <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14 }}>📍 {[a.city, a.country].filter(Boolean).join(', ')}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Profile preview modal */}
      {profile && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 300, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(2px)' }}
          onClick={() => setProfile(null)}
        >
          <div
            className="card"
            style={{ width: '100%', borderRadius: '24px 24px 0 0', padding: '28px 24px 32px', animation: 'slideUp 0.25s ease-out' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />

            <div style={{ textAlign: 'center' }}>
              <div style={{ margin: '0 auto 14px', boxShadow: '0 8px 24px rgba(37,99,235,0.25)' }}>
                <Avatar src={profile.avatarUrl} name={profile.fullName} size={96} />
              </div>
              <h2 style={{ margin: '0 0 4px', fontSize: 20 }}>{profile.fullName}</h2>
              {profile.nickname && <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 4 }}>@{profile.nickname}</div>}
              <div className="text-muted text-sm" style={{ marginBottom: 10 }}>
                Class of {profile.graduationYear}{profile.house ? ` · ${profile.house}` : ''}
              </div>
              {profile.profession && <div style={{ fontSize: 14, marginBottom: 4 }}>💼 {profile.profession}</div>}
              {(profile.city || profile.country) && <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 4 }}>📍 {[profile.city, profile.country].filter(Boolean).join(', ')}</div>}
              {profile.bio && <p style={{ fontSize: 13, color: '#374151', marginTop: 12, lineHeight: 1.5 }}>{profile.bio}</p>}
            </div>

            {buzzError && <div className="alert alert-error" style={{ marginTop: 16 }}>{buzzError}</div>}
            {buzzSent && <div className="alert alert-success" style={{ marginTop: 16 }}>🔔 Buzz sent to {profile.fullName.split(' ')[0]}!</div>}

            <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
              <button
                onClick={() => router.push(`/dashboard/chat/${profile.userId}`)}
                className="btn"
                style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 15 }}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 20, height: 20 }}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 3v-3z" /></svg>
                Chat
              </button>
              <button
                onClick={sendBuzz}
                disabled={buzzing}
                className="btn"
                style={{ flex: 1, background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 15 }}
                title="Send a friendly buzz to get their attention"
              >
                {buzzing ? <span className="spinner" /> : (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 20, height: 20 }}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
                )}
                Buzz
              </button>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
              <button
                onClick={() => router.push(`/dashboard/chat/${profile.userId}?call=audio`)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, color: 'var(--blue)', fontSize: 13, fontWeight: 600, background: 'var(--blue-50)', border: 0, borderRadius: 12, cursor: 'pointer' }}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 16, height: 16 }}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h1.5a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106a2.25 2.25 0 00-2.239.68l-.665.766c-.283.326-.756.409-1.079.226a11.978 11.978 0 01-4.994-4.994c-.183-.323-.1-.796.226-1.079l.766-.665a2.25 2.25 0 00.68-2.239L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                Voice Call
              </button>
              <button
                onClick={() => router.push(`/dashboard/chat/${profile.userId}?call=video`)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, color: 'var(--blue)', fontSize: 13, fontWeight: 600, background: 'var(--blue-50)', border: 0, borderRadius: 12, cursor: 'pointer' }}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 16, height: 16 }}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
                Video Call
              </button>
            </div>

            <button className="btn" style={{ marginTop: 14, background: 'var(--muted)' }} onClick={() => setProfile(null)}>Close</button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(24px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
