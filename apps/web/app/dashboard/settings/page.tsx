'use client';

import Link from 'next/link';
import { useAuth } from '../../lib/auth';

export default function SettingsPage() {
  const { user, logout } = useAuth();

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
            <div className="flex-between" style={{ padding: '16px 20px' }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Change Password</span>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18, color: 'var(--muted)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </div>
          </div>

          {/* Preferences */}
          <div className="card" style={{ margin: 16, marginBottom: 12, padding: 0 }}>
            <div className="sidebar-section" style={{ padding: '16px 20px 8px', color: 'var(--muted)', fontWeight: 700 }}>Preferences</div>
            <div className="flex-between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Push Notifications</span>
              <label className="switch" style={{ position: 'relative', display: 'inline-block', width: 48, height: 28 }}>
                <input type="checkbox" defaultChecked style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{ position: 'absolute', cursor: 'pointer', inset: 0, background: 'var(--blue-bright)', borderRadius: 999 }}>
                  <span style={{ position: 'absolute', top: 3, right: 3, width: 22, height: 22, borderRadius: '50%', background: 'white' }} />
                </span>
              </label>
            </div>
            <div className="flex-between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Email Updates</span>
              <label className="switch" style={{ position: 'relative', display: 'inline-block', width: 48, height: 28 }}>
                <input type="checkbox" defaultChecked style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{ position: 'absolute', cursor: 'pointer', inset: 0, background: 'var(--blue-bright)', borderRadius: 999 }}>
                  <span style={{ position: 'absolute', top: 3, right: 3, width: 22, height: 22, borderRadius: '50%', background: 'white' }} />
                </span>
              </label>
            </div>
            <div className="flex-between" style={{ padding: '16px 20px' }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Profile Visible in Directory</span>
              <label className="switch" style={{ position: 'relative', display: 'inline-block', width: 48, height: 28 }}>
                <input type="checkbox" defaultChecked style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{ position: 'absolute', cursor: 'pointer', inset: 0, background: 'var(--blue-bright)', borderRadius: 999 }}>
                  <span style={{ position: 'absolute', top: 3, right: 3, width: 22, height: 22, borderRadius: '50%', background: 'white' }} />
                </span>
              </label>
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
