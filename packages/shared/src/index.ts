export const BRAND = {
  name: 'OPASS CONNECT',
  developer: 'SmartThinkers™ Tech',
  colors: { blue: '#0B2D6B', black: '#050505', white: '#FFFFFF', lightBlue: '#EAF1FF' },
  tagline: 'One School. One Network. One Legacy.'
} as const;

export type QuoteRequest = {
  requestType: 'advertising'|'sponsorship'|'event'|'partnership'|'other';
  durationDays?: number;
  placement?: 'year_group'|'home'|'events'|'platform_wide';
  audienceSize?: number;
  creativeType?: 'image'|'video'|'live';
  rush?: boolean;
};
