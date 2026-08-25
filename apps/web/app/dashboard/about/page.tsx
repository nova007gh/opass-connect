import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="app-screen">
      <div className="screen-header">
        <Link href="/dashboard/menu" className="back">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1>About OPASS CONNECT</h1>
      </div>
      <div className="app-scroll" style={{ background: 'var(--bg)' }}>
        <div className="app-pad" style={{ textAlign: 'center' }}>
          <img src="/opass-connect-official-logo.png" alt="OPASS" style={{ width: 100, height: 100, borderRadius: 24, margin: '20px auto' }} />
          <h1 style={{ color: 'var(--blue)', marginBottom: 8 }}>OPASS CONNECT</h1>
          <p style={{ color: 'var(--muted)', marginBottom: 24 }}>Version 1.0</p>
          <p style={{ lineHeight: 1.7, color: '#374151' }}>
            The official alumni platform for Ofori Panin Senior High School (OPASS).
            Built to connect, engage and empower the OPASS alumni community worldwide.
          </p>
          <div className="card mt-24" style={{ textAlign: 'left' }}>
            <h3>Mission</h3>
            <p>One School. One Network. One Legacy.</p>
            <h3 className="mt-16">Developer</h3>
            <p>SmartThinkers™ Tech</p>
            <h3 className="mt-16">Support</h3>
            <p>support@opassconnect.org</p>
          </div>
        </div>
      </div>
    </div>
  );
}
