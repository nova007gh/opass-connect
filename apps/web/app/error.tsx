'use client';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 28, fontWeight: 900, marginBottom: 20 }}>!</div>
      <h2 style={{ color: 'var(--black)', fontSize: 20, margin: '0 0 8px' }}>Something went wrong</h2>
      <p style={{ color: 'var(--muted)', fontSize: 14, margin: '0 0 20px', textAlign: 'center', maxWidth: 400 }}>{error.message || 'An unexpected error occurred. Please try again.'}</p>
      <button onClick={reset} className="btn" style={{ padding: '12px 28px' }}>Try again</button>
    </div>
  );
}
