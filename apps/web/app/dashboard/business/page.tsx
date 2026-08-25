'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '../../../lib/api';

interface Business { id: string; name: string; category: string; description?: string | null; website?: string | null; phone?: string | null; logoUrl?: string | null; verified: boolean; }

export default function BusinessPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', description: '', website: '', phone: '', logoUrl: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () => { apiGet<Business[]>('/businesses').then(setBusinesses).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(load, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await apiPost('/businesses', { name: form.name, category: form.category, description: form.description || undefined, website: form.website || undefined, phone: form.phone || undefined, logoUrl: form.logoUrl || undefined });
      setSuccess('Business added! It will be visible once verified.');
      setShowAdd(false);
      setForm({ name: '', category: '', description: '', website: '', phone: '', logoUrl: '' });
      load();
    } catch (err: any) { setError(err.message || 'Failed to add business'); } finally { setCreating(false); }
  };

  return (
    <div className="app-screen" style={{ background: 'var(--bg)' }}>
      <div className="screen-header">
        <Link href="/dashboard" className="back">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1>Business</h1>
      </div>
      <div className="app-scroll">
        <div className="app-pad">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <button className="btn btn-block mb-16" onClick={() => setShowAdd(!showAdd)}>Add my business</button>
          {showAdd && (
            <div className="card mb-16">
              <form onSubmit={create}>
                <div className="form-group">
                  <label>Business name *</label>
                  <div className="input-wrap"><input type="text" value={form.name} onChange={e => set('name', e.target.value)} required /></div>
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <div className="input-wrap"><input type="text" value={form.category} onChange={e => set('category', e.target.value)} required placeholder="e.g. Technology" /></div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea className="textarea" value={form.description} onChange={e => set('description', e.target.value)} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14 }} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Website</label>
                    <div className="input-wrap"><input type="text" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..." /></div>
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <div className="input-wrap"><input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
                  </div>
                </div>
                <button className="btn btn-block" type="submit" disabled={creating}>
                  {creating ? <span className="spinner" /> : 'Submit for verification'}
                </button>
              </form>
            </div>
          )}
          {loading ? <div className="loading-center"><span className="spinner" /></div> : businesses.length === 0 ? (
            <div className="empty-state"><h3>No businesses yet</h3><p>Be the first to add yours.</p></div>
          ) : (
            <div className="feed">
              {businesses.map(b => (
                <div className="feed-card" key={b.id}>
                  <div className="feed-card-header">
                    {b.logoUrl ? (
                      <img src={b.logoUrl} alt="" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover' }} />
                    ) : (
                      <div className="avatar" style={{ width: 48, height: 48, background: 'var(--blue)', color: 'white', fontSize: 20, fontWeight: 800 }}>{b.name.charAt(0)}</div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div className="name">{b.name}</div>
                      <div className="time">{b.category}</div>
                    </div>
                    {b.verified && <span className="badge badge-green">✓ Verified</span>}
                  </div>
                  {b.description && <div className="feed-card-body"><p>{b.description}</p></div>}
                  <div className="feed-card-actions">
                    {b.website && <a href={b.website} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, color: 'var(--blue)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                      Visit
                    </a>}
                    {b.phone && <a href={`tel:${b.phone}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, color: 'var(--blue)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.289a12.35 12.35 0 005.256 5.256l1.289-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                      Call
                    </a>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
