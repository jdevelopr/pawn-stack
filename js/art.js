/**
 * art.js - all pixel drawing (Mars, 2149). Everything is drawn at integer coordinates on a
 * 384x216 canvas that CSS scales by a whole number, so every pixel lands on the grid.
 */
import { drawItem, ITEMS } from './items.js';

export const W = 384, H = 216, WORLD_W = 960, FLOOR = 184;
export const O = '#211a2b';
const EYE = '#1a1220'; // facial features stay dark; outlines (O) on characters get softened

export const ZONES = {
  counter: { x0: 268, x1: 348, label: 'COUNTER' },
  shelves: { x0: 362, x1: 690, label: 'SHELVES' },
  office: { x0: 800, x1: 950, label: 'OFFICE' },
};
export const COUNTER_X = 290;   // where the keeper stands at the counter
export const CUSTOMER_X = 228;  // where customers stand

/* ------------------------------------------------------------- 3x5 font --- */
const G = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010',
  8: '111101111101111', 9: '111101111001110',
  $: '011110010011110', '.': '000000000000010', ',': '000000000010100', '!': '010010010000010',
  '?': '110001010000010', "'": '010010000000000', '-': '000000111000000', ':': '000010000010000',
  '/': '001001010100100', '%': '101001010100101', '+': '000010111010000', '(': '010100100100010',
  ')': '010001001001010', '&': '010101010101011', '#': '101111101111101', '"': '101101000000000',
  ' ': '000000000000000', '<': '001010100010001', '>': '100010001010100', '=': '000111000111000',
};
export const textW = (s, sc = 1) => (s.length * 4 - 1) * sc;
export function pixelText(ctx, str, x, y, col, sc = 1) {
  str = String(str).toUpperCase();
  ctx.fillStyle = col;
  let cx = Math.round(x);
  const cy = Math.round(y);
  for (const ch of str) {
    const g = ch === '$' ? G.S : (G[ch] || G['?']);
    if (ch === '$') { ctx.fillRect(cx + sc, cy - sc, sc, sc); ctx.fillRect(cx + sc, cy + 5 * sc, sc, sc); }
    for (let i = 0; i < 15; i++) if (g[i] === '1') ctx.fillRect(cx + (i % 3) * sc, cy + ((i / 3) | 0) * sc, sc, sc);
    cx += 4 * sc;
  }
}
export function pixelTextOutlined(ctx, str, x, y, col, sc = 1, oc = O) {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) pixelText(ctx, str, x + dx, y + dy, oc, sc);
  pixelText(ctx, str, x, y, col, sc);
}

/** Word-wrap into lines of at most n chars. */
export function wrap(str, n) {
  const words = String(str).split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > n) { if (cur) lines.push(cur); cur = w; }
    else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

export function bubble(ctx, x, y, text, col = '#fffaf0') {
  const lines = wrap(text, 22).slice(0, 3);
  const w = Math.max(...lines.map(l => textW(l))) + 8;
  const h = lines.length * 7 + 5;
  const bx = Math.round(Math.max(2, Math.min(x - w / 2, 99999))), by = Math.round(y - h);
  ctx.fillStyle = O;
  ctx.fillRect(bx + 1, by, w - 2, h); ctx.fillRect(bx, by + 1, w, h - 2);
  ctx.fillStyle = col;
  ctx.fillRect(bx + 1, by + 1, w - 2, h - 2);
  // tail
  ctx.fillStyle = O; ctx.fillRect(Math.round(x) - 2, by + h, 4, 1); ctx.fillRect(Math.round(x) - 1, by + h + 1, 2, 1);
  ctx.fillStyle = col; ctx.fillRect(Math.round(x) - 1, by + h - 1, 2, 1);
  lines.forEach((l, i) => pixelText(ctx, l, bx + 4, by + 3 + i * 7, '#2a2238'));
}

/* --------------------------------------------------------------- people --- */
const SKIN = ['#f1c9a5', '#e0a77c', '#c68456', '#8d5a3b', '#5e3a26', '#f6d7c0'];
const HAIR = ['#2b1d16', '#5a3a22', '#a8643a', '#e6c26a', '#d9d4cc', '#1d1d2a', '#9e3b2f', '#6c6a74'];
const SHIRT = ['#d6453d', '#3f7fd6', '#4caf50', '#f4c542', '#8c56c9', '#ec8a2f', '#2fb5b0', '#e8e2d4', '#555064', '#c2577e'];
const PANTS = ['#2d3a5c', '#3b3646', '#5a4632', '#6b6f7a', '#2f4a3a', '#7a5a3a'];

export function lookFromSeed(seed) {
  let s = seed >>> 0;
  const r = n => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return (s >>> 8) % n; };
  return {
    skin: SKIN[r(SKIN.length)], hair: HAIR[r(HAIR.length)], shirt: SHIRT[r(SHIRT.length)],
    pants: PANTS[r(PANTS.length)], style: r(4), hat: r(5) === 0 ? SHIRT[r(SHIRT.length)] : null,
    tall: r(3),
  };
}

