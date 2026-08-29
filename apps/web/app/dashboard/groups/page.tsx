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
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ year: '', name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState('');

  const load = () => {
    apiGet<YearGroup[]>('/year-groups')
      .then(setGroups)
      .catch(() => setError('Failed to load year groups'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const year = parseInt(createForm.year, 10);
    if (!year || year < 1960 || year > 2030) { setError('Please enter a valid year between 1960 and 2030'); return; }
    if (!createForm.name.trim()) { setError('Please enter a group name'); return; }
    setCreating(true);
    setError('');
    try {
      const result = await apiPost<YearGroup>('/year-groups', {
        year,
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
      });
      if (result && (result as any).error) {
        setError((result as any).error);
      } else {
        setSuccess('Year group created!');
        setCreateForm({ year: '', name: '', description: '' });
        setShowCreate(false);
        setTimeout(() => setSuccess(''), 4000);
        load();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create year group');
    } finally {
      setCreating(false);
    }
  };

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
        {!showCreate && (
          <button className="btn btn-sm" onClick={() => setShowCreate(true)}>+ Create</button>
        )}
      </div>
      <div className="app-scroll">
        <div className="app-pad">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {showCreate && (
            <form onSubmit={createGroup} className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Create Year Group</h3>
              <div className="form-group">
                <label>Graduation Year</label>
                <div className="input-wrap">
                  <input type="number" value={createForm.year} onChange={e => setCreateForm({ ...createForm, year: e.target.value })} placeholder="e.g. 2012" min={1960} max={2030} required />
                </div>
              </div>
              <div className="form-group">
                <label>Group Name</label>
                <div className="input-wrap">
                  <input type="text" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} placeholder="e.g. Ofori Panin Senior High School Class of 2012" maxLength={100} required />
                </div>
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <textarea className="textarea" value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} placeholder="Add a description for your year group..." maxLength={500} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, minHeight: 80, width: '100%' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" type="submit" disabled={creating}>
                  {creating ? <span className="spinner" /> : 'Create Group'}
                </button>
                <button className="btn" type="button" style={{ background: 'var(--muted)' }} onClick={() => { setShowCreate(false); setCreateForm({ year: '', name: '', description: '' }); setError(''); }}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="loading-center"><span className="spinner" /></div>
          ) : groups.length === 0 ? (
            <div className="empty-state">
              <h3>No year groups yet</h3>
              <p>Be the first to create a year group for your class!</p>
              {!showCreate && <button className="btn" style={{ marginTop: 16 }} onClick={() => setShowCreate(true)}>+ Create Year Group</button>}
            </div>
          ) : (
            <div className="feed">
              {groups.map(yg => {
                const joined = joinedIds.has(yg.id);
                return (
                  <div className="feed-card" key={yg.id}>
                    <div className="feed-card-header">
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--blue)', color: 'white', fontSize: 16, fontWeight: 800, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {yg.imageUrl ? <img src={yg.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (yg.year?.toString() ?? '—').slice(-2)}
                        </div>
                        {isAdmin && (
                          <button onClick={(e) => { e.stopPropagation(); pickImage(yg.id); }} style={{
                            position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: '50%',
                            background: 'var(--blue-bright)', border: '2px solid var(--white)', color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 10, zIndex: 2,
                          }} title="Upload group photo">
                            {uploadingId === yg.id ? '...' : '+'}
                          </button>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="name">Class of {yg.year}</div>
                        <div className="time">{yg.name} · {yg._count?.memberships ?? 0} members</div>
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
