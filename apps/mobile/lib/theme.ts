// Dark theme palette matching the OPASS CONNECT web app's [data-theme="dark"] tokens
export const theme = {
  bg: '#0d0d1a',
  card: '#1a1a2e',
  cardAlt: '#161630',
  border: '#2a2a45',
  text: '#e8e8f0',
  muted: '#9090b0',
  blue: '#7aa8ff',
  blueLight: '#60a5fa',
  blueBright: '#3b82f6',
  blueDark: '#1e3a5f',
  blue50: '#161630',
  blue100: '#222250',
  green: '#34d399',
  red: '#f87171',
  amber: '#fbbf24',
  chatBg: '#0a0a14',
  white: '#ffffff',
};

export const roleColor = (role?: string) => {
  switch (role) {
    case 'SUPER_ADMIN': return '#a78bfa';
    case 'ADMIN': return '#7aa8ff';
    case 'EXECUTIVE': return '#34d399';
    case 'MODERATOR': return '#fbbf24';
    case 'YEAR_ADMIN': return '#22d3ee';
    default: return '#9090b0';
  }
};

export const roleLabel = (role?: string) => (role || 'MEMBER').replace(/_/g, ' ');
