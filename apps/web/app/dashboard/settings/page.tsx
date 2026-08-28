'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiPatch, apiPost } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="switch" style={{ position: 'relative', display: 'inline-block', width: 48, height: 28 }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
      <span style={{ position: 'absolute', cursor: 'pointer', inset: 0, background: checked ? 'var(--blue-bright)' : '#D1D5DB', borderRadius: 999, transition: 'background 0.2s' }}>
        <span style={{ position: 'absolute', top: 3, left: checked ? 23 : 3, width: 22, height: 22, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
      </span>
    </label>
  );
}

export default function SettingsPage() {
  const { user, logout, refresh } = useAuth();
  const [push, setPush] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [visible, setVisible] = useState(true);
  const [visibleSaving, setVisibleSaving] = useState(false);

  useEffect(() => {
    if (user?.profile) setVisible(user.profile.searchable !== false);
  }, [user]);

  const toggleVisible = async (v: boolean) => {
    setVisible(v);
    setVisibleSaving(true);
    try {
      await apiPatch('/profile', { searchable: v });
      await refresh();
    } finally {
      setVisibleSaving(false);
    }
  };
  const [showPwd, setShowPwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '' });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState(false);

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess(false);
    if (pwdForm.newPassword.length < 10) return setPwdError('New password must be at least 10 characters.');
    setPwdLoading(true);
    try {
      await apiPost('/auth/change-password', pwdForm);
      setPwdSuccess(true);
      setPwdForm({ currentPassword: '', newPassword: '' });
    } catch (err: any) {
      setPwdError(err.message || 'Failed to change password');
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="app-screen" style={{ background: 'var(--bg)' }}>
      <div className="screen-header">
        <Link href="/dashboard/menu" className="back">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1>Settings</h1>
      </div>
      <div className="app-scroll">
        <div className="app-pad" style={{ padding: 0 }}>
          {/* Account */}
          <div className="card" style={{ margin: 16, marginBottom: 12, padding: 0 }}>
            <div className="sidebar-section" style={{ padding: '16px 20px 8px', color: 'var(--muted)', fontWeight: 700 }}>Account</div>
            <Link href="/dashboard/profile" className="flex-between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', textDecoration: 'none', color: 'var(--black)' }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Edit Profile</span>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18, color: 'var(--muted)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </Link>
            <div className="flex-between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Email</span>
              <span className="text-muted" style={{ fontSize: 14 }}>{user?.email}</span>
            </div>
            <button onClick={() => setShowPwd(s => !s)} className="flex-between" style={{ width: '100%', padding: '16px 20px', background: 'none', border: 0, cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Change Password</span>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18, color: 'var(--muted)', transform: showPwd ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
            {showPwd && (
              <form onSubmit={submitPassword} style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                {pwdError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{pwdError}</div>}
                {pwdSuccess && <div className="alert alert-success" style={{ marginBottom: 12 }}>Password updated successfully.</div>}
                <div className="form-group">
                  <label>Current password</label>
                  <div className="input-wrap">
                    <input type="password" value={pwdForm.currentPassword} onChange={e => setPwdForm(f => ({ ...f, currentPassword: e.target.value }))} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>New password</label>
                  <div className="input-wrap">
                    <input type="password" value={pwdForm.newPassword} onChange={e => setPwdForm(f => ({ ...f, newPassword: e.target.value }))} required />
                  </div>
                  <div className="hint">Minimum 10 characters.</div>
                </div>
                <button className="btn btn-block btn-sm" type="submit" disabled={pwdLoading}>
                  {pwdLoading ? <span className="spinner" /> : 'Update Password'}
                </button>
              </form>
            )}
          </div>

          {/* Preferences */}
          <div className="card" style={{ margin: 16, marginBottom: 12, padding: 0 }}>
            <div className="sidebar-section" style={{ padding: '16px 20px 8px', color: 'var(--muted)', fontWeight: 700 }}>Preferences</div>
            <div className="flex-between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Push Notifications</span>
              <Toggle checked={push} onChange={setPush} />
            </div>
            <div className="flex-between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Email Updates</span>
              <Toggle checked={emailUpdates} onChange={setEmailUpdates} />
            </div>
            <div className="flex-between" style={{ padding: '16px 20px' }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Profile Visible in Directory</span>
              <Toggle checked={visible} onChange={toggleVisible} />
            </div>
          </div>

          {/* Support */}
          <div className="card" style={{ margin: 16, marginBottom: 12, padding: 0 }}>
            <div className="sidebar-section" style={{ padding: '16px 20px 8px', color: 'var(--muted)', fontWeight: 700 }}>Support</div>
            <Link href="/dashboard/about" className="flex-between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', textDecoration: 'none', color: 'var(--black)' }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>About OPASS CONNECT</span>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18, color: 'var(--muted)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </Link>
            <div className="flex-between" style={{ padding: '16px 20px' }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Help & Support</span>
              <span className="text-muted" style={{ fontSize: 13 }}>support@opassconnect.org</span>
            </div>
          </div>

          <div className="app-pad" style={{ padding: '0 16px 24px' }}>
            <button className="btn btn-block" style={{ background: 'var(--red)' }} onClick={logout}>Logout</button>
          </div>

          <div style={{ textAlign: 'center', padding: '0 20px 40px', fontSize: 12, color: 'var(--muted)' }}>
            OPASS CONNECT v1.0<br />Developed by SmartThinkers™ Tech
          </div>
        </div>
      </div>
    </div>
  );
}
