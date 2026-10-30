/** sound.js — tiny WebAudio blips. No assets. */
let ac = null;
let muted = false;
try { muted = localStorage.getItem('pawn-mute') === '1'; } catch {}

export const isMuted = () => muted;
export function setMuted(v) { muted = v; try { localStorage.setItem('pawn-mute', v ? '1' : '0'); } catch {} }

function tone(freq, dur, type = 'square', vol = 0.05, when = 0, slide = 0) {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; } }
  if (ac.state === 'suspended') ac.resume();
  const t = ac.currentTime + when;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ac.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

const SFX = {
  click: () => tone(660, 0.05),
  tick: () => tone(880, 0.03, 'square', 0.03),
  open: () => { tone(440, 0.05); tone(660, 0.05, 'square', 0.05, 0.05); },
  step: () => tone(120, 0.03, 'triangle', 0.03),
  buy: () => { tone(523, 0.08); tone(659, 0.08, 'square', 0.05, 0.08); tone(784, 0.14, 'square', 0.05, 0.16); },
  sell: () => { for (let i = 0; i < 4; i++) tone(988 + i * 120, 0.06, 'square', 0.04, i * 0.06); },
  haggle: () => tone(392, 0.1, 'triangle', 0.08, 0, 80),
  strike: () => tone(180, 0.18, 'sawtooth', 0.05, 0, -80),
  err: () => tone(150, 0.12, 'square', 0.04),
  lose: () => { tone(330, 0.1); tone(262, 0.16, 'square', 0.05, 0.1); },
  upgrade: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.08, 'square', 0.05, i * 0.07)); },
  day: () => { [392, 523, 659].forEach((f, i) => tone(f, 0.12, 'triangle', 0.08, i * 0.1)); },
  join: () => { tone(523, 0.06); tone(784, 0.1, 'square', 0.05, 0.06); },
  ready: () => tone(740, 0.08, 'triangle', 0.08),
};

export function sfx(name) { if (!muted && SFX[name]) try { SFX[name](); } catch {} }
