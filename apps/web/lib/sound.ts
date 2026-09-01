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

/** Playful "pop" sound for reactions and quick actions. */
export function playPop() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.13);
}

/** Gunshot sound — a sharp percussive noise burst. */
export function playGunshot() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  // White noise burst for the "bang"
  const bufferSize = ctx.sampleRate * 0.15;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.5, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000, now);
  filter.frequency.exponentialRampToValueAtTime(200, now + 0.1);
  noise.connect(filter).connect(noiseGain).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + 0.15);
  // Low thump
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0.3, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.connect(oscGain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.13);
}

/** Whistle sound — like a teacher's whistle for roll call. */
export function playWhistle() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(2000, now);
  osc.frequency.linearRampToValueAtTime(2400, now + 0.15);
  osc.frequency.linearRampToValueAtTime(2000, now + 0.3);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.25);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  const vibrato = ctx.createOscillator();
  vibrato.type = 'sine';
  vibrato.frequency.value = 20;
  const vibratoGain = ctx.createGain();
  vibratoGain.gain.value = 30;
  vibrato.connect(vibratoGain).connect(osc.frequency);
  vibrato.start(now);
  vibrato.stop(now + 0.35);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.36);
}

/** Drum roll — for announcements and assembly. */
export function playDrumRoll() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const rolls = 12;
  for (let i = 0; i < rolls; i++) {
    const t = now + i * 0.06;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 150 + Math.random() * 30;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  }
  // Final bang
  const t = now + rolls * 0.06;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(80, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.26);
}

/** "Ta-da!" fanfare — for celebrations. */
export function playTada() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const notes = [
    { freq: 523.25, t: 0 },    // C5
    { freq: 659.25, t: 0.12 }, // E5
    { freq: 783.99, t: 0.24 }, // G5
    { freq: 1046.5, t: 0.36 }, // C6
  ];
  notes.forEach(({ freq, t }) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now + t);
    gain.gain.linearRampToValueAtTime(0.15, now + t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + t);
    osc.stop(now + t + 0.31);
  });
}

/** Gentle "shhh" — for lights out / quiet time. */
export function playShush() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const bufferSize = ctx.sampleRate * 0.5;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.3;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 3000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.08, now + 0.1);
  gain.gain.linearRampToValueAtTime(0.08, now + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  noise.connect(filter).connect(gain).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + 0.5);
}
