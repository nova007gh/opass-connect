'use client';

import { useEffect, useState, useRef } from 'react';
import { apiGet, apiPost, apiUpload } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';

interface Project { id: string; title: string; description: string; imageUrl?: string | null; targetAmount: string; raisedAmount: string; status: string; }

export default function ProjectsPage() {
  const { isAdmin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [contributing, setContributing] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);

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
      setTimeout(() => setSuccess(''), 3000);
      setAmount('');
      setAnonymous(false);
      load();
    } catch (err: any) { setError(err.message || 'Contribution failed'); } finally { setContributing(null); }
  };

  const pickImage = (id: string) => { setUploadTarget(id); fileRef.current?.click(); };
  const onImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;
    if (!/image\/(jpeg|png|webp|gif)/.test(file.type)) { setError('Please choose a valid image.'); return; }
    if (file.size > 5_000_000) { setError('Image must be under 5MB.'); return; }
    setError(''); setUploadingId(uploadTarget);
    try {
      const { imageUrl } = await apiUpload<{ imageUrl: string }>(`/projects/${uploadTarget}/image`, file);
      setProjects(prev => prev.map(p => p.id === uploadTarget ? { ...p, imageUrl } : p));
    } catch (err: any) { setError(err.message || 'Upload failed'); }
    finally { setUploadingId(null); setUploadTarget(null); if (fileRef.current) fileRef.current.value = ''; }
  };

  const statusBadge: Record<string, string> = { ACTIVE: 'badge-blue', FUNDED: 'badge-green', IN_PROGRESS: 'badge-amber', COMPLETED: 'badge-gray', DRAFT: 'badge-gray' };

  return (
    <div className="app-screen fade-in" style={{ background: 'var(--bg)' }}>
      <div className="screen-header">
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
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: '12px 12px 0 0' }} />
                    ) : null}
                    <div className="feed-card-header">
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          <svg fill="none" stroke="var(--blue)" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 24, height: 24 }}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                        </div>
                        {isAdmin && (
                          <button onClick={() => pickImage(p.id)} style={{
                            position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: '50%',
                            background: 'var(--blue-bright)', border: '2px solid var(--white)', color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 10, zIndex: 2,
                          }} title="Upload project photo">
                            {uploadingId === p.id ? '...' : '+'}
                          </button>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
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
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onImageChange} style={{ display: 'none' }} />
    </div>
  );
}
