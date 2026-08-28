'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../../../lib/api';

interface PaymentRecord { id: string; reference: string; amount: string; purpose: string; status: string; currency: string; createdAt: string; }

export default function PaymentsPage() {
  const [form, setForm] = useState({ amount: '', purpose: 'Annual dues', currency: 'GHS', phone: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ reference: string; authorizationUrl: string | null; notice?: string } | null>(null);
  const [verifyRef, setVerifyRef] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState<'pay' | 'history' | 'verify'>('pay');
  const [history, setHistory] = useState<PaymentRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const loadHistory = () => {
    setLoadingHistory(true);
    apiGet<PaymentRecord[]>('/payments/my').then(setHistory).catch(() => {}).finally(() => setLoadingHistory(false));
  };

  useEffect(() => { if (tab === 'history') loadHistory(); }, [tab]);

  const initialize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('Enter a valid amount'); return; }
    if (!form.phone || form.phone.length < 10) { setError('Enter a valid mobile money number'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    setSuccess('');
    try {
      const data = await apiPost<{ paymentId: string; reference: string; authorizationUrl: string | null; notice?: string }>('/payments/initialize', { amount: parseFloat(form.amount), purpose: form.purpose, currency: form.currency, phone: form.phone });
      setResult(data);
      setSuccess('Payment initiated! You will receive a mobile money prompt on your phone.');
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

  const purposes = [
    { value: 'Annual dues', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', desc: 'Annual alumni dues' },
    { value: 'Project contribution', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', desc: 'Support a project' },
    { value: 'Event ticket', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', desc: 'Buy event tickets' },
    { value: 'Donation', icon: 'M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12', desc: 'General donation' },
  ];

  const statusColors: Record<string, string> = { PENDING: 'badge-amber', SUCCESS: 'badge-green', FAILED: 'badge-red', COMPLETED: 'badge-green' };

  return (
    <div className="app-screen fade-in" style={{ background: 'var(--bg)' }}>
      <div className="screen-header">
        <h1>Payments</h1>
      </div>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--white)' }}>
        <button onClick={() => setTab('pay')} className="assembly-tab" style={{
          flex: 1, borderRadius: 0, background: 'transparent',
          color: tab === 'pay' ? 'var(--blue)' : 'var(--muted)', borderBottom: tab === 'pay' ? '2px solid var(--blue-bright)' : '2px solid transparent', fontSize: 14, padding: '14px', fontWeight: 700
        }}>Pay</button>
        <button onClick={() => setTab('history')} className="assembly-tab" style={{
          flex: 1, borderRadius: 0, background: 'transparent',
          color: tab === 'history' ? 'var(--blue)' : 'var(--muted)', borderBottom: tab === 'history' ? '2px solid var(--blue-bright)' : '2px solid transparent', fontSize: 14, padding: '14px', fontWeight: 700
        }}>History</button>
        <button onClick={() => setTab('verify')} className="assembly-tab" style={{
          flex: 1, borderRadius: 0, background: 'transparent',
          color: tab === 'verify' ? 'var(--blue)' : 'var(--muted)', borderBottom: tab === 'verify' ? '2px solid var(--blue-bright)' : '2px solid transparent', fontSize: 14, padding: '14px', fontWeight: 700
        }}>Verify</button>
      </div>
      <div className="app-scroll">
        <div className="app-pad">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {tab === 'pay' ? (
            <>
              {/* Purpose selection cards */}
              <div style={{ marginBottom: 16 }}>
                <div className="text-muted text-sm" style={{ marginBottom: 10, fontWeight: 600 }}>Select Purpose</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {purposes.map(p => (
                    <button key={p.value} onClick={() => set('purpose', p.value)} style={{
                      background: form.purpose === p.value ? 'var(--blue)' : 'var(--white)',
                      color: form.purpose === p.value ? 'white' : 'var(--black)',
                      border: form.purpose === p.value ? '2px solid var(--blue)' : '1px solid var(--border)',
                      borderRadius: 14, padding: 14, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                    }}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} style={{ width: 22, height: 22, marginBottom: 6 }}><path strokeLinecap="round" strokeLinejoin="round" d={p.icon} /></svg>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{p.value}</div>
                      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment form */}
              <div className="card" style={{ padding: 16 }}>
                <form onSubmit={initialize}>
                  <div className="form-group">
                    <label>Amount</label>
                    <div className="input-wrap">
                      <span style={{ color: 'var(--muted)', fontWeight: 600, flexShrink: 0 }}>{form.currency}</span>
                      <input type="number" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} required placeholder="0.00" style={{ minWidth: 0 }} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Currency</label>
                    <select className="select" value={form.currency} onChange={e => set('currency', e.target.value)} style={{ width: '100%' }}>
                      <option>GHS</option>
                      <option>USD</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Mobile Money Number</label>
                    <div className="input-wrap">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 20, height: 20, color: 'var(--blue)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
                      <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="e.g. 0241234567" required />
                    </div>
                    <div className="hint">Enter your MTN MoMo, Vodafone Cash, or AirtelTigo number</div>
                  </div>
                  <button className="btn btn-block" type="submit" disabled={loading} style={{ marginTop: 4 }}>
                    {loading ? <span className="spinner" /> : (
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 20, height: 20 }}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
                        Pay with Mobile Money
                      </span>
                    )}
                  </button>
                </form>
                {result && (
                  <div className="alert alert-info mt-16">
                    <div>Reference: <strong>{result.reference}</strong></div>
                    {result.authorizationUrl ? (
                      <a className="btn btn-sm" href={result.authorizationUrl} target="_blank" rel="noopener noreferrer" style={{ marginTop: 8, display: 'inline-block' }}>Complete payment →</a>
                    ) : (
                      <div style={{ marginTop: 8, fontSize: 13 }}>{result.notice || 'You will receive a prompt on your phone. Save reference for later.'}</div>
                    )}
                  </div>
                )}
              </div>

              <div className="card mt-16" style={{ background: 'var(--blue-50)', padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--blue)' }}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>Secure payments via Paystack & Flutterwave</span>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
                  {['MTN MoMo', 'Vodafone Cash', 'AirtelTigo', 'Visa', 'Mastercard'].map(m => (
                    <span key={m} style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', background: 'var(--white)', padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>{m}</span>
                  ))}
                </div>
              </div>
            </>
          ) : tab === 'history' ? (
            <>
              {loadingHistory ? <div className="loading-center"><span className="spinner" /></div> : history.length === 0 ? (
                <div className="empty-state"><h3>No payments yet</h3><p>Your payment history will appear here.</p></div>
              ) : (
                <div className="feed">
                  {history.map(p => (
                    <div className="feed-card" key={p.id}>
                      <div className="feed-card-header">
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: p.status === 'SUCCESS' || p.status === 'COMPLETED' ? 'rgba(16,185,129,0.1)' : 'var(--blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg fill="none" stroke={p.status === 'SUCCESS' || p.status === 'COMPLETED' ? '#16A34A' : 'var(--blue)'} viewBox="0 0 24 24" strokeWidth={2} style={{ width: 22, height: 22 }}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="name">{p.purpose}</div>
                          <div className="time">{new Date(p.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })} · {p.reference.slice(0, 16)}...</div>
                        </div>
                        <span className={`badge ${statusColors[p.status] || 'badge-gray'}`}>{p.status}</span>
                      </div>
                      <div className="feed-card-body">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: 18, color: 'var(--blue)' }}>{p.currency} {Number(p.amount).toLocaleString()}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="card" style={{ padding: 16 }}>
              <h3>Verify Payment</h3>
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>Check the status of a payment using your reference number.</p>
              <div className="form-group">
                <label>Reference</label>
                <div className="input-wrap">
                  <input type="text" value={verifyRef} onChange={e => setVerifyRef(e.target.value)} placeholder="OPASS-..." />
                </div>
              </div>
              <button className="btn btn-block" onClick={verify} disabled={verifying}>
                {verifying ? <span className="spinner" /> : 'Verify Payment'}
              </button>
              {verifyResult && (
                <div className={`alert mt-16 ${verifyResult.verified ? 'alert-success' : 'alert-error'}`}>
                  {verifyResult.verified ? '✓ Payment verified!' : '✗ Payment not verified.'}
                  {verifyResult.payment && (
                    <div style={{ marginTop: 8, fontSize: 13 }}>
                      <div>Amount: {verifyResult.payment.currency} {Number(verifyResult.payment.amount).toLocaleString()}</div>
                      <div>Purpose: {verifyResult.payment.purpose}</div>
                      <div>Status: <span className="badge badge-dark">{verifyResult.payment.status}</span></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
