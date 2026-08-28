'use client';

import { useEffect, useState, useRef } from 'react';
import { apiGet, apiPost, apiUpload } from '../../../lib/api';

interface Business { id: string; name: string; category: string; description?: string | null; website?: string | null; phone?: string | null; logoUrl?: string | null; location?: string | null; verified: boolean; _count?: { ads: number }; }

const categories = ['Technology', 'Healthcare', 'Architecture', 'Legal Services', 'Education', 'Finance', 'Real Estate', 'Food & Beverage', 'Fashion', 'Transport', 'Construction', 'Agriculture', 'Media', 'Other'];

export default function BusinessPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'Technology', description: '', website: '', phone: '', location: '' });
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('All');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => { apiGet<Business[]>('/businesses').then(setBusinesses).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(load, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const onImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/image\/(jpeg|png|webp|gif)/.test(file.type)) { setError('Please choose a valid image.'); return; }
    if (file.size > 5_000_000) { setError('Image must be under 5MB.'); return; }
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.category) { setError('Name and category are required'); return; }
    setCreating(true);
    setError('');
    try {
      const business = await apiPost<Business>('/businesses', {
        name: form.name, category: form.category,
        description: form.description || undefined,
        website: form.website || undefined,
        phone: form.phone || undefined,
        location: form.location || undefined,
      });
      if (image) {
        try {
          const { imageUrl } = await apiUpload<{ imageUrl: string }>(`/businesses/${business.id}/image`, image);
          business.logoUrl = imageUrl;
        } catch {}
      }
      setSuccess('Business added! It will be visible once verified by admin.');
      setShowAdd(false);
      setForm({ name: '', category: 'Technology', description: '', website: '', phone: '', location: '' });
      setImage(null); setImagePreview(null);
      load();
    } catch (err: any) { setError(err.message || 'Failed to add business'); } finally { setCreating(false); }
  };

  const filtered = filter === 'All' ? businesses : businesses.filter(b => b.category === filter);
  const usedCategories = ['All', ...Array.from(new Set(businesses.map(b => b.category)))];

  return (
    <div className="app-screen fade-in" style={{ background: 'var(--bg)' }}>
      <div className="screen-header">
        <h1>Business</h1>
      </div>
      <div className="app-scroll">
        <div className="app-pad">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <button className="btn btn-block mb-16" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? 'Cancel' : '+ Add my business'}
          </button>

          {showAdd && (
            <div className="card mb-16" style={{ padding: 16 }}>
              <form onSubmit={create}>
                <div className="form-group">
                  <label>Business Name *</label>
                  <div className="input-wrap"><input type="text" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="e.g. Mensah Tech Solutions" /></div>
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <select className="select" value={form.category} onChange={e => set('category', e.target.value)} style={{ width: '100%' }}>
                    {categories.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea className="textarea" value={form.description} onChange={e => set('description', e.target.value)} placeholder="What does your business do?" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, minHeight: 80 }} />
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <div className="input-wrap"><input type="text" value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Kumasi" /></div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Website</label>
                    <div className="input-wrap"><input type="url" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..." /></div>
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <div className="input-wrap"><input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="024..." /></div>
                  </div>
                </div>
                <div className="form-group">
                  <label>Business Photo</label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden', background: 'var(--blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border)', flexShrink: 0 }}>
                      {imagePreview ? <img src={imagePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: 'var(--muted)', fontSize: 12 }}>No image</span>}
                    </div>
                    <button type="button" className="btn btn-sm" onClick={() => fileRef.current?.click()}>Choose Photo</button>
                    {image && <button type="button" className="btn btn-sm" style={{ background: 'var(--red)', color: 'white' }} onClick={() => { setImage(null); setImagePreview(null); }}>Remove</button>}
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onImageChange} style={{ display: 'none' }} />
                  </div>
                </div>
                <button className="btn btn-block" type="submit" disabled={creating}>
                  {creating ? <span className="spinner" /> : 'Submit for verification'}
                </button>
              </form>
            </div>
          )}

          {/* Category filter */}
          {!loading && businesses.length > 0 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 4, scrollbarWidth: 'none' }}>
              {usedCategories.map(c => (
                <button key={c} onClick={() => setFilter(c)} style={{
                  padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                  background: filter === c ? 'var(--blue)' : 'var(--white)', color: filter === c ? 'white' : 'var(--muted)',
                  border: filter === c ? '1px solid var(--blue)' : '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s',
                }}>{c}</button>
              ))}
            </div>
          )}

          {loading ? <div className="loading-center"><span className="spinner" /></div> : filtered.length === 0 ? (
            <div className="empty-state"><h3>No businesses yet</h3><p>Be the first to add yours.</p></div>
          ) : (
            <div className="feed">
              {filtered.map(b => (
                <div className="feed-card" key={b.id}>
                  {b.logoUrl && (
                    <img src={b.logoUrl} alt="" style={{ width: '100%', height: 160, objectFit: 'cover' }} />
                  )}
                  <div className="feed-card-header">
                    <div style={{ width: 48, height: 48, borderRadius: 12, overflow: 'hidden', background: 'var(--blue)', color: 'white', fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {b.logoUrl ? <img src={b.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (b.name ?? '?').charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {b.name}
                        {b.verified && <span className="badge badge-green" style={{ fontSize: 10 }}>✓ Verified</span>}
                      </div>
                      <div className="time">{b.category}{b.location ? ` · ${b.location}` : ''}</div>
                    </div>
                  </div>
                  {b.description && <div className="feed-card-body"><p>{b.description}</p></div>}
                  <div className="feed-card-actions">
                    {b.website && <a href={b.website} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, color: 'var(--blue)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
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
