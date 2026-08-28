'use client';

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card" style={{ padding: 16, marginBottom: 12 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton skeleton-text" style={{ width: i === 0 ? '60%' : i === lines - 1 ? '40%' : '90%', marginBottom: i < lines - 1 ? 10 : 0 }} />
      ))}
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} lines={3} />)}
    </>
  );
}

export function EmptyState({ icon, title, message, action }: { icon?: string; title: string; message: string; action?: React.ReactNode }) {
  return (
    <div className="empty-state card fade-in-up" style={{ padding: 32, textAlign: 'center' }}>
      {icon && (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} style={{ width: 48, height: 48, margin: '0 auto 12px', color: 'var(--muted)', opacity: 0.5 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      )}
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--black)', margin: '0 0 6px' }}>{title}</h3>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 16px' }}>{message}</p>
      {action}
    </div>
  );
}

export function SectionHeader({ title, href, hrefLabel }: { title: string; href?: string; hrefLabel?: string }) {
  return (
    <div className="section-header fade-in-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <h3 style={{ margin: 0, fontSize: 17, color: 'var(--blue)', fontWeight: 800 }}>{title}</h3>
      {href && hrefLabel && <a href={href} style={{ color: 'var(--blue)', fontSize: 13, fontWeight: 700 }}>{hrefLabel}</a>}
    </div>
  );
}