function shadeHex(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = v => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

/** Person (14x34) with feet at (x, y). frame: 0 idle, 1/2 walk. dir: 1 right, -1 left. */
export function drawPerson(ctx, x, y, L, frame = 0, dir = 1, extra = {}) {
  const X = Math.round(x) - 7, Y = Math.round(y) - 34 - (L.tall === 2 ? 1 : 0);
  const r = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(X + a, Y + b, w, h); };
  const f = dir > 0;
  const lx = frame === 1 ? 2 : frame === 2 ? 4 : 3;
  const rx = frame === 1 ? 9 : frame === 2 ? 7 : 8;
  const pd = shadeHex(L.pants, 0.75), sd = shadeHex(L.shirt, 0.72), sk = shadeHex(L.skin, 0.8);
  // back leg then front leg
  for (const [lgx, back] of [[f ? lx : rx, true], [f ? rx : lx, false]]) {
    r(lgx - 1, 24, 5, 10, O);
    r(lgx, 24, 3, 8, back ? pd : L.pants);
    r(lgx + (f ? 0 : -1), 32, 4, 1, '#2a2230');
  }
  // torso
  r(1, 12, 12, 13, O);
  r(2, 13, 10, 11, L.shirt);
  r(f ? 2 : 11, 13, 1, 11, sd);
  r(2, 23, 10, 1, '#3a3346');
  if (extra.apron) { r(4, 15, 7, 10, extra.apron); r(4, 15, 7, 1, shadeHex(extra.apron, 1.3)); r(f ? 4 : 10, 13, 1, 2, extra.apron); }
  if (extra.tie) { r(6, 13, 2, 7, extra.tie); }
  if (extra.badge) { r(f ? 9 : 4, 15, 2, 2, '#f2c14e'); }
  // front arm with a little swing
  const sw = frame === 1 ? 1 : frame === 2 ? -1 : 0;
  const ax = (f ? 7 : 5) + sw;
  r(ax - 1, 13, 4, 10, O); r(ax, 14, 2, 7, sd); r(ax, 21, 2, 2, L.skin);
  // head
  r(2, 0, 10, 13, O);
  r(3, 1, 8, 11, L.skin);
  r(6, 12, 3, 1, sk);
  if (L.style !== 2) { r(3, 1, 8, 3, L.hair); r(f ? 3 : 9, 4, 2, 3, L.hair); }
  if (L.style === 1) { r(f ? 3 : 10, 4, 1, 7, L.hair); r(2, 2, 1, 8, O); r(11, 2, 1, 8, O); }
  if (L.style === 3) { r(4, 0, 6, 1, L.hair); r(3, 0, 8, 1, O); }
  if (L.style === 2) { r(f ? 3 : 10, 5, 1, 3, L.hair); }
  const ex = f ? 8 : 5;
  r(ex, 5, 1, 2, EYE);
  r(f ? 11 : 2, 6, 1, 2, L.skin); r(f ? 12 : 1, 6, 1, 2, O);
  r(f ? 7 : 5, 9, 3, 1, sk);
  if (extra.monocle) { r(ex - 1, 4, 3, 1, '#f2c14e'); r(ex - 1, 7, 3, 1, '#f2c14e'); r(ex - 1, 5, 1, 2, '#f2c14e'); r(ex + 1, 5, 1, 2, '#f2c14e'); r(ex + 1, 8, 1, 4, '#f2c14e'); }
  if (extra.glasses) { r(ex - 1, 5, 3, 2, '#2a2230'); }
  const hat = extra.hat || L.hat;
  if (hat) {
    r(3, -3, 8, 5, O); r(4, -2, 6, 3, hat);
    r(f ? 2 : 0, 1, 12, 2, O); r(f ? 3 : 1, 1, 10, 1, hat);
  }
  if (extra.carry != null) drawItem(ctx, extra.carry, Math.round(x) - 7, Y - 16);
}

/* ---------------------------------------------------------------- scene --- */
// Mars sky: butterscotch by day, and famously blue at sunset.
const SKY = {
  dawn: ['#e9a07a', '#d98a72', '#a86a7e', '#5a4a7a'],
  buy: ['#f2c79a', '#e8b48a', '#dca27c', '#cf906e'],
  noon: ['#f6cfa2', '#ecbb90', '#e0a982', '#d49674'],
  sell: ['#d9a07a', '#b88a8a', '#7f8fb8', '#5f84c8'],
  evening: ['#241a44', '#1b1538', '#130f2a', '#0c0a1e'],
  lobby: ['#f2c79a', '#e8b48a', '#dca27c', '#cf906e'],
  over: ['#241a44', '#1b1538', '#130f2a', '#0c0a1e'],
};

function rng(seed) { let s = seed; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
const MESAS = (() => {
  const r = rng(11); const out = []; let x = -60;
  while (x < 560) { const w = 40 + ((r() * 60) | 0); out.push({ x, w, h: 24 + ((r() * 44) | 0), step: 4 + ((r() * 8) | 0) }); x += w - 10; }
  return out;
})();
const DOMES = [{ x: 20, r: 26 }, { x: 96, r: 16 }, { x: 150, r: 34 }, { x: 250, r: 20 }, { x: 330, r: 28 }, { x: 430, r: 18 }];
const ROCKS = (() => { const r = rng(5); return Array.from({ length: 22 }, () => ({ x: (r() * 196) | 0, y: FLOOR + 2 + ((r() * 28) | 0), w: 2 + ((r() * 5) | 0) })); })();

function rect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
function disc(ctx, cx, cy, r, c) { for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy)); rect(ctx, cx - w, cy + dy, w * 2, 1, c); } }
function dome(ctx, cx, base, r, c, glass) {
  for (let dy = 0; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy)); rect(ctx, cx - w, base - dy, w * 2, 1, c); }
  for (let dy = 2; dy <= r - 2; dy++) { const w = Math.round(Math.sqrt((r - 2) * (r - 2) - dy * dy)); rect(ctx, cx - w, base - dy, w * 2, 1, glass); }
  rect(ctx, cx - r, base, r * 2, 2, c);
  for (const k of [-0.5, 0, 0.5]) { const rx = Math.round(cx + k * r); const hh = Math.round(Math.sqrt(Math.max(0, r * r - (k * r) ** 2))); rect(ctx, rx, base - hh + 1, 1, hh, c); }
  rect(ctx, cx - Math.round(r * 0.55), base - Math.round(r * 0.72), Math.max(2, Math.round(r * 0.25)), 1, '#ffffff');
}

