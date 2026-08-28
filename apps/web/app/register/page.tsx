'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiPatch, apiPost, apiUpload, setToken } from '../../lib/api';
import { useAuth } from '../../lib/auth';

const HOUSES = ['Mensah House', 'Danso House', 'Brew House', 'Gedi House', 'Andoh House'];

export default function RegisterPage() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '',
    graduationYear: '', house: '', positionHeld: '', country: 'Ghana', city: '', profession: '', bio: '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) router.replace('/dashboard'); }, [user, router]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const validateStep1 = () => {
    if (!form.fullName.trim()) return 'Full name is required.';
    if (!form.email.trim()) return 'Email is required.';
    if (form.password.length < 10) return 'Password must be at least 10 characters.';
    return '';
  };

  const next = () => {
    setError('');
    if (step === 1) {
      const err = validateStep1();
      if (err) return setError(err);
    }
    if (step === 2 && !form.graduationYear) return setError('Please select your year group.');
    if (step === 3 && !form.house) return setError('Please select your house.');
    setStep(s => Math.min(totalSteps, s + 1));
  };

  const back = () => { setError(''); setStep(s => s - 1); };

  const pickFile = () => fileInputRef.current?.click();
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/image\/(jpeg|png|webp|gif)/.test(file.type)) return setError('Please choose a JPEG, PNG, WebP or GIF image.');
    if (file.size > 5_000_000) return setError('Image must be under 5MB.');
    setError('');
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const years = Array.from({ length: new Date().getFullYear() - 1954 }, (_, i) => 1955 + i).reverse();

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiPost<{ token: string }>('/auth/register', {
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
        fullName: form.fullName,
        graduationYear: parseInt(form.graduationYear, 10),
        house: form.house || undefined,
        positionHeld: form.positionHeld || undefined,
        country: form.country || undefined,
        city: form.city || undefined,
      });
      setToken(data.token);
      if (form.profession) {
        await apiPatch('/profile', { profession: form.profession }).catch(() => {});
      }
      if (avatarFile) {
        await apiUpload('/profile/avatar', avatarFile).catch(() => {});
      }
      await refresh();
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<number, { title: string; subtitle: string }> = {
    1: { title: 'Create Account', subtitle: 'Join the OPASS Alumni Network.' },
    2: { title: 'Select Your Year Group', subtitle: 'Choose your graduation year.' },
    3: { title: 'Select Your House', subtitle: 'Which house did you belong to?' },
    4: { title: 'Complete Your Profile', subtitle: 'Tell us a bit more about yourself.' },
  };

  return (
    <div className="auth-screen">
      <div className="auth-header">
        {step === 1 ? (
          <Link href="/" className="back" style={{ color: 'var(--blue)' }}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 26, height: 26 }}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </Link>
        ) : (
          <button onClick={back} className="back" style={{ color: 'var(--blue)', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 26, height: 26 }}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
        )}
        <Link href="/login" style={{ fontWeight: 600, color: 'var(--blue)' }}>Sign in</Link>
      </div>
      <div className="auth-body" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="step-dots" style={{ justifyContent: 'flex-start' }}>
          {Array.from({ length: totalSteps }, (_, i) => <div key={i} className={`step-dot ${i + 1 === step ? 'active' : ''}`} />)}
        </div>
        <h1>{titles[step].title}</h1>
        <p className="sub">{titles[step].subtitle}</p>
        {error && <div className="alert alert-error">{error}</div>}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div className="form-group">
              <label>Full name</label>
              <div className="input-wrap">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 22, height: 22, color: 'var(--blue)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <input type="text" value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Enter your full name" />
              </div>
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <div className="input-wrap">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 22, height: 22, color: 'var(--blue)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="Enter your email" />
              </div>
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <div className="input-wrap" style={{ gap: 12 }}>
                <span style={{ fontSize: 20 }}>🇬🇭</span>
                <span className="prefix">+233</span>
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Enter your phone" />
              </div>
            </div>
            <div className="form-group">
              <label>Password</label>
              <div className="input-wrap">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 22, height: 22, color: 'var(--blue)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Minimum 10 characters" />
              </div>
              <div className="hint">Password must be at least 10 characters long.</div>
            </div>
            <div style={{ marginTop: 'auto', paddingBottom: 24 }}>
              <button className="btn btn-block" type="button" onClick={next}>Get Started</button>
              <div className="switch mt-16" style={{ textAlign: 'center' }}>
                Already have an account? <Link href="/login">Sign in</Link>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div className="picker-grid">
              {years.map(y => (
                <button key={y} type="button" className={`picker-tile ${form.graduationYear === String(y) ? 'active' : ''}`} onClick={() => set('graduationYear', String(y))}>
                  {y}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 'auto', paddingBottom: 24 }}>
              <button className="btn btn-block" type="button" onClick={next}>Continue</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div className="picker-grid" style={{ gridTemplateColumns: '1fr' }}>
              {HOUSES.map(h => (
                <button key={h} type="button" className={`picker-tile ${form.house === h ? 'active' : ''}`} onClick={() => set('house', h)}>
                  {h}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 'auto', paddingBottom: 24 }}>
              <button className="btn btn-block" type="button" onClick={next}>Continue</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div className="avatar-uploader" onClick={pickFile} style={{ width: 100, height: 100 }}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="avatar avatar-xl" style={{ width: 100, height: 100, objectFit: 'cover', border: 0, padding: 0 }} />
                ) : (
                  <div className="avatar avatar-xl" style={{ width: 100, height: 100, background: 'var(--blue-50)', color: 'var(--blue)' }}>
                    {(form.fullName || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="avatar-uploader-overlay">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 22, height: 22 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Add Photo</span>
                </div>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onFileChange} style={{ display: 'none' }} />
              </div>
            </div>
            <div className="form-group">
              <label>Profession</label>
              <div className="input-wrap">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 22, height: 22, color: 'var(--blue)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A48.108 48.108 0 0112 21c-2.272 0-4.459-.334-6.512-.955M21 13.255a48.108 48.108 0 00-3.74-9.876" />
                </svg>
                <input type="text" value={form.profession} onChange={e => set('profession', e.target.value)} placeholder="e.g. Software Engineer" />
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
            <div style={{ marginTop: 'auto', paddingBottom: 24 }}>
              <button className="btn btn-block" type="button" onClick={submit} disabled={loading}>
                {loading ? <span className="spinner" /> : 'Save & Continue'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
