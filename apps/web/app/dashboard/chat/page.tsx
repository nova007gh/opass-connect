'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import Avatar from '../../../components/Avatar';
import { AvatarWithBadge, RoleBadge, hasRoleBadge } from '../../../components/RoleBadge';
import ConnectGlyph from '../../../components/ConnectGlyph';

interface DMConversation {
  user: {
    id: string;
    email: string;
    role?: string;
    profile: {
      fullName: string;
      avatarUrl?: string | null;
      graduationYear?: number | null;
      profession?: string | null;
      house?: string | null;
    } | null;
  };
  lastMessage: string;
  lastAt: string;
}

interface AlumniResult {
  userId: string;
  fullName: string;
  nickname?: string | null;
  graduationYear?: number | null;
  house?: string | null;
  profession?: string | null;
  avatarUrl?: string | null;
  country?: string | null;
  city?: string | null;
  role?: string;
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ChatPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<AlumniResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    apiGet<DMConversation[]>('/dm/conversations')
      .then(setConversations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const results = await apiGet<AlumniResult[]>(`/alumni?search=${encodeURIComponent(q.trim())}&limit=20`);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const onSearchChange = (v: string) => {
    setSearch(v);
    setShowSearch(v.trim().length > 0);
    if (v.trim()) {
      doSearch(v);
    } else {
      setSearchResults([]);
    }
  };

  return (
    <div className="app-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="screen-header" style={{ paddingBottom: 0 }}>
        <h1>Chats</h1>
      </div>

      <div className="app-scroll">
        <div className="app-pad">
          {/* Search bar */}
          <form
            className="home-search"
            style={{ marginBottom: 16 }}
            onSubmit={(e) => { e.preventDefault(); doSearch(search); }}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search alumni to start a chat..."
              style={{ background: 'transparent' }}
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); setShowSearch(false); setSearchResults([]); }}
                style={{ background: 'none', border: 0, padding: 4, color: 'var(--muted)', cursor: 'pointer' }}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </form>

          {/* Chatroom button */}
          <Link
            href="/dashboard/assembly"
            className="fade-in-up"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'linear-gradient(135deg, #0B2D6B 0%, #0051FF 100%)',
              color: 'white',
              borderRadius: 14,
              padding: '14px 16px',
              marginBottom: 16,
              textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(0,81,255,0.25)',
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={1.8} style={{ width: 24, height: 24 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>Chatroom</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Create, join, or search for chat rooms</div>
            </div>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 20, height: 20, opacity: 0.7, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {/* Search results - shown when searching */}
          {showSearch ? (
            <div>
              <div className="section-header" style={{ marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 15, color: 'var(--blue)', fontWeight: 800 }}>
                  Search Results {searching && <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />}
                </h3>
              </div>
              {searchResults.length === 0 && !searching ? (
                <div className="card" style={{ padding: 24, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>🔍</div>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                    No alumni found for &quot;{search}&quot;
                  </p>
                </div>
              ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {searchResults.map((a, i) => (
                    <div
                      key={a.userId}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '12px 14px', textDecoration: 'none',
                        borderBottom: i < searchResults.length - 1 ? '1px solid var(--border)' : 0,
                        cursor: 'pointer',
                      }}
                      onClick={() => router.push(`/dashboard/profile/${a.userId}`)}
                    >
                      <AvatarWithBadge src={a.avatarUrl} name={a.fullName} size={42} role={a.role} house={a.house} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--black)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {a.fullName}
                          {hasRoleBadge(a.role) && <RoleBadge role={a.role} house={a.house} size="sm" />}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {a.graduationYear ? `Class of ${a.graduationYear}` : ''}{a.profession ? ` · ${a.profession}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/profile/${a.userId}`); }}
                          style={{ width: 34, height: 34, borderRadius: '50%', border: 0, background: 'var(--blue-50)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          title="View profile"
                        >
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 16, height: 16 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/chat/${a.userId}`); }}
                          style={{ width: 34, height: 34, borderRadius: '50%', border: 0, background: 'var(--blue-50)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          title="Chat"
                        >
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 16, height: 16 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 3v-3z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Mamaa AI shortcut */}
              <Link
                href="/dashboard/chat/mamaaa-ai-bot"
                className="fade-in-up"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'linear-gradient(135deg, #0B2D6B 0%, #0051FF 100%)',
                  color: 'white', borderRadius: 14, padding: '12px 14px',
                  marginBottom: 16, textDecoration: 'none',
                  boxShadow: '0 2px 12px rgba(0,81,255,0.2)',
                }}
              >
                <div style={{ fontSize: 32, flexShrink: 0 }}>🎓</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>Mamaa AI</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>Ask me anything about OPASS</div>
                </div>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
              </Link>

              {/* Conversations list */}
              <div className="section-header" style={{ marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 15, color: 'var(--blue)', fontWeight: 800 }}>Recent Chats</h3>
              </div>

              {loading ? (
                <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                  <div className="skeleton skeleton-text" style={{ width: '70%', marginBottom: 8 }} />
                  <div className="skeleton skeleton-text sm" style={{ width: '40%' }} />
                </div>
              ) : conversations.length === 0 ? (
                <div className="card" style={{ padding: 24, textAlign: 'center' }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
                  <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
                    No conversations yet.<br />
                    Search for alumni above to start chatting!
                  </p>
                </div>
              ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {conversations.map((c, i) => {
                    const name = c.user.profile?.fullName || c.user.email;
                    const isStickerMsg = c.lastMessage?.startsWith('🎴:');
                    const isCallMsg = c.lastMessage?.startsWith('📞');
                    const preview = isStickerMsg ? '🎨 Sticker' : isCallMsg ? c.lastMessage : (c.lastMessage?.slice(0, 45) || 'No messages');
                    return (
                      <Link
                        key={c.user.id}
                        href={`/dashboard/chat/${c.user.id}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '12px 14px', textDecoration: 'none',
                          borderBottom: i < conversations.length - 1 ? '1px solid var(--border)' : 0,
                        }}
                      >
                        <AvatarWithBadge src={c.user.profile?.avatarUrl} name={name} size={44} role={c.user.role} house={c.user.profile?.house} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--black)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {name}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {preview}
                          </div>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>
                          {timeAgo(c.lastAt)}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
