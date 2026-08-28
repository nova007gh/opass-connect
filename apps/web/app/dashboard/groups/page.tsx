'use client';

import { useEffect, useState, useRef } from 'react';
import { apiGet, apiPost, apiUpload } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';

interface YearGroup { id: string; year: number; name: string; description?: string | null; imageUrl?: string | null; _count: { memberships: number } }

export default function YearGroupsPage() {
  const { user, refresh, isAdmin } = useAuth();
  const [groups, setGroups] = useState<YearGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);

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

  const pickImage = (id: string) => {
    setUploadTargetId(id);
    fileInputRef.current?.click();
  };

  const onImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetId) return;
    if (!/image\/(jpeg|png|webp|gif)/.test(file.type)) { setError('Please choose a valid image.'); return; }
    if (file.size > 5_000_000) { setError('Image must be under 5MB.'); return; }
    setError('');
    setUploadingId(uploadTargetId);
    try {
      const { imageUrl } = await apiUpload<{ imageUrl: string }>(`/year-groups/${uploadTargetId}/image`, file);
      setGroups(prev => prev.map(g => g.id === uploadTargetId ? { ...g, imageUrl } : g));
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploadingId(null);
      setUploadTargetId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="app-screen fade-in" style={{ background: 'var(--bg)' }}>
      <div className="screen-header">
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
                      <div className="avatar" style={{ width: 52, height: 52, background: 'var(--blue)', color: 'white', fontSize: 16, fontWeight: 800, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                        {yg.imageUrl ? <img src={yg.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : yg.year.toString().slice(-2)}
                        {isAdmin && (
                          <button onClick={(e) => { e.stopPropagation(); pickImage(yg.id); }} style={{
                            position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: '50%',
                            background: 'var(--blue-bright)', border: '2px solid var(--white)', color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 10,
                          }} title="Upload group photo">
                            {uploadingId === yg.id ? '...' : '+'}
                          </button>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
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
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onImageChange} style={{ display: 'none' }} />
    </div>
  );
}