export function drawScene(ctx, cam, S) {
  const phase = S.phase || 'buy';
  const night = phase === 'evening' || phase === 'over';
  const t = S.t || 0;
  const sky = SKY[phase] || SKY.buy;
  const bh = Math.ceil(FLOOR / sky.length);
  sky.forEach((c, i) => rect(ctx, 0, i * bh, W, bh, c));
  if (night || phase === 'dawn') {
    const r = rng(3);
    for (let i = 0; i < 60; i++) rect(ctx, (r() * W) | 0, (r() * 120) | 0, 1, 1, i % 7 ? '#fff6d8' : '#a0d8ff');
  }
  // sun, moons, and a tiny blue Earth
  const sx = 40 - Math.round(cam * 0.05);
  if (night) {
    disc(ctx, sx + 40, 30, 5, '#c9b8a0'); rect(ctx, sx + 38, 28, 2, 2, '#a89880');   // Phobos
    disc(ctx, sx + 110, 52, 3, '#d8c8b0');                                          // Deimos
    rect(ctx, sx + 160, 40, 2, 2, '#5fb0ff'); rect(ctx, sx + 161, 39, 1, 1, '#c0e4ff'); // Earth
  } else if (phase !== 'sell') {
    disc(ctx, sx + 120, phase === 'dawn' ? 90 : 34, 5, '#fff2d6');
  } else disc(ctx, sx + 140, 110, 5, '#e6f0ff');
  // far mesas, parallax 0.3
  const p1 = Math.round(cam * 0.3);
  const mesa = night ? '#3a2438' : phase === 'sell' ? '#8a5a5a' : '#b8664a';
  const mesaD = night ? '#2a1a2a' : phase === 'sell' ? '#6a4448' : '#9a5038';
  for (const m of MESAS) {
    const mx = m.x - p1;
    if (mx > W || mx + m.w < 0) continue;
    rect(ctx, mx + m.step, FLOOR - m.h, m.w - m.step * 2, m.h, mesa);
    rect(ctx, mx, FLOOR - m.h + m.step, m.w, m.h - m.step, mesa);
    rect(ctx, mx, FLOOR - m.h + m.step + 6, m.w, 2, mesaD);
  }
  // colony domes, parallax 0.55
  const p2 = Math.round(cam * 0.55);
  for (const d of DOMES) {
    const dx = d.x - p2;
    if (dx + d.r < 0 || dx - d.r > W) continue;
    dome(ctx, dx, FLOOR - 4, d.r, night ? '#4a4a64' : '#c8ccd8', night ? '#3a5a8a' : '#9fd0e8');
    for (let i = -d.r + 6; i < d.r - 6; i += 7) rect(ctx, dx + i, FLOOR - 9, 3, 3, night ? ((i + d.x) % 3 ? '#ffd27a' : '#6ef0e0') : '#e8f4ff');
  }
  ctx.save();
  ctx.translate(-cam, 0);
  // regolith
  rect(ctx, -10, FLOOR, 218, H - FLOOR, night ? '#5a2e26' : '#b65a3a');
  rect(ctx, -10, FLOOR, 218, 2, night ? '#6e3a2e' : '#d0744c');
  for (const r of ROCKS) { rect(ctx, r.x, r.y, r.w, 2, night ? '#43221c' : '#8e4228'); rect(ctx, r.x, r.y, r.w - 1, 1, night ? '#6e3a2e' : '#d27a52'); }
  // landing pad and beacon
  rect(ctx, 40, FLOOR + 6, 80, 3, '#5d616e'); for (let x = 42; x < 118; x += 8) rect(ctx, x, FLOOR + 6, 4, 3, '#f2c14e');
  rect(ctx, 96, 120, 2, 64, '#3a3646'); rect(ctx, 92, 116, 10, 4, '#3a3646');
  rect(ctx, 96, 112, 2, 4, '#8f949e');
  if (Math.floor(t / 600) % 2) { rect(ctx, 95, 110, 4, 3, '#ff4a5a'); rect(ctx, 96, 109, 2, 1, '#ffb0a8'); }
  else rect(ctx, 95, 110, 4, 3, '#7a2a30');
  // parked rover
  rect(ctx, 20, 164, 38, 12, O); rect(ctx, 21, 165, 36, 10, '#e8e2d4'); rect(ctx, 40, 157, 16, 9, O); rect(ctx, 41, 158, 14, 7, '#7cc6f2');
  rect(ctx, 22, 168, 34, 2, '#ec8a2f');
  for (const wx of [24, 36, 48]) { rect(ctx, wx, 174, 8, 8, O); rect(ctx, wx + 2, 176, 4, 4, '#5d616e'); }

  // shop hull + neon sign
  rect(ctx, 194, 0, 14, 140, '#5d616e');
  for (let y = 6; y < 140; y += 10) { rect(ctx, 194, y, 14, 1, '#4a4d58'); rect(ctx, 196, y + 3, 1, 1, '#8f949e'); rect(ctx, 205, y + 3, 1, 1, '#8f949e'); }
  drawSign(ctx, S.signLevel || 0, night, t);

  // interior back wall: metal panels
  rect(ctx, 208, 0, WORLD_W - 208, 14, '#1c1f2e');
  rect(ctx, 208, 14, WORLD_W - 208, 126, '#3e4a5e');
  for (let x = 208; x < WORLD_W; x += 32) {
    rect(ctx, x, 14, 1, 122, '#2c3546'); rect(ctx, x + 1, 16, 1, 120, '#4c5a72');
    rect(ctx, x + 3, 18, 1, 1, '#6a7890'); rect(ctx, x + 28, 18, 1, 1, '#6a7890');
    rect(ctx, x + 3, 132, 1, 1, '#6a7890'); rect(ctx, x + 28, 132, 1, 1, '#6a7890');
  }
  rect(ctx, 208, 22, WORLD_W - 208, 3, '#2c3546'); rect(ctx, 208, 23, WORLD_W - 208, 1, '#55657e'); // conduit
  rect(ctx, 208, 14, WORLD_W - 208, 2, '#6a7890');
  rect(ctx, 208, 136, WORLD_W - 208, 48, '#2c3546');
  rect(ctx, 208, 136, WORLD_W - 208, 2, night ? '#4fe0d0' : '#55657e');
  for (let x = 208; x < WORLD_W; x += 32) { rect(ctx, x, 138, 1, 46, '#1e2533'); rect(ctx, x + 1, 138, 1, 46, '#36415a'); }
  // floor: grating
  // floor: clean deck plates, seams aligned with the wall panels
  rect(ctx, 208, FLOOR, WORLD_W - 208, H - FLOOR, '#4a4d58');
  rect(ctx, 208, FLOOR, WORLD_W - 208, 1, '#8f949e');
  rect(ctx, 208, FLOOR + 1, WORLD_W - 208, 1, '#6b6f7a');
  rect(ctx, 208, FLOOR + 15, WORLD_W - 208, 1, '#3a3d46');
  rect(ctx, 208, FLOOR + 16, WORLD_W - 208, 1, '#5d616e');
  for (let x = 208; x < WORLD_W; x += 32) {
    rect(ctx, x, FLOOR + 2, 1, 13, '#3a3d46'); rect(ctx, x + 16, FLOOR + 17, 1, H - FLOOR - 17, '#3a3d46');
    rect(ctx, x + 3, FLOOR + 4, 1, 1, '#6b6f7a'); rect(ctx, x + 28, FLOOR + 4, 1, 1, '#6b6f7a');
  }
  // airlock door frame with hazard stripes
  rect(ctx, 194, 140, 4, 44, '#2a2d38'); rect(ctx, 204, 140, 4, 44, '#2a2d38');
  for (let y = 140; y < 184; y += 6) { rect(ctx, 194, y, 4, 3, '#f2c14e'); rect(ctx, 204, y + 3, 4, 3, '#f2c14e'); }
  rect(ctx, 192, 136, 18, 4, '#2a2d38'); rect(ctx, 198, 137, 6, 2, night ? '#6ef06e' : '#3a8a3a');
  // porthole behind the counter
  disc(ctx, 244, 62, 21, O); disc(ctx, 244, 62, 19, '#8f949e'); disc(ctx, 244, 62, 16, O); disc(ctx, 244, 62, 15, sky[2]);
  if (!night) { rect(ctx, 230, 66, 28, 11, mesa); rect(ctx, 236, 62, 14, 4, mesa); } else { rect(ctx, 238, 54, 1, 1, '#fff6d8'); rect(ctx, 250, 60, 1, 1, '#fff6d8'); rect(ctx, 242, 70, 2, 2, '#c9b8a0'); }
  rect(ctx, 234, 50, 3, 1, '#e8f4ff'); rect(ctx, 233, 51, 1, 2, '#e8f4ff');
  for (const [bx, by] of [[244, 42], [264, 62], [244, 82], [224, 62]]) rect(ctx, bx - 1, by - 1, 2, 2, '#c9ced8');
  // strip lights
  for (const lx of [300, 470, 640, 860]) {
    rect(ctx, lx - 14, 14, 28, 4, '#1c1f2e');
    rect(ctx, lx - 12, 18, 24, 2, night ? '#bff8f0' : '#e8f4ff');

  }
  // office bulkhead
  rect(ctx, 786, 14, 8, 34, '#2c3546'); rect(ctx, 786, 48, 8, 2, '#f2c14e');

  drawShelves(ctx, S.inv || [], night);

  // workbench with tool rack
  rect(ctx, 698, 70, 68, 42, O); rect(ctx, 700, 72, 64, 38, '#55657e');
  for (let y = 76; y < 108; y += 6) for (let x = 704; x < 762; x += 6) rect(ctx, x, y, 1, 1, '#3e4a5e');
  rect(ctx, 708, 78, 2, 16, '#c9ced8'); rect(ctx, 705, 76, 8, 3, '#c9ced8');
  rect(ctx, 722, 80, 14, 4, '#ec8a2f'); rect(ctx, 734, 81, 4, 2, '#7cc6f2');
  rect(ctx, 746, 76, 3, 20, '#8f949e'); rect(ctx, 745, 94, 5, 3, '#f2c14e');
  rect(ctx, 698, 158, 70, 6, '#6b6f7a'); rect(ctx, 698, 158, 70, 1, '#9aa0ad');
  rect(ctx, 702, 164, 4, 20, '#3a3d46'); rect(ctx, 758, 164, 4, 20, '#3a3d46');
  if ((S.up?.restore || 0) > 0) { rect(ctx, 716, 150, 14, 8, '#c9ced8'); rect(ctx, 718, 152, 10, 4, '#4fe0d0'); rect(ctx, 740, 152, 10, 6, '#ec8a2f'); }

  // office: holo upgrade board, desk with comm screen, vault
  rect(ctx, 820, 54, 80, 58, O); rect(ctx, 822, 56, 76, 54, '#14202e');
  for (let i = 0; i < 6; i++) {
    const nx = 828 + (i % 3) * 23, ny = 62 + ((i / 3) | 0) * 24;
    const c = ['#4fe0d0', '#ffb347', '#ff6fa8', '#8cf06e', '#7cc6f2', '#ffb347'][i];
    rect(ctx, nx, ny, 18, 18, O); rect(ctx, nx + 1, ny + 1, 16, 16, '#1d2c3e');
    rect(ctx, nx + 3, ny + 4, 12, 2, c); rect(ctx, nx + 3, ny + 9, 8, 1, c); rect(ctx, nx + 3, ny + 12, 10, 1, c);
  }
  if (Math.floor(t / 400) % 2) rect(ctx, 822, 56, 76, 1, '#4fe0d0');
  pixelText(ctx, 'UPGRADES', 844, 46, '#4fe0d0');
  rect(ctx, 850, 158, 70, 5, '#6b6f7a'); rect(ctx, 854, 163, 4, 21, '#3a3d46'); rect(ctx, 912, 163, 4, 21, '#3a3d46');
  rect(ctx, 886, 144, 22, 14, O); rect(ctx, 887, 145, 20, 12, '#14202e'); rect(ctx, 889, 147, 16, 2, '#4fe0d0'); rect(ctx, 889, 151, 10, 1, '#4fe0d0');
  rect(ctx, 860, 152, 10, 6, '#c9ced8'); rect(ctx, 862, 150, 6, 2, '#ff6fa8');
  rect(ctx, 924, 150, 30, 34, O); rect(ctx, 925, 151, 28, 32, '#6b6f7a'); disc(ctx, 939, 166, 6, '#4a4d58'); disc(ctx, 939, 166, 3, '#9aa0ad'); rect(ctx, 938, 160, 2, 12, '#3a3d46');

  const sec = S.up?.security || 0;
  if (sec >= 1) drawCam(ctx, 232);
  if (sec >= 2) drawCam(ctx, 620);

  ctx.restore();
}

