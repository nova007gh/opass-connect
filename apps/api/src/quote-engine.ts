import type { QuoteRequest } from '@opass/shared';

export function calculateQuote(input: QuoteRequest) {
  const base: Record<string, number> = { advertising: 600, sponsorship: 2500, event: 1500, partnership: 1800, other: 800 };
  const placement: Record<string, number> = { year_group: 1, home: 1.6, events: 1.35, platform_wide: 2.4 };
  let total = base[input.requestType];
  total *= placement[input.placement ?? 'year_group'];
  total *= Math.max(1, (input.durationDays ?? 7) / 7);
  if ((input.audienceSize ?? 0) > 10000) total *= 1.25;
  if ((input.audienceSize ?? 0) > 100000) total *= 1.6;
  if (input.creativeType === 'video') total += 500;
  if (input.creativeType === 'live') total += 1200;
  if (input.rush) total *= 1.2;
  return { subtotal: Math.round(total * 100) / 100, currency: 'GHS' };
}

export function missingQuoteQuestions(input: Partial<QuoteRequest>) {
  const q:string[]=[];
  if(!input.requestType) q.push('What service do you need: advertising, sponsorship, event support, partnership, or something else?');
  if(!input.durationDays) q.push('How long should the service or campaign run?');
  if(!input.placement && input.requestType==='advertising') q.push('Where should the advert appear: year group, home page, events, or platform-wide?');
  if(!input.audienceSize) q.push('About how many alumni do you want to reach?');
  if(!input.creativeType) q.push('Will you provide an image, video, or require a live promotional session?');
  return q;
}
