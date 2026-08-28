'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { apiPatch, apiUpload } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    fullName: '', house: '', className: '', positionHeld: '',
    country: '', city: '', profession: '', bio: '', avatarUrl: '', searchable: true,
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.profile) {
      setForm({
        fullName: user.profile.fullName || '',
        house: user.profile.house || '',
        className: user.profile.className || '',
        positionHeld: user.profile.positionHeld || '',
        country: user.profile.country || '',
        city: user.profile.city || '',
        profession: user.profile.profession || '',
        bio: user.profile.bio || '',
        avatarUrl: user.profile.avatarUrl || '',
        searchable: user.profile.searchable,
      });
    }
  }, [user]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const pickFile = () => fileInputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/image\/(jpeg|png|webp|gif)/.test(file.type)) {
      setError('Please choose a JPEG, PNG, WebP or GIF image.');
      return;
    }
    if (file.size > 5_000_000) {
      setError('Image must be under 5MB.');
      return;
    }
    setError('');
    setAvatarPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const { avatarUrl } = await apiUpload<{ avatarUrl: string }>('/profile/avatar', file);
      set('avatarUrl', avatarUrl);
      await refresh();
      setSaved(true);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      setAvatarPreview(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    setLoading(true);
    try {
      await apiPatch('/profile', form);
      await refresh();
      setSaved(true);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;
  const p = user.profile;
  const initials = (p?.fullName || user.email).charAt(0).toUpperCase();
  const firstName = p?.fullName?.split(' ')[0] || 'Alumnus';

  return (
    <div className="app-screen" style={{ background: 'var(--bg)' }}>
      <div className="screen-header">
        <Link href="/dashboard" className="back">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1>My Profile</h1>
      </div>
      <div className="app-scroll">
        <div className="profile-cover">
          <div className="avatar-uploader" onClick={pickFile}>
            {avatarPreview || p?.avatarUrl ? (
              <img src={avatarPreview || p?.avatarUrl || ''} alt="" className="avatar avatar-xl" style={{ objectFit: 'cover', border: 0, padding: 0 }} />
            ) : (
              <div className="avatar avatar-xl">{initials}</div>
            )}
            <div className="avatar-uploader-overlay">
              {uploading ? <span className="spinner" /> : (
                <>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 22, height: 22 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Change Photo</span>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onFileChange} style={{ display: 'none' }} />
          </div>
          <h2 style={{ color: 'white' }}>{p?.fullName || 'Unnamed'}</h2>
          <div style={{ opacity: 0.85, fontSize: 14 }}>{user.email}</div>
          <div className="badges" style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <span className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>{p?.house || '—'}</span>
            {p?.graduationYear && <span className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>Class of {p.graduationYear}</span>}
            {user.verification === 'VERIFIED' ? (
              <span className="badge badge-green">✓ Verified</span>
            ) : (
              <span className="badge badge-amber">Pending</span>
            )}
          </div>
        </div>

        <div className="app-pad">
          {error && <div className="alert alert-error">{error}</div>}
          {saved && <div className="alert alert-success">Profile saved successfully.</div>}
          <form onSubmit={submit}>
            <div className="form-group">
              <label>Full name</label>
              <div className="input-wrap">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 22, height: 22, color: 'var(--blue)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <input type="text" value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Your full name" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>House</label>
                <div className="input-wrap">
                  <input type="text" value={form.house} onChange={e => set('house', e.target.value)} placeholder="e.g. Mensah" />
                </div>
              </div>
              <div className="form-group">
                <label>Year of Graduation</label>
                <div className="input-wrap">
                  <input type="text" value={p?.graduationYear ? String(p.graduationYear) : ''} disabled style={{ color: 'var(--muted)' }} />
                </div>
              </div>
            </div>
            <div className="form-group">
              <label>Profession</label>
              <div className="input-wrap">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 22, height: 22, color: 'var(--blue)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A48.108 48.108 0 0112 21c-2.272 0-4.459-.334-6.512-.955M21 13.255a48.108 48.108 0 00-3.74-9.876" />
                </svg>
                <input type="text" value={form.profession} onChange={e => set('profession', e.target.value)} placeholder="e.g. Engineer" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Country</label>
                <div className="input-wrap">
                  <input type="text" value={form.country} onChange={e => set('country', e.target.value)} placeholder="e.g. Ghana" />
                </div>
              </div>
              <div className="form-group">
                <label>City</label>
                <div className="input-wrap">
                  <input type="text" value={form.city} onChange={e => set('city', e.target.value)} placeholder="e.g. Accra" />
                </div>
              </div>
            </div>
            <div className="form-group">
              <label>Bio</label>
              <textarea className="textarea" value={form.bio} onChange={e => set('bio', e.target.value)} maxLength={1000} placeholder="Tell fellow alumni about yourself..." style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14 }} />
              <div className="hint">{form.bio.length}/1000</div>
            </div>
            <div className="form-group">
              <label>Profile Picture</label>
              <div className="hint">Use the camera button on your avatar above to upload a new photo (JPEG, PNG, WebP or GIF, max 5MB).</div>
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.searchable} onChange={e => set('searchable', e.target.checked)} />
                Visible in alumni directory
              </label>
            </div>
            <button className="btn btn-block" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
