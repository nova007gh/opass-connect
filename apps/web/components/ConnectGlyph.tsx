'use client';

import { useId } from 'react';

/**
 * The stylized "linked-C" glyph used in the OPASS CONNECT wordmark,
 * replacing the "O" in CONNECT with two interlocking ring hooks.
 */
export default function ConnectGlyph({ size = '1.35em' }: { size?: string }) {
  const uid = useId();
  const g1 = `cg1-${uid}`;
  const g2 = `cg2-${uid}`;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      style={{ display: 'inline-block', verticalAlign: '-0.28em' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={g1} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7FB2FF" />
          <stop offset="55%" stopColor="#1D6BFF" />
          <stop offset="100%" stopColor="#0043D6" />
        </linearGradient>
        <linearGradient id={g2} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A6C9FF" />
          <stop offset="60%" stopColor="#2E7BFF" />
          <stop offset="100%" stopColor="#0B4FE0" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="8.4" r="6.6" fill="none" stroke={`url(#${g1})`} strokeWidth="4.1" />
      <circle cx="12" cy="16.6" r="4.6" fill="none" stroke={`url(#${g2})`} strokeWidth="4.1" />
      <ellipse cx="9.1" cy="5" rx="1.7" ry="0.95" fill="rgba(255,255,255,0.55)" transform="rotate(-35 9.1 5)" />
      <ellipse cx="9.6" cy="14" rx="1.2" ry="0.7" fill="rgba(255,255,255,0.45)" transform="rotate(-35 9.6 14)" />
    </svg>
  );
}