function drawCam(ctx, x) {
  rect(ctx, x, 14, 2, 4, '#1c1f2e'); rect(ctx, x - 4, 18, 10, 5, '#c9ced8'); rect(ctx, x - 6, 19, 3, 3, '#1c1f2e');
  rect(ctx, x + 4, 19, 1, 1, '#ff4a5a');
}

function drawSign(ctx, lvl, night, t) {
  const x = 104, y = 92, w = 90, h = 26;
  rect(ctx, 190, y + 5, 4, 2, '#3a3646'); rect(ctx, 190, y + h - 7, 4, 2, '#3a3646');
  const frame = ['#4a4d58', '#5d616e', '#8f949e', '#c9ced8', '#ffb347', '#4fe0d0'][lvl];
  rect(ctx, x, y, w, h, O); rect(ctx, x + 1, y + 1, w - 2, h - 2, frame);
  rect(ctx, x + 3, y + 3, w - 6, h - 6, '#14101e');
  const flick = lvl === 0 && night && Math.floor(t / 900) % 5 === 0;
  const glow = flick ? '#5a3040' : lvl >= 2 || night ? '#ff6f61' : '#d8a090';
  pixelText(ctx, 'RED PLANET', x + 6, y + 6, glow, 1);
  pixelText(ctx, 'PAWN', x + 6, y + 14, lvl >= 3 ? '#4fe0d0' : '#ffb347', 1);
  for (let i = 0; i < lvl; i++) rect(ctx, x + 26 + i * 5, y + 15, 3, 3, '#ffb347');
  // three planets, the pawnbroker's balls in orbit
  for (const [bx, by, c] of [[x + 70, y + 5, '#ff6f61'], [x + 78, y + 5, '#ffb347'], [x + 74, y + 13, '#4fe0d0']]) { rect(ctx, bx, by, 6, 6, O); rect(ctx, bx + 1, by + 1, 4, 4, c); rect(ctx, bx + 1, by + 1, 1, 1, '#fff'); }

}

