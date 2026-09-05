'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth';
import { playBuzzSound } from '../../../../lib/sound';
import Avatar from '../../../../components/Avatar';
import { AvatarWithBadge, RoleBadge, hasRoleBadge } from '../../../../components/RoleBadge';
import { getHouseColor } from '../../../../lib/houseColors';

interface UserProfile {
  id: string;
  email: string;
  role: string;
  verification: string;
  createdAt: string;
  profile: {
    fullName: string;
    nickname?: string | null;
    gender?: string | null;
    graduationYear: number;
    house?: string | null;
    positionHeld?: string | null;
    country?: string | null;
    city?: string | null;
    profession?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
    coverUrl?: string | null;
  } | null;
  memberships: {
    id: string;
    isLeader: boolean;
    title?: string | null;
    yearGroup: { id: string; year: number; name: string; imageUrl?: string | null };
  }[];
  _count: { messages: number };
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const userId = params.userId as string;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [buzzSent, setBuzzSent] = useState(false);
  const [buzzing, setBuzzing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet<UserProfile>(`/users/${userId}/profile`)
      .then(setProfile)
      .catch((e) => setError(e.message || 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, [userId]);

  const sendBuzz = async () => {
    setBuzzing(true);
    try {
      await apiPost(`/dm/${userId}/buzz`);
      playBuzzSound();
      setBuzzSent(true);
      setTimeout(() => setBuzzSent(false), 3000);
    } catch (e: any) {
      setError(e.message || 'Failed to send buzz');
    } finally {
      setBuzzing(false);
    }
  };

  if (loading) {
    return (
      <div className="app-screen" style={{ background: 'var(--bg)' }}>
        <div className="loading-center" style={{ minHeight: '60vh' }}><span className="spinner" /></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="app-screen" style={{ background: 'var(--bg)' }}>
        <div className="screen-header">
          <button onClick={() => router.back()} className="back">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1>Profile</h1>
        </div>
        <div className="empty-state" style={{ marginTop: 40 }}>
          <h3>Profile not found</h3>
          <p>{error || 'This user may not exist or is not searchable.'}</p>
        </div>
      </div>
    );
  }

  const p = profile.profile;
  const displayName = p?.fullName || 'Unnamed';
  const hc = getHouseColor(p?.house);
  const isMe = currentUser?.id === userId;
  const isMamaaa = userId === 'mamaaa-ai-bot';

  return (
    <div className="app-screen" style={{ background: 'var(--bg)' }}>
      {/* Sticky back button - always visible */}
      <button
        onClick={() => router.back()}
        style={{
          position: 'fixed', top: 'calc(env(safe-area-inset-top, 0px) + 12px)', left: 12,
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(0,0,0,0.4)', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 100, color: 'white',
          backdropFilter: 'blur(4px)',
        }}
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 20, height: 20 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="app-scroll" style={{ paddingTop: 0 }}>
        {/* Cover photo */}
        <div style={{
          position: 'relative',
          height: 180,
          background: p?.coverUrl
            ? `url(${p.coverUrl}) center/cover`
            : hc.baseGradient,
        }}>
          {/* House badge on cover */}
          {p?.house && (
            <div style={{
              position: 'absolute', top: 12, right: 12,
              padding: '4px 12px', borderRadius: 20,
              background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)',
              color: 'white', fontSize: 12, fontWeight: 700,
              border: `1px solid ${hc.neon}88`,
              boxShadow: `0 0 8px ${hc.neon}44`,
            }}>
              {p.house}
            </div>
          )}
        </div>

        {/* Avatar + name section */}
        <div style={{
          textAlign: 'center',
          padding: '0 16px 20px',
          marginTop: -55,
          position: 'relative',
          zIndex: 2,
        }}>
          {/* Avatar with neon ring and role badge */}
          <div style={{
            display: 'inline-block',
            position: 'relative',
            marginBottom: 12,
            padding: 4,
            background: 'var(--bg)',
            borderRadius: '50%',
          }}>
            <AvatarWithBadge
              src={p?.avatarUrl}
              name={displayName}
              size={110}
              role={profile.role}
              house={p?.house}
            />
          </div>

          {/* Name with role badge */}
          <h1 style={{
            fontSize: 22, fontWeight: 800, margin: '0 0 4px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            color: 'var(--black)',
          }}>
            {displayName}
            {hasRoleBadge(profile.role) && <RoleBadge role={profile.role} house={p?.house} size="md" />}
          </h1>

          {/* Nickname */}
          {p?.nickname && (
            <div style={{ fontSize: 15, color: 'var(--muted)', marginBottom: 4 }}>@{p.nickname}</div>
          )}

          {/* Profession / tagline */}
          {p?.profession && (
            <div style={{ fontSize: 14, color: 'var(--blue)', fontWeight: 600, marginBottom: 8 }}>
              {p.profession}
            </div>
          )}

          {/* Verification badge */}
          {profile.verification === 'VERIFIED' && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 12, color: 'var(--green, #22C55E)', fontWeight: 700,
              marginBottom: 8,
            }}>
              <svg fill="currentColor" viewBox="0 0 24 24" style={{ width: 16, height: 16 }}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Verified Member
            </div>
          )}

          {/* Quick stats */}
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 24,
            padding: '12px 0', marginBottom: 12,
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--blue)' }}>{profile._count?.messages || 0}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Messages</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--blue)' }}>{profile.memberships?.length || 0}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Year Groups</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--blue)' }}>{p?.graduationYear || '—'}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Class of</div>
            </div>
          </div>

          {/* Action buttons */}
          {!isMe && !isMamaaa && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                onClick={() => router.push(`/dashboard/chat/${userId}`)}
                className="btn"
                style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14 }}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 3v-3z" />
                </svg>
                Message
              </button>
              <button
                onClick={sendBuzz}
                disabled={buzzing}
                className="btn"
                style={{ flex: 1, background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 14 }}
              >
                {buzzing ? <span className="spinner" /> : '🔔 Buzz'}
              </button>
            </div>
          )}
          {!isMe && !isMamaaa && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                onClick={() => router.push(`/dashboard/chat/${userId}?call=audio`)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, color: 'var(--blue)', fontSize: 13, fontWeight: 600, background: 'var(--blue-50)', border: 0, borderRadius: 12, cursor: 'pointer' }}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 16, height: 16 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h1.5a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106a2.25 2.25 0 00-2.239.68l-.665.766c-.283.326-.756.409-1.079.226a11.978 11.978 0 01-4.994-4.994c-.183-.323-.1-.796.226-1.079l.766-.665a2.25 2.25 0 00.68-2.239L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                Voice
              </button>
              <button
                onClick={() => router.push(`/dashboard/chat/${userId}?call=video`)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, color: 'var(--blue)', fontSize: 13, fontWeight: 600, background: 'var(--blue-50)', border: 0, borderRadius: 12, cursor: 'pointer' }}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 16, height: 16 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Video
              </button>
            </div>
          )}
          {isMe && (
            <Link href="/dashboard/profile" className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 14 }}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
              Edit My Profile
            </Link>
          )}

          {buzzSent && (
            <div className="alert alert-success" style={{ marginBottom: 16 }}>
              Buzz sent to {displayName.split(' ')[0]}!
            </div>
          )}
        </div>

        {/* Info card */}
        <div style={{ padding: '0 16px 20px' }}>
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800, color: 'var(--blue)' }}>About</h3>

            {/* Bio */}
            {p?.bio && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>Bio</div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--black)' }}>{p.bio}</p>
              </div>
            )}

            {/* Info rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {p?.graduationYear && (
                <InfoRow icon="M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z M16 7a4 4 0 11-8 0 4 4 0 018 0z" label="Class of" value={`${p.graduationYear}`} />
              )}
              {p?.house && (
                <InfoRow icon="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" label="House" value={p.house} />
              )}
              {p?.positionHeld && (
                <InfoRow icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" label="Position Held" value={p.positionHeld} />
              )}
              {p?.profession && (
                <InfoRow icon="M21 13.255A48.108 48.108 0 0112 21c-2.272 0-4.459-.334-6.512-.955M21 13.255a48.108 48.108 0 00-3.74-9.876M21 13.255c.18 1.078.272 2.183.272 3.295" label="Profession" value={p.profession} />
              )}
              {(p?.city || p?.country) && (
                <InfoRow icon="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" label="Location" value={[p?.city, p?.country].filter(Boolean).join(', ')} />
              )}
              {p?.gender && (
                <InfoRow icon="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" label="Gender" value={p.gender === 'MALE' ? 'Male' : p.gender === 'FEMALE' ? 'Female' : p.gender} />
              )}
              <InfoRow icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" label="Member Since" value={new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })} />
            </div>
          </div>

          {/* Year Groups */}
          {profile.memberships && profile.memberships.length > 0 && (
            <div className="card" style={{ padding: 16, marginTop: 12 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800, color: 'var(--blue)' }}>Year Groups</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {profile.memberships.map((m) => {
                  const mhc = getHouseColor(m.yearGroup.year as any);
                  return (
                    <Link
                      key={m.id}
                      href={`/dashboard/groups/${m.yearGroup.id}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', borderRadius: 12,
                        background: 'var(--bg)', textDecoration: 'none',
                        border: `1px solid ${mhc.neon}33`,
                      }}
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: 10,
                        background: mhc.baseGradient,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 800, fontSize: 13,
                        overflow: 'hidden', flexShrink: 0,
                      }}>
                        {m.yearGroup.imageUrl
                          ? <img src={m.yearGroup.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : m.yearGroup.year}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--black)' }}>{m.yearGroup.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Class of {m.yearGroup.year}</div>
                      </div>
                      {m.isLeader && <span className="badge badge-blue" style={{ fontSize: 10 }}>Leader</span>}
                      {m.title && <span className="badge badge-dark" style={{ fontSize: 10 }}>{m.title}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Role badge info */}
          {hasRoleBadge(profile.role) && (
            <div className="card" style={{ padding: 16, marginTop: 12, textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 800, color: 'var(--blue)' }}>Position</h3>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <RoleBadge role={profile.role} house={p?.house} size="lg" />
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                This member holds an official position within OPASS CONNECT.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: 'var(--blue-50)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <svg fill="none" stroke="var(--blue)" viewBox="0 0 24 24" strokeWidth={1.8} style={{ width: 18, height: 18 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 14, color: 'var(--black)', fontWeight: 600 }}>{value}</div>
      </div>
    </div>
  );
}
