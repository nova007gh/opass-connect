'use client';

// A synthesized "school bell" notification sound, generated with the Web Audio API
// so the app never depends on a licensed audio asset. Used across the app whenever
// something notification-worthy happens (new chat message, new notification, buzz, etc).

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  } catch {
    return null;
  }
}

// Rings a single bell "ding" using a fundamental + a few inharmonic overtones,
// which is what gives struck metal (bells, chimes) their characteristic timbre.
function ringBell(ctx: AudioContext, startTime: number, freq: number, gainPeak: number, duration: number) {
  const partials = [1, 2.41, 3.84, 5.43];
  const partialGains = [1, 0.55, 0.28, 0.14];
  partials.forEach((ratio, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq * ratio;
    const gain = ctx.createGain();
    const peak = gainPeak * partialGains[i];
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(peak, startTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  });
}

/**
 * Plays a classic school-bell "ring ring" notification sound.
 * intensity: 'soft' for background/ambient events, 'normal' for messages,
 * 'loud' for urgent things like buzzes or incoming calls.
 */
export function playSchoolBell(intensity: 'soft' | 'normal' | 'loud' = 'normal') {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const gainPeak = intensity === 'loud' ? 0.55 : intensity === 'soft' ? 0.16 : 0.34;
  const dingCount = intensity === 'loud' ? 3 : 2;
  const gap = 0.26;
  for (let i = 0; i < dingCount; i++) {
    ringBell(ctx, now + i * gap, 1046.5, gainPeak, 1.0); // C6 — bright, attention-grabbing bell tone
  }
}

/** Playful buzzer sound (like an old classroom buzzer) followed by an urgent bell. */
export function playBuzzSound() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.linearRampToValueAtTime(140, now + 0.35);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
  gain.gain.linearRampToValueAtTime(0, now + 0.4);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.42);
  playSchoolBell('loud');
}

/** Call once on a user gesture (e.g. first click) to unlock audio on browsers that require it. */
export function primeAudio() {
  getCtx();
}