export const SHELF_SLOTS = [];
for (const by of [112, 146, 180]) for (const ux of [370, 450, 530, 610]) for (const ix of [6, 27, 48]) SHELF_SLOTS.push([ux + ix, by - 14]);

function drawShelves(ctx, inv, night) {
  for (const ux of [370, 450, 530, 610]) {
    rect(ctx, ux, 78, 3, 106, '#2a2d38'); rect(ctx, ux + 65, 78, 3, 106, '#2a2d38');
    rect(ctx, ux + 3, 78, 62, 106, '#252d3c');
    for (const by of [112, 146]) { rect(ctx, ux, by, 68, 4, '#8f949e'); rect(ctx, ux, by + 3, 68, 1, night ? '#4fe0d0' : '#6b6f7a'); }
    rect(ctx, ux, 180, 68, 4, '#8f949e');
    rect(ctx, ux - 2, 74, 72, 4, '#8f949e'); rect(ctx, ux - 2, 77, 72, 1, '#ff6f61');
  }
  inv.slice(0, SHELF_SLOTS.length).forEach((it, i) => {
    const [x, y] = SHELF_SLOTS[i];
    drawItem(ctx, it.id, x, y);
  });
}

export function drawCounterFront(ctx, cam, S) {
  ctx.save(); ctx.translate(-cam, 0);
  rect(ctx, 242, 167, 90, 17, O);
  rect(ctx, 243, 169, 88, 15, '#4a4d58');
  for (let x = 247; x < 328; x += 21) { rect(ctx, x, 172, 17, 10, '#3a3d46'); rect(ctx, x + 2, 175, 1, 1, '#9aa0ad'); rect(ctx, x + 14, 175, 1, 1, '#9aa0ad'); }
  rect(ctx, 240, 164, 94, 4, '#9aa0ad'); rect(ctx, 240, 164, 94, 1, '#d8dde6');
  rect(ctx, 243, 181, 88, 1, '#4fe0d0');
  // holo-terminal
  rect(ctx, 310, 146, 22, 18, O); rect(ctx, 311, 147, 20, 16, '#6b6f7a'); rect(ctx, 313, 149, 16, 8, '#0f1a24');
  if (S.registerText) pixelText(ctx, S.registerText, 314, 151, '#4fe0d0');
  rect(ctx, 313, 159, 3, 2, '#ffb347'); rect(ctx, 318, 159, 3, 2, '#4fe0d0'); rect(ctx, 323, 159, 3, 2, '#ff6f61');
  if (S.counterItem != null) {
    drawItem(ctx, S.counterItem, 250, 150);
    rect(ctx, 249, 163, 16, 1, '#4fe0d0');
  }
  ctx.restore();
}

