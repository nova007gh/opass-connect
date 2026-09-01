'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
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
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', description: '', targetAmount: '' });
  const [createImage, setCreateImage] = useState<File | null>(null);
  const [createImagePreview, setCreateImagePreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [payStep, setPayStep] = useState<{ projectId: string; amount: number; phone: string } | null>(null);
  const [phone, setPhone] = useState('');
  const [paying, setPaying] = useState(false);

  const load = () => { apiGet<Project[]>('/projects').then(setProjects).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(load, []);

  const contribute = async (id: string) => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    if (!phone || phone.length < 10) { setError('Enter a valid mobile money number'); return; }
    setContributing(id);
    setError('');
    try {
      await apiPost(`/projects/${id}/contribute`, { amount: amt, anonymous });
      setSuccess('Payment initiated! You will receive a prompt on your phone. Thank you!');
      setTimeout(() => setSuccess(''), 5000);
      setAmount('');
      setAnonymous(false);
      setPhone('');
      setPayStep(null);
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

  const onCreateImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/image\/(jpeg|png|webp|gif)/.test(file.type)) { setError('Please choose a valid image.'); return; }
    if (file.size > 5_000_000) { setError('Image must be under 5MB.'); return; }
    setCreateImage(file);
    setCreateImagePreview(URL.createObjectURL(file));
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title || !createForm.description || !createForm.targetAmount) { setError('Fill all fields'); return; }
    setCreating(true); setError('');
    try {
      const project = await apiPost<Project>('/projects', {
        title: createForm.title,
        description: createForm.description,
        targetAmount: parseFloat(createForm.targetAmount),
      });
      if (createImage) {
        try {
          const { imageUrl } = await apiUpload<{ imageUrl: string }>(`/projects/${project.id}/image`, createImage);
          project.imageUrl = imageUrl;
        } catch {}
      }
      setProjects(prev => [project, ...prev]);
      setCreateForm({ title: '', description: '', targetAmount: '' });
      setCreateImage(null); setCreateImagePreview(null); setShowCreate(false);
      setSuccess('Project created successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { setError(err.message || 'Failed to create project'); }
    finally { setCreating(false); }
  };

  const statusBadge: Record<string, string> = { ACTIVE: 'badge-blue', FUNDED: 'badge-green', IN_PROGRESS: 'badge-amber', COMPLETED: 'badge-gray', DRAFT: 'badge-gray' };

  return (
    <div className="app-screen fade-in" style={{ background: 'var(--bg)' }}>
      <div className="screen-header">
        <Link href="/dashboard" className="back" aria-label="Back">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1>Projects</h1>
      </div>
      <div className="app-scroll">
        <div className="app-pad">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {isAdmin && (
            <>
              <button className="btn btn-block mb-16" onClick={() => setShowCreate(!showCreate)}>
                {showCreate ? 'Cancel' : '+ Create Project'}
              </button>
              {showCreate && (
                <div className="card mb-16" style={{ padding: 16 }}>
                  <form onSubmit={createProject}>
                    <div className="form-group">
                      <label>Project Title *</label>
                      <div className="input-wrap"><input type="text" value={createForm.title} onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Sports Field Upgrade" required /></div>
                    </div>
                    <div className="form-group">
                      <label>Description *</label>
                      <textarea className="textarea" value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the project..." required style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, minHeight: 80 }} />
                    </div>
                    <div className="form-group">
                      <label>Target Amount (GHS) *</label>
                      <div className="input-wrap"><span style={{ color: 'var(--muted)', fontWeight: 600 }}>GHS</span><input type="number" value={createForm.targetAmount} onChange={e => setCreateForm(f => ({ ...f, targetAmount: e.target.value }))} placeholder="e.g. 50000" required min="1" /></div>
                    </div>
                    <div className="form-group">
                      <label>Project Photo</label>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden', background: 'var(--blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border)', flexShrink: 0 }}>
                          {createImagePreview ? <img src={createImagePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: 'var(--muted)', fontSize: 12 }}>No image</span>}
                        </div>
                        <button type="button" className="btn btn-sm" onClick={() => document.getElementById('create-project-image')?.click()}>Choose Photo</button>
                        {createImage && <button type="button" className="btn btn-sm" style={{ background: 'var(--red)', color: 'white' }} onClick={() => { setCreateImage(null); setCreateImagePreview(null); }}>Remove</button>}
                        <input id="create-project-image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onCreateImageChange} style={{ display: 'none' }} />
                      </div>
                    </div>
                    <button className="btn btn-block" type="submit" disabled={creating}>
                      {creating ? <span className="spinner" /> : 'Create Project'}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}

          {loading ? <div className="loading-center"><span className="spinner" /></div> : projects.length === 0 ? (
            <div className="empty-state"><h3>No active projects</h3><p>Check back later for campaigns.</p></div>
          ) : (
            <div className="feed">
              {projects.map(p => {
                const target = Number(p.targetAmount);
                const raised = Number(p.raisedAmount);
                const pct = target > 0 ? Math.min(100, (raised / target) * 100) : 0;
                const isPayStep = payStep?.projectId === p.id;
                return (
                  <div className="feed-card" key={p.id}>
                    {p.imageUrl && (
                      <img src={p.imageUrl} alt="" style={{ width: '100%', height: 180, objectFit: 'cover' }} />
                    )}
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
                    {p.status !== 'FUNDED' && (
                      <div style={{ padding: '0 16px 16px' }}>
                        {!isPayStep ? (
                          <button className="btn btn-block btn-sm" onClick={() => { setPayStep({ projectId: p.id, amount: 0, phone: '' }); setAmount(''); setError(''); }}>
                            Support this Project
                          </button>
                        ) : (
                          <div style={{ background: 'var(--blue-50)', borderRadius: 12, padding: 14 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--blue)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
                              Mobile Money Payment
                            </div>
                            <div className="input-wrap" style={{ marginBottom: 8, background: 'var(--white)', borderRadius: 8 }}>
                              <span style={{ color: 'var(--muted)', fontWeight: 600 }}>GHS</span>
                              <input type="number" placeholder="Enter amount" value={amount} onChange={e => setAmount(e.target.value)} style={{ background: 'transparent' }} />
                            </div>
                            <div className="input-wrap" style={{ marginBottom: 8, background: 'var(--white)', borderRadius: 8 }}>
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18, color: 'var(--blue)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
                              <input type="tel" placeholder="e.g. 0241234567" value={phone} onChange={e => setPhone(e.target.value)} style={{ background: 'transparent' }} />
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 10, cursor: 'pointer', color: 'var(--muted)' }}>
                              <input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} />
                              Contribute anonymously
                            </label>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="btn btn-sm" style={{ flex: 1, background: 'var(--border)' }} onClick={() => { setPayStep(null); setAmount(''); setPhone(''); setError(''); }}>Cancel</button>
                              <button className="btn btn-sm" style={{ flex: 2 }} onClick={() => contribute(p.id)} disabled={contributing === p.id}>
                                {contributing === p.id ? <span className="spinner" /> : 'Pay with Mobile Money'}
                              </button>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, textAlign: 'center' }}>
                              You will receive a prompt on your phone to confirm payment
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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
