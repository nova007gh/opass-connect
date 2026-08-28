'use client';

import Link from 'next/link';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <svg fill="none" stroke="var(--blue)" viewBox="0 0 24 24" strokeWidth={2} style={{ width: 28, height: 28 }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
      </div>
      <h2 style={{ color: 'var(--black)', fontSize: 18, margin: '0 0 6px' }}>Page Error</h2>
      <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 16px', textAlign: 'center', maxWidth: 350 }}>{error.message || 'This page encountered an error.'}</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={reset} className="btn btn-sm">Try again</button>
        <Link href="/dashboard" className="btn btn-sm btn-outline">Home</Link>
      </div>
    </div>
  );
}