export function drawNight(ctx, phase) {
  if (phase === 'evening' || phase === 'over') {
    ctx.fillStyle = 'rgba(16,12,48,0.32)'; ctx.fillRect(0, 0, W, H);
  }
}

/* ------------------------------------------------------- crew & aliens --- */

/** Spacesuit with a bubble helmet. 14x34, feet at (x, y). */
export function drawAstronaut(ctx, x, y, L, frame = 0, dir = 1, extra = {}) {
  const X = Math.round(x) - 7, Y = Math.round(y) - 34;
  const r = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(X + a, Y + b, w, h); };
  const f = dir > 0;
  const suit = L.suit || '#e8ecf2', sd = shadeHex(suit, 0.78), acc = L.accent || '#ec8a2f';
  const lx = frame === 1 ? 2 : frame === 2 ? 4 : 3, rx = frame === 1 ? 9 : frame === 2 ? 7 : 8;
  r(f ? -2 : 12, 13, 5, 11, O); r(f ? -1 : 12, 14, 3, 9, '#9aa0ad'); r(f ? -1 : 12, 15, 3, 1, acc);
  for (const [lgx, back] of [[f ? lx : rx, true], [f ? rx : lx, false]]) {
    r(lgx - 1, 24, 5, 10, O); r(lgx, 24, 3, 7, back ? sd : suit); r(lgx - 1 + (f ? 1 : 0), 31, 4, 2, '#5d616e');
  }
  r(0, 12, 14, 13, O); r(1, 13, 12, 11, suit); r(f ? 1 : 12, 13, 1, 11, sd);
  r(1, 18, 12, 2, acc); r(f ? 8 : 3, 14, 3, 3, '#4fe0d0'); r(f ? 9 : 4, 15, 1, 1, '#ff6f61');
  const sw = frame === 1 ? 1 : frame === 2 ? -1 : 0, ax = (f ? 7 : 5) + sw;
  r(ax - 1, 13, 4, 11, O); r(ax, 14, 2, 7, sd); r(ax - 1 + 1, 21, 2, 3, '#9aa0ad');
  // helmet
  r(2, -1, 10, 14, O); r(1, 0, 12, 12, O);
  r(2, 0, 10, 12, '#e8ecf2'); r(3, 0, 8, 1, '#ffffff');
  r(f ? 4 : 2, 3, 8, 7, O); r(f ? 5 : 3, 4, 6, 5, L.visor || '#2a4a8a');
  r(f ? 6 : 4, 5, 2, 1, '#e8f4ff');
  if (L.faceVisible) { r(f ? 8 : 5, 6, 1, 1, EYE); }
  r(f ? 2 : 11, -4, 1, 4, '#8f949e'); r(f ? 2 : 11, -5, 1, 1, '#ff4a5a');
  if (extra.carry != null) drawItem(ctx, extra.carry, Math.round(x) - 7, Y - 18);
}

/** Grey: big head, huge black eyes, thin robed body. */
export function drawGrey(ctx, x, y, L, frame = 0, dir = 1, extra = {}) {
  const X = Math.round(x) - 7, Y = Math.round(y) - 35;
  const r = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(X + a, Y + b, w, h); };
  const f = dir > 0, skin = L.skin || '#b8c4c0', sk = shadeHex(skin, 0.78), robe = L.robe || '#6a4ab0';
  const lx = frame === 1 ? 4 : frame === 2 ? 6 : 5, rx = frame === 1 ? 9 : frame === 2 ? 7 : 8;
  for (const lg of [lx, rx]) { r(lg - 1, 27, 3, 8, O); r(lg, 27, 1, 7, sk); }
  r(3, 15, 9, 13, O); r(4, 16, 7, 11, robe); r(4, 22, 7, 1, '#ffb347'); r(f ? 4 : 10, 16, 1, 11, shadeHex(robe, 0.75));
  const ax = (f ? 8 : 5) + (frame === 1 ? 1 : frame === 2 ? -1 : 0);
  r(ax - 1, 16, 3, 11, O); r(ax, 17, 1, 9, sk); r(ax - 1, 26, 3, 1, skin);
  // head
  r(1, 0, 13, 12, O); r(0, 2, 15, 7, O); r(3, 11, 9, 3, O); r(5, 13, 5, 2, O);
  r(2, 1, 11, 10, skin); r(1, 3, 13, 5, skin); r(4, 11, 7, 2, skin); r(6, 13, 3, 1, sk);
  r(3, 1, 6, 1, shadeHex(skin, 1.12));
  const ex = f ? 7 : 2;
  r(ex, 4, 5, 4, '#0d0b14'); r(ex + (f ? 1 : 0), 8, 4, 1, '#0d0b14');
  r(ex + (f ? 1 : 3), 5, 1, 1, '#a0e8ff');
  r(f ? 4 : 8, 6, 2, 3, '#0d0b14');
  r(f ? 10 : 4, 11, 2, 1, sk);
  if (extra.carry != null) drawItem(ctx, extra.carry, Math.round(x) - 7, Y - 16);
}

