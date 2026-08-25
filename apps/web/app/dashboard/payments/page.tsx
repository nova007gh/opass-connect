'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiPost } from '../../../lib/api';

export default function PaymentsPage() {
  const [form, setForm] = useState({ amount: '', purpose: 'Annual dues', currency: 'GHS' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ reference: string; authorizationUrl: string | null; notice?: string } | null>(null);
  const [verifyRef, setVerifyRef] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'pay' | 'verify'>('pay');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const initialize = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await apiPost<{ paymentId: string; reference: string; authorizationUrl: string | null; notice?: string }>('/payments/initialize', { amount: parseFloat(form.amount), purpose: form.purpose, currency: form.currency });
      setResult(data);
      if (data.authorizationUrl) window.open(data.authorizationUrl, '_blank');
    } catch (err: any) { setError(err.message || 'Payment failed'); } finally { setLoading(false); }
  };

  const verify = async () => {
    if (!verifyRef) return;
    setVerifying(true);
    setError('');
    setVerifyResult(null);
    try { const data = await apiPost(`/payments/verify/${verifyRef}`); setVerifyResult(data); } catch (err: any) { setError(err.message || 'Verification failed'); } finally { setVerifying(false); }
  };

  return (
    <div className="app-screen" style={{ background: 'var(--bg)' }}>
      <div className="screen-header">
        <Link href="/dashboard" className="back">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1>Payments</h1>
      </div>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'white' }}>
        <button onClick={() => setTab('pay')} className="btn" style={{
          flex: 1, borderRadius: 0, background: tab === 'pay' ? 'var(--blue-bright)' : 'transparent',
          color: tab === 'pay' ? 'white' : 'var(--muted)', borderBottom: tab === 'pay' ? '2px solid var(--blue-bright)' : 'none', fontSize: 14, padding: '14px', fontWeight: 700
        }}>Pay</button>
        <button onClick={() => setTab('verify')} className="btn" style={{
          flex: 1, borderRadius: 0, background: tab === 'verify' ? 'var(--blue-bright)' : 'transparent',
          color: tab === 'verify' ? 'white' : 'var(--muted)', borderBottom: tab === 'verify' ? '2px solid var(--blue-bright)' : 'none', fontSize: 14, padding: '14px', fontWeight: 700
        }}>Verify</button>
      </div>
      <div className="app-scroll">
        <div className="app-pad">
          {error && <div className="alert alert-error">{error}</div>}
          {tab === 'pay' ? (
            <div className="card">
              <h3>Make a Payment</h3>
              <p>Pay dues, contribute to projects, or buy event tickets.</p>
              <form onSubmit={initialize}>
                <div className="form-group">
                  <label>Purpose</label>
                  <select className="select" value={form.purpose} onChange={e => set('purpose', e.target.value)} style={{ width: '100%' }}>
                    <option>Annual dues</option>
                    <option>Project contribution</option>
                    <option>Event ticket</option>
                    <option>Donation</option>
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Amount</label>
                    <div className="input-wrap">
                      <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{form.currency}</span>
                      <input type="number" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} required placeholder="0.00" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Currency</label>
                    <select className="select" value={form.currency} onChange={e => set('currency', e.target.value)} style={{ width: '100%' }}>
                      <option>GHS</option>
                      <option>USD</option>
                    </select>
                  </div>
                </div>
                <button className="btn btn-block" type="submit" disabled={loading}>
                  {loading ? <span className="spinner" /> : 'Initialize Payment'}
                </button>
              </form>
              {result && (
                <div className="alert alert-info mt-16">
                  <div>Reference: <strong>{result.reference}</strong></div>
                  {result.authorizationUrl ? (
                    <a className="btn btn-sm mt-16" href={result.authorizationUrl} target="_blank" rel="noopener noreferrer" style={{ marginTop: 8, display: 'inline-block' }}>Complete payment →</a>
                  ) : (
                    <div style={{ marginTop: 8 }}>{result.notice || 'Provider not configured. Save reference for later.'}</div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="card">
              <h3>Verify Payment</h3>
              <p>Check the status of a payment.</p>
              <div className="form-group">
                <label>Reference</label>
                <div className="input-wrap">
                  <input type="text" value={verifyRef} onChange={e => setVerifyRef(e.target.value)} placeholder="OPASS-..." />
                </div>
              </div>
              <button className="btn btn-block" onClick={verify} disabled={verifying}>
                {verifying ? <span className="spinner" /> : 'Verify'}
              </button>
              {verifyResult && (
                <div className={`alert mt-16 ${verifyResult.verified ? 'alert-success' : 'alert-error'}`}>
                  {verifyResult.verified ? '✓ Payment verified!' : '✗ Payment not verified.'}
                  {verifyResult.payment && (
                    <div style={{ marginTop: 8, fontSize: 13 }}>
                      <div>Amount: GHS {Number(verifyResult.payment.amount).toLocaleString()}</div>
                      <div>Purpose: {verifyResult.payment.purpose}</div>
                      <div>Status: <span className="badge badge-dark">{verifyResult.payment.status}</span></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="card mt-16" style={{ background: 'var(--blue-50)' }}>
            <p style={{ margin: 0, fontSize: 13 }}>🔒 Payments are processed securely through Paystack or Flutterwave.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
