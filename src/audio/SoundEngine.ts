// Procedural sound effects using Web Audio API — no external files

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// ── Bubble pop ──────────────────────────────
export function playBubble(pitch = 1): void {
  const ac = getCtx();
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200 * pitch, t);
  osc.frequency.exponentialRampToValueAtTime(80 * pitch, t + 0.08);
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.1);
}

// ── Ingredient drop / plop ──────────────────
export function playPlop(): void {
  const ac = getCtx();
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, t);
  osc.frequency.exponentialRampToValueAtTime(60, t + 0.15);
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.linearRampToValueAtTime(0.15, t + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.2);
}

// ── Sizzle (white noise filtered) ───────────
export function playSizzle(duration = 0.5): void {
  const ac = getCtx();
  const t = ac.currentTime;
  const bufferSize = ac.sampleRate * duration;
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.3;
  }
  const source = ac.createBufferSource();
  source.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(3000, t);
  filter.frequency.exponentialRampToValueAtTime(800, t + duration);
  filter.Q.value = 2;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.linearRampToValueAtTime(0.12, t + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  source.connect(filter).connect(gain).connect(ac.destination);
  source.start(t);
}

// ── Bubbling loop (multiple bubbles over time) ──
let bubblingTimeout: number | null = null;

export function startBubbling(): void {
  stopBubbling();
  let count = 0;
  const doBubble = () => {
    if (count > 40) return;
    const pitch = 0.6 + Math.random() * 0.8;
    playBubble(pitch);
    count++;
    const interval = 80 + Math.random() * 200;
    bubblingTimeout = window.setTimeout(doBubble, interval);
  };
  doBubble();
}

export function stopBubbling(): void {
  if (bubblingTimeout !== null) {
    clearTimeout(bubblingTimeout);
    bubblingTimeout = null;
  }
}

// ── Liquid pour / swirl ─────────────────────
export function playPour(): void {
  const ac = getCtx();
  const t = ac.currentTime;
  const duration = 0.6;
  const bufferSize = ac.sampleRate * duration;
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.2;
  }
  const source = ac.createBufferSource();
  source.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(400, t);
  filter.frequency.linearRampToValueAtTime(1200, t + 0.2);
  filter.frequency.linearRampToValueAtTime(600, t + duration);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0, t);
  gain.gain.linearRampToValueAtTime(0.1, t + 0.1);
  gain.gain.linearRampToValueAtTime(0.06, t + duration * 0.8);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  source.connect(filter).connect(gain).connect(ac.destination);
  source.start(t);
}

// ── Success chime (ascending notes) ─────────
export function playSuccessChime(): void {
  const ac = getCtx();
  const t = ac.currentTime;
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const start = t + i * 0.12;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(start + 0.4);
  });
}

// ── Masterwork fanfare ──────────────────────
export function playMasterworkFanfare(): void {
  const ac = getCtx();
  const t = ac.currentTime;
  // Shimmering chord
  const freqs = [523, 659, 784, 1047, 1318];
  freqs.forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = i < 3 ? 'triangle' : 'sine';
    osc.frequency.value = freq;
    const delay = i * 0.06;
    gain.gain.setValueAtTime(0, t + delay);
    gain.gain.linearRampToValueAtTime(0.1, t + delay + 0.03);
    gain.gain.setValueAtTime(0.1, t + delay + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.8);
    osc.connect(gain).connect(ac.destination);
    osc.start(t + delay);
    osc.stop(t + delay + 0.8);
  });
}

// ── Forage rustle ───────────────────────────
export function playRustle(): void {
  const ac = getCtx();
  const t = ac.currentTime;
  const duration = 0.3;
  const bufferSize = ac.sampleRate * duration;
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.15;
  }
  const source = ac.createBufferSource();
  source.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2000;
  filter.Q.value = 1;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.06, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  source.connect(filter).connect(gain).connect(ac.destination);
  source.start(t);
}

// ── Coin collect ────────────────────────────
export function playCoin(): void {
  const ac = getCtx();
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(1200, t);
  osc.frequency.setValueAtTime(1600, t + 0.06);
  gain.gain.setValueAtTime(0.06, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.15);
}