/** Glorp: a wobbly gel blob with eye stalks. No legs; it oozes. */
export function drawGlorp(ctx, x, y, L, frame = 0, dir = 1, extra = {}, t = 0) {
  const body = L.body || '#7bd85a', bd = shadeHex(body, 0.72), bl = shadeHex(body, 1.2);
  const wob = Math.round(Math.sin(t / 160 + (L.seed || 0)) * (frame ? 1.5 : 0.8));
  const h = 20 + wob, w = 18 - wob;
  const X = Math.round(x) - Math.round(w / 2), base = Math.round(y);
  for (let i = 0; i < h; i++) {
    const k = i < 7 ? [0.45, 0.65, 0.78, 0.86, 0.92, 0.96, 1][i] : 1;
    const rw = Math.max(4, Math.round(w * k));
    const rx = X + Math.round((w - rw) / 2), ry = base - h + i;
    ctx.fillStyle = O; ctx.fillRect(rx, ry, rw, 1);
    if (i > 0 && i < h - 1) { ctx.fillStyle = i > h - 5 ? bd : body; ctx.fillRect(rx + 1, ry, rw - 2, 1); }
  }
  ctx.fillStyle = bl; ctx.fillRect(X + 4, base - h + 3, 3, 2); ctx.fillRect(X + 3, base - h + 5, 1, 3);
  ctx.fillStyle = shadeHex(body, 1.35); ctx.fillRect(X + 5, base - h + 9, 2, 2); ctx.fillRect(X + w - 6, base - 8, 2, 2);
  // eye stalks
  const f = dir > 0;
  for (const [sx, sh] of [[X + 5, 6], [X + w - 7, 8]]) {
    ctx.fillStyle = O; ctx.fillRect(sx, base - h - sh, 3, sh + 1);
    ctx.fillStyle = body; ctx.fillRect(sx + 1, base - h - sh + 1, 1, sh);
    ctx.fillStyle = O; ctx.fillRect(sx - 1, base - h - sh - 4, 5, 5);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(sx, base - h - sh - 3, 3, 3);
    ctx.fillStyle = '#0d0b14'; ctx.fillRect(sx + (f ? 2 : 0), base - h - sh - 2, 1, 1);
  }
  // mouth
  ctx.fillStyle = EYE; ctx.fillRect(X + Math.round(w / 2) - 3 + (f ? 2 : -2), base - 9, 6, 1); ctx.fillRect(X + Math.round(w / 2) - 4 + (f ? 2 : -2), base - 10, 1, 1); ctx.fillRect(X + Math.round(w / 2) + 3 + (f ? 2 : -2), base - 10, 1, 1);
  if (extra.carry != null) drawItem(ctx, extra.carry, Math.round(x) - 7, base - h - 28);
}

/** Zix: a lanky insectoid with antennae, compound eyes, four arms and wings. */
export function drawZix(ctx, x, y, L, frame = 0, dir = 1, extra = {}, t = 0) {
  const X = Math.round(x) - 7, Y = Math.round(y) - 34;
  const r = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(X + a, Y + b, w, h); };
  const f = dir > 0, sh = L.shell || '#7d4fc9', sd = shadeHex(sh, 0.7), acc = L.accent || '#4fe0d0';
  const flap = Math.floor(t / 90) % 2;
  // wings
  ctx.fillStyle = '#7fb4d8'; ctx.fillRect(X + (f ? -3 : 9), Y + 9 - flap, 8, 12 + flap);
  ctx.fillStyle = '#b8e4ff'; ctx.fillRect(X + (f ? -2 : 10), Y + 10 - flap, 6, 10 + flap);
  ctx.fillStyle = '#e8f8ff'; ctx.fillRect(X + (f ? -2 : 10), Y + 10 - flap, 1, 9);
  // legs
  const lx = frame === 1 ? 3 : frame === 2 ? 5 : 4, rx = frame === 1 ? 9 : frame === 2 ? 7 : 8;
  for (const lg of [lx, rx]) { r(lg - 1, 25, 3, 5, O); r(lg, 25, 1, 4, sd); r(lg + (f ? 0 : -1), 29, 3, 5, O); r(lg + (f ? 1 : 0), 30, 1, 3, sd); r(lg - 1 + (f ? 1 : 0), 33, 3, 1, O); }
  // abdomen & thorax segments
  r(3, 18, 9, 8, O); r(4, 19, 7, 6, sh); r(4, 21, 7, 1, sd); r(4, 23, 7, 1, sd);
  r(4, 11, 7, 8, O); r(5, 12, 5, 6, sh); r(5, 14, 5, 1, acc);
  // four arms
  for (const [ay, sw] of [[13, 0], [17, 1]]) {
    const ax = f ? 10 : 1;
    r(ax, ay, 3, 2, O); r(ax + (f ? 2 : -1), ay + 1 + sw, 2, 4, O); r(ax + (f ? 1 : 0), ay, 1, 1, sd);
  }
  // head
  r(3, 3, 9, 8, O); r(4, 4, 7, 6, sh); r(5, 9, 5, 2, O); r(6, 9, 3, 1, sd);
  const ex = f ? 8 : 4;
  r(ex, 5, 2, 2, '#ff4a5a'); r(ex - (f ? 3 : -3), 5, 1, 1, '#ff4a5a'); r(ex + (f ? 1 : -1), 8, 1, 1, '#ff4a5a');
  r(ex + (f ? 0 : 1), 5, 1, 1, '#ffd0d0');
  // antennae
  r(5, 0, 1, 3, O); r(9, -1, 1, 4, O); r(4, -1, 2, 1, acc); r(9, -2, 2, 1, acc);
  if (extra.carry != null) drawItem(ctx, extra.carry, Math.round(x) - 7, Y - 18);
}

