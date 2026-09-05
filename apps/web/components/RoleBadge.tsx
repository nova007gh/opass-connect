'use client';

import { getHouseColor } from '../lib/houseColors';

export type UserRole = 'MEMBER' | 'YEAR_ADMIN' | 'MODERATOR' | 'EXECUTIVE' | 'ADMIN' | 'SUPER_ADMIN';

interface RoleBadgeProps {
  role?: UserRole | string | null;
  house?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  style?: React.CSSProperties;
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  EXECUTIVE: 'Executive',
  MODERATOR: 'Moderator',
  YEAR_ADMIN: 'Year Admin',
  MEMBER: 'Member',
};

const ROLE_ICONS: Record<string, string> = {
  SUPER_ADMIN: '\u2605',
  ADMIN: '\u2605',
  EXECUTIVE: '\u2666',
  MODERATOR: '\u2666',
  YEAR_ADMIN: '\u25C6',
  MEMBER: '',
};

/**
 * Returns true if the role should display a badge.
 * Regular members don't get a badge.
 */
export function hasRoleBadge(role?: string | null): boolean {
  if (!role) return false;
  const r = role.toUpperCase();
  return r !== 'MEMBER';
}

/**
 * RoleBadge - A neon glowing badge that shows a user's position/role.
 * The glow color is based on the user's house color.
 * Designed to be placed at the bottom of an Avatar.
 */
export function RoleBadge({ role, house, size = 'sm', showLabel = true, style }: RoleBadgeProps) {
  if (!hasRoleBadge(role)) return null;

  const hc = getHouseColor(house);
  const roleKey = (role || '').toUpperCase();
  const label = ROLE_LABELS[roleKey] || role || '';
  const icon = ROLE_ICONS[roleKey] || '';
  const neonColor = hc.neon;

  const sizes = {
    sm: { badge: { fontSize: 7, padding: '1px 5px', borderRadius: 6 }, glow: '0 0 4px' },
    md: { badge: { fontSize: 8, padding: '2px 7px', borderRadius: 7 }, glow: '0 0 6px' },
    lg: { badge: { fontSize: 9, padding: '2px 8px', borderRadius: 8 }, glow: '0 0 8px' },
  };

  const s = sizes[size];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        background: `${hc.base}EE`,
        color: 'white',
        fontWeight: 700,
        whiteSpace: 'nowrap',
        textShadow: `0 0 3px ${neonColor}, 0 0 6px ${neonColor}88`,
        boxShadow: `${s.glow} ${neonColor}, 0 0 2px ${neonColor}, inset 0 0 4px ${neonColor}44`,
        border: `1px solid ${neonColor}AA`,
        ...s.badge,
        ...style,
      }}
    >
      {icon && <span style={{ fontSize: '0.85em', opacity: 0.9 }}>{icon}</span>}
      {showLabel && label}
    </span>
  );
}

/**
 * AvatarWithBadge - Wraps an avatar and positions a RoleBadge at the bottom.
 * Use this anywhere you want to show a user's avatar with their role badge.
 */
export function AvatarWithBadge({
  src,
  name,
  size = 40,
  role,
  house,
  rounded = true,
  style,
  className,
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  role?: string | null;
  house?: string | null;
  rounded?: boolean;
  style?: React.CSSProperties;
  className?: string;
}) {
  if (!hasRoleBadge(role)) {
    // No badge needed - just render a plain avatar div
    const Avatar = require('./Avatar').default;
    return <Avatar src={src} name={name} size={size} rounded={rounded} style={style} className={className} />;
  }

  const Avatar = require('./Avatar').default;
  const hc = getHouseColor(house);
  const badgeSize = size <= 36 ? 'sm' : size <= 56 ? 'sm' : 'md';
  const borderRadius = rounded ? '50%' : '12px';

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        ...style,
      }}
    >
      {/* Neon ring around avatar */}
      <div
        style={{
          position: 'absolute',
          inset: -2,
          borderRadius,
          border: `2px solid ${hc.neon}`,
          boxShadow: `0 0 6px ${hc.neon}, 0 0 3px ${hc.neon}`,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <Avatar src={src} name={name} size={size} rounded={rounded} />
      {/* Role badge at bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: -4,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2,
        }}
      >
        <RoleBadge role={role} house={house} size={badgeSize as 'sm' | 'md' | 'lg'} showLabel={size >= 42} />
      </div>
    </div>
  );
}

export default RoleBadge;
