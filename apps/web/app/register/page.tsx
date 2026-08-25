'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiPost, setToken } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '', graduationYear: '', house: '', positionHeld: '', country: 'Ghana', city: '', profession: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) router.replace('/dashboard'); }, [user, router]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const next = () => {
    setError('');
    if (step === 1 && (!form.fullName || !form.graduationYear)) return setError('Full name and year of graduation are required.');
    if (step === 2 && !form.email) return setError('Email is required.');
    if (step === 3 && (!form.profession && !form.city && !form.country)) return null;
    if (step === 4 && form.password.length < 10) return setError('Password must be at least 10 characters.');
    if (step < 4) setStep(s => s + 1);
  };

  const back = () => { setError(''); setStep(s => s - 1); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.password || !form.graduationYear) {
      setError('Please fill in all required fields.');
      return;
    }
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
      await refresh();
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const years = Array.from({ length: new Date().getFullYear() - 1954 }, (_, i) => 1955 + i);

  const steps = [
    {
      title: 'Create Account',
      subtitle: 'Stay connected with classmates, join events, and make an impact.',
      fields: (
        <>
          <div className="form-group">
            <label>Full name</label>
            <div className="input-wrap">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 22, height: 22, color: 'var(--blue)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              <input type="text" value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Enter your full name" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Year of graduation</label>
              <div className="input-wrap">
                <select value={form.graduationYear} onChange={e => set('graduationYear', e.target.value)}>
                  <option value="">Select year</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18, color: 'var(--muted)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
            <div className="form-group">
              <label>House</label>
              <div className="input-wrap">
                <input type="text" value={form.house} onChange={e => set('house', e.target.value)} placeholder="e.g. Mensah" />
              </div>
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
        </>
      )
    },
    {
      title: 'Contact information',
      subtitle: 'How can fellow alumni reach you?',
      fields: (
        <>
          <div className="form-group">
            <label>Email</label>
            <div className="input-wrap">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 22, height: 22, color: 'var(--blue)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="Enter your email" />
            </div>
          </div>
          <div className="form-group">
            <label>Phone number</label>
            <div className="input-wrap" style={{ gap: 12 }}>
              <span style={{ fontSize: 20 }}>🇬🇭</span>
              <span className="prefix">+233</span>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Enter your phone" />
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
        </>
      )
    },
    {
      title: 'Set your password',
      subtitle: 'Keep your account secure.',
      fields: (
        <>
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
          <div className="form-group">
            <label>Confirm password</label>
            <div className="input-wrap">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 22, height: 22, color: 'var(--blue)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input type="password" placeholder="Re-enter your password" />
            </div>
          </div>
        </>
      )
    },
  ];

  return (
    <div className="auth-screen">
      <div className="auth-header">
        <Link href="/" className="back" style={{ color: 'var(--blue)' }}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 26, height: 26 }}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <Link href="/login" style={{ fontWeight: 600, color: 'var(--blue)' }}>Sign in</Link>
      </div>
      <div className="auth-body" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="step-dots" style={{ justifyContent: 'flex-start' }}>
          {[1, 2, 3].map(i => <div key={i} className={`step-dot ${i === step ? 'active' : ''}`} />)}
        </div>
        <h1>{steps[step - 1].title}</h1>
        <p className="sub">{steps[step - 1].subtitle}</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={step === 3 ? submit : e => { e.preventDefault(); next(); }}>
          {steps[step - 1].fields}
          <div style={{ marginTop: 'auto', paddingBottom: 24, display: 'flex', gap: 12 }}>
            {step > 1 && <button className="btn btn-block btn-secondary" type="button" onClick={back} style={{ flex: 1 }}>Back</button>}
            {step < 3 ? (
              <button className="btn btn-block" type="button" onClick={next} style={{ flex: 1 }}>Next</button>
            ) : (
              <button className="btn btn-block" type="submit" disabled={loading} style={{ flex: 1 }}>
                {loading ? <span className="spinner" /> : 'Sign up'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
