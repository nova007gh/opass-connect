'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { apiPatch, apiUpload } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import Avatar from '../../../components/Avatar';

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    fullName: '', nickname: '', gender: '', graduationYear: '', house: '', className: '', positionHeld: '',
    country: '', city: '', profession: '', bio: '', avatarUrl: '', searchable: true,
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.profile) {
      setForm({
        fullName: user.profile.fullName || '',
        nickname: user.profile.nickname || '',
        gender: user.profile.gender || '',
        graduationYear: user.profile.graduationYear ? String(user.profile.graduationYear) : '',
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
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      setAvatarPreview(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const pickCover = () => coverInputRef.current?.click();

  const onCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setCoverPreview(URL.createObjectURL(file));
    setUploadingCover(true);
    try {
      const { coverUrl } = await apiUpload<{ coverUrl: string }>('/profile/cover', file);
      await refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Cover upload failed');
      setCoverPreview(null);
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    setLoading(true);
    try {
      const payload: any = { ...form };
      if (payload.graduationYear) payload.graduationYear = parseInt(payload.graduationYear, 10);
      else delete payload.graduationYear;
      if (!payload.gender) delete payload.gender;
      await apiPatch('/profile', payload);
      await refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;
  const p = user.profile;

  return (
    <div className="app-screen fade-in" style={{ background: 'var(--bg)' }}>
      <div className="screen-header">
        <Link href="/dashboard" className="back" aria-label="Back">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1>My Profile</h1>
      </div>
      <div className="app-scroll">
        <div className="profile-cover" style={{ position: 'relative', overflow: 'hidden' }}>
          {/* Cover background photo */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            {coverPreview || p?.coverUrl ? (
              <img src={coverPreview || p?.coverUrl || ''} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0B2D6B 0%, #0051FF 100%)' }} />
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.5) 100%)' }} />
          </div>

          {/* Cover upload button */}
          <button
            onClick={pickCover}
            style={{
              position: 'absolute', top: 12, right: 12, zIndex: 2,
              background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none',
              borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              backdropFilter: 'blur(4px)',
            }}
          >
            {uploadingCover ? <span className="spinner" style={{ width: 14, height: 14 }} /> : (
              <>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 16, height: 16 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 3.75v16.5a2.25 2.25 0 002.25 2.25h12a2.25 2.25 0 002.25-2.25V3.75m-18 0h18m-18 0L9 9m9.75-5.25L15 9" />
                </svg>
                {p?.coverUrl ? 'Change Cover' : 'Add Cover'}
              </>
            )}
          </button>
          <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onCoverChange} style={{ display: 'none' }} />

          <div className="avatar-uploader" style={{ position: 'relative', zIndex: 1 }} onClick={pickFile}>
            {avatarPreview || p?.avatarUrl ? (
              <img src={avatarPreview || p?.avatarUrl || ''} alt="" className="avatar avatar-xl" style={{ objectFit: 'cover', border: 0, padding: 0, width: '100%', height: '100%' }} />
            ) : (
              <Avatar src={null} name={p?.fullName || user.email} size={120} rounded={false} style={{ width: '100%', height: '100%' }} />
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
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>{p?.fullName || 'Unnamed'}</h2>
            {p?.nickname && <div style={{ opacity: 0.9, fontSize: 14, marginTop: 2 }}>@{p.nickname}</div>}
            <div style={{ opacity: 0.8, fontSize: 13, marginTop: 2 }}>{user.email}</div>
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
        </div>

        <div className="app-pad" style={{ paddingTop: 20 }}>
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
            <div className="form-group">
              <label>Nickname</label>
              <div className="input-wrap">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 22, height: 22, color: 'var(--blue)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                <input type="text" value={form.nickname} onChange={e => set('nickname', e.target.value)} placeholder="e.g. POPASSION" />
              </div>
              <div className="hint">Your unique nickname on OPASS CONNECT.</div>
            </div>
            <div className="form-group">
              <label>Gender</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => set('gender', 'MALE')}
                  className={`picker-tile ${form.gender === 'MALE' ? 'active' : ''}`}
                  style={{ flex: 1, padding: '12px 0' }}
                >
                  Male
                </button>
                <button
                  type="button"
                  onClick={() => set('gender', 'FEMALE')}
                  className={`picker-tile ${form.gender === 'FEMALE' ? 'active' : ''}`}
                  style={{ flex: 1, padding: '12px 0' }}
                >
                  Female
                </button>
              </div>
              <div className="hint">Mamaaa AI will address you as {form.gender === 'FEMALE' ? '"Obaa Panin"' : '"Opanin"'} based on this.</div>
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
                  <input type="number" value={form.graduationYear} onChange={e => set('graduationYear', e.target.value)} placeholder="e.g. 2006" min="1960" max="2030" />
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
              <textarea className="textarea" value={form.bio} onChange={e => set('bio', e.target.value)} maxLength={1000} placeholder="Tell fellow alumni about yourself..." style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, minHeight: 100 }} />
              <div className="hint">{form.bio.length}/1000</div>
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.searchable} onChange={e => set('searchable', e.target.checked)} />
                Visible in alumni directory
              </label>
            </div>
            <button className="btn btn-block" type="submit" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? <span className="spinner" /> : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
