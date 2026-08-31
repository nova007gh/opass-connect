'use client';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
  rounded?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Avatar component with OPASS crest fallback.
 * If no avatarUrl is provided, shows the OPASS crest image instead of initials.
 */
export default function Avatar({ src, name, size = 40, rounded = true, style, className }: AvatarProps) {
  const borderRadius = rounded ? '50%' : '12px';
  const fallback = (
    <img
      src="/opass-crest.jpeg"
      alt={name || 'OPASS'}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        borderRadius,
        ...style,
      }}
    />
  );

  if (src) {
    return (
      <div className={className} style={{ width: size, height: size, borderRadius, overflow: 'hidden', flexShrink: 0, ...style }}>
        <img src={src} alt={name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }

  return (
    <div className={className} style={{ width: size, height: size, borderRadius, overflow: 'hidden', flexShrink: 0, ...style }}>
      {fallback}
    </div>
  );
}