/** Boxy shop droid used for staff. */
export function drawBot(ctx, x, y, L, dir = 1, t = 0, extra = {}) {
  const X = Math.round(x) - 7, Y = Math.round(y) - 33;
  const r = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(X + a, Y + b, w, h); };
  const body = L.body || '#c9ced8', bd = shadeHex(body, 0.72), f = dir > 0;
  r(3, 24, 3, 9, O); r(8, 24, 3, 9, O); r(4, 24, 1, 8, '#6b6f7a'); r(9, 24, 1, 8, '#6b6f7a'); r(2, 31, 10, 2, O);
  r(1, 12, 12, 13, O); r(2, 13, 10, 11, body); r(2, 22, 10, 2, bd);
  r(4, 15, 6, 4, '#14202e'); r(5 + (Math.floor(t / 300) % 4), 16, 1, 1, L.light || '#4fe0d0'); r(5, 17, 4, 1, '#ffb347');
  r(f ? 11 : 0, 14, 3, 8, O); r(f ? 12 : 1, 15, 1, 6, bd);
  r(2, 2, 10, 10, O); r(3, 3, 8, 8, body); r(3, 9, 8, 2, bd);
  r(f ? 5 : 3, 5, 6, 3, '#14202e');
  const scan = Math.floor(t / 120) % 6;
  r((f ? 5 : 3) + (scan < 3 ? scan : 5 - scan) * 2, 6, 2, 1, L.eye || '#ff4a5a');
  r(6, 0, 2, 2, O); r(6, -2, 2, 2, L.light || '#4fe0d0');
  if (extra.monocle) { r(f ? 10 : 2, 4, 2, 4, '#ffb347'); }
  if (extra.badge) { r(f ? 9 : 3, 14, 2, 2, '#ffb347'); }
}

/* ------------------------------------------------- outline-free characters --- */
// Characters are drawn once per pose into a small offscreen canvas, then every black
// outline pixel is replaced with a darker tone of the body part it borders. The result
// is cached, so each pose is processed only once.

const CHAR_W = 32, CHAR_H = 56, CX = 16, CY = 50;
const charCache = new Map();
const OUT = [0x21, 0x1a, 0x2b];

function softenOutlines(c) {
  const g = c.getContext('2d');
  const img = g.getImageData(0, 0, CHAR_W, CHAR_H), d = img.data;
  const isOut = i => d[i + 3] === 255 && d[i] === OUT[0] && d[i + 1] === OUT[1] && d[i + 2] === OUT[2];
  for (let pass = 0; pass < 3; pass++) {
    const todo = [];
    for (let y = 0; y < CHAR_H; y++) for (let x = 0; x < CHAR_W; x++) {
      const i = (y * CHAR_W + x) * 4;
      if (!isOut(i)) continue;
      // prefer the neighbour below/inside, then sides, then diagonals
      let src = -1;
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= CHAR_W || ny >= CHAR_H) continue;
        const j = (ny * CHAR_W + nx) * 4;
        if (d[j + 3] === 255 && !isOut(j)) { src = j; break; }
      }
      if (src >= 0) todo.push([i, d[src] * 0.66 | 0, d[src + 1] * 0.62 | 0, d[src + 2] * 0.7 | 0]);
    }
    if (!todo.length) break;
    for (const [i, r, gg, b] of todo) { d[i] = r; d[i + 1] = gg; d[i + 2] = b; }
  }
  for (let i = 0; i < d.length; i += 4) if (isOut(i)) d[i + 3] = 0;
  g.putImageData(img, 0, 0);
}

const DRAW = {
  person: (x, L, f, dir, ex) => drawPerson(x, CX, CY, L, f, dir, ex),
  astro: (x, L, f, dir, ex) => drawAstronaut(x, CX, CY, L, f, dir, ex),
  grey: (x, L, f, dir, ex) => drawGrey(x, CX, CY, L, f, dir, ex),
  glorp: (x, L, f, dir, ex, t) => drawGlorp(x, CX, CY, L, f, dir, ex, t),
  zix: (x, L, f, dir, ex, t) => drawZix(x, CX, CY, L, f, dir, ex, t),
  bot: (x, L, f, dir, ex, t) => drawBot(x, CX, CY, L, dir, t, ex),
};

/** Animated state that changes the drawing, reduced to a small cache key. */
function animKey(kind, L, frame, t) {
  if (kind === 'glorp') return Math.round(Math.sin(t / 160 + (L.seed || 0)) * (frame ? 1.5 : 0.8));
  if (kind === 'zix') return Math.floor(t / 90) % 2;
  if (kind === 'bot') return (Math.floor(t / 120) % 6) + ':' + (Math.floor(t / 300) % 4);
  return 0;
}

/** Draw any character (no black outline) with feet at (x, y). */
export function drawChar(ctx, kind, x, y, L, frame = 0, dir = 1, extra = {}, t = 0) {
  const { carry, ...ex } = extra;
  const a = animKey(kind, L, frame, t);
  const key = kind + '|' + JSON.stringify(L) + '|' + frame + '|' + dir + '|' + JSON.stringify(ex) + '|' + a;
  let c = charCache.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = CHAR_W; c.height = CHAR_H;
    // freeze time to the cached animation state
    const tt = kind === 'glorp' || kind === 'zix' || kind === 'bot' ? t : 0;
    DRAW[kind](c.getContext('2d'), L, frame, dir, ex, tt);
    softenOutlines(c);
    if (charCache.size > 600) charCache.clear();
    charCache.set(key, c);
  }
  ctx.drawImage(c, Math.round(x) - CX, Math.round(y) - CY);
  if (carry != null) drawItem(ctx, carry, Math.round(x) - 7, Math.round(y) - 54);
}

export { drawItem, ITEMS };
