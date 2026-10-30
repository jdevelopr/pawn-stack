/**
 * art.js — all pixel drawing. Everything is drawn at integer coordinates on a
 * 384x216 canvas that CSS scales by a whole number, so every pixel lands on the grid.
 */
import { drawItem, ITEMS } from './items.js';

export const W = 384, H = 216, WORLD_W = 960, FLOOR = 184;
export const O = '#211a2b';

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
  r(ex, 5, 1, 2, O);
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
const SKY = {
  dawn: ['#f7b267', '#f4845f', '#c56a8a', '#6d5a8f'],
  buy: ['#9fd8ff', '#7cc6f2', '#62afe6', '#4d93cf'],
  noon: ['#a9e0ff', '#86cff7', '#6cbcec', '#57a5dd'],
  sell: ['#ffd38a', '#f7b267', '#e98a6a', '#b06a7e'],
  evening: ['#3a2f6b', '#2a2457', '#1c1a40', '#12122b'],
  lobby: ['#9fd8ff', '#7cc6f2', '#62afe6', '#4d93cf'],
  over: ['#3a2f6b', '#2a2457', '#1c1a40', '#12122b'],
};

function rng(seed) { let s = seed; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
const BUILDINGS = (() => {
  const r = rng(7); const out = []; let x = -40;
  while (x < 520) { const w = 30 + ((r() * 30) | 0); out.push({ x, w, h: 50 + ((r() * 70) | 0), c: ['#4a4568', '#56507a', '#3e3a5a', '#5e5780'][(r() * 4) | 0] }); x += w + 4; }
  return out;
})();

function rect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }

export function drawScene(ctx, cam, S) {
  const phase = S.phase || 'buy';
  const night = phase === 'evening' || phase === 'over';
  // sky in bands
  const sky = SKY[phase] || SKY.buy;
  const bh = Math.ceil(FLOOR / sky.length);
  sky.forEach((c, i) => rect(ctx, 0, i * bh, W, bh, c));
  if (night) { const r = rng(3); for (let i = 0; i < 40; i++) rect(ctx, (r() * W) | 0, (r() * 110) | 0, 1, 1, '#fff6d8'); }
  // buildings, parallax 0.5
  const px = Math.round(cam * 0.5);
  for (const b of BUILDINGS) {
    const bx = b.x - px;
    if (bx > W || bx + b.w < 0) continue;
    rect(ctx, bx, FLOOR - b.h, b.w, b.h, b.c);
    for (let wy = FLOOR - b.h + 6; wy < FLOOR - 12; wy += 10)
      for (let wx = bx + 4; wx < bx + b.w - 5; wx += 8)
        rect(ctx, wx, wy, 4, 5, night ? ((wx * 7 + wy) % 3 ? '#f7d774' : '#2e2a46') : '#9ab6d8');
  }
  ctx.save();
  ctx.translate(-cam, 0);
  // street
  rect(ctx, -10, FLOOR, 216, 10, '#8f8a96');
  for (let x = 0; x < 206; x += 16) rect(ctx, x, FLOOR, 1, 10, '#6f6a78');
  rect(ctx, -10, FLOOR + 10, 216, H - FLOOR - 10, '#3b3843');
  for (let x = 4; x < 206; x += 28) rect(ctx, x, FLOOR + 21, 14, 2, '#e8e2d4');
  // lamp post
  rect(ctx, 96, 112, 3, 72, '#2e2a3a'); rect(ctx, 90, 106, 15, 7, '#2e2a3a');
  rect(ctx, 92, 113, 11, 3, night ? '#ffe48a' : '#cfd6de');
  if (night) { ctx.fillStyle = 'rgba(255,228,138,0.12)'; ctx.fillRect(80, 116, 36, 68); }

  // shop exterior wall + sign
  rect(ctx, 196, 0, 12, 140, '#7a3f2a');
  for (let y = 4; y < 140; y += 8) rect(ctx, 196, y, 12, 1, '#5e2f20');
  rect(ctx, 194, 138, 16, 4, '#3a2a24');
  drawSign(ctx, S.signLevel || 0, night);

  // interior back wall
  const wall = '#c9b48f', stripe = '#bba57d';
  rect(ctx, 208, 14, WORLD_W - 208, 126, wall);
  for (let x = 212; x < WORLD_W; x += 10) rect(ctx, x, 14, 3, 126, stripe);
  rect(ctx, 208, 14, WORLD_W - 208, 3, '#8a6a46');
  rect(ctx, 208, 0, WORLD_W - 208, 14, '#3a2a30');
  rect(ctx, 208, 136, WORLD_W - 208, 48, '#7a4a2c');
  rect(ctx, 208, 136, WORLD_W - 208, 3, '#9a6a3c');
  for (let x = 220; x < WORLD_W; x += 30) { rect(ctx, x, 144, 22, 34, '#6a3e24'); rect(ctx, x, 144, 22, 1, '#8a5a34'); }
  // floor
  rect(ctx, 208, FLOOR, WORLD_W - 208, H - FLOOR, '#8a5a34');
  for (let y = FLOOR; y < H; y += 6) {
    rect(ctx, 208, y, WORLD_W - 208, 1, '#6a4226');
    for (let x = 208 + ((y / 6) % 2) * 20; x < WORLD_W; x += 40) rect(ctx, x, y, 1, 6, '#6a4226');
  }
  // door frame (open doorway)
  rect(ctx, 196, 140, 3, 44, '#3a2a24'); rect(ctx, 205, 140, 3, 44, '#3a2a24');
  // window on wall behind counter
  rect(ctx, 222, 40, 40, 44, O); rect(ctx, 224, 42, 36, 40, sky[1]); rect(ctx, 241, 42, 2, 40, O); rect(ctx, 224, 61, 36, 2, O);
  // hanging lights
  for (const lx of [300, 470, 640, 860]) {
    rect(ctx, lx, 14, 1, 14, '#2a2230'); rect(ctx, lx - 5, 28, 11, 4, '#2a2230');
    rect(ctx, lx - 3, 32, 7, 2, night ? '#ffe48a' : '#e8e2d4');
  }
  // section divider into office
  rect(ctx, 786, 14, 8, 30, '#6a3e24'); rect(ctx, 786, 44, 8, 2, O);

  // shelves
  drawShelves(ctx, S.inv || []);
  // workbench
  rect(ctx, 700, 70, 64, 40, '#a28a64');
  for (let y = 74; y < 108; y += 6) for (let x = 704; x < 762; x += 6) rect(ctx, x, y, 1, 1, '#7d6a4a');
  rect(ctx, 708, 78, 2, 14, '#6b6f7a'); rect(ctx, 706, 76, 6, 3, '#6b6f7a');
  rect(ctx, 724, 80, 12, 3, '#d6453d'); rect(ctx, 729, 83, 2, 10, '#6b3d22');
  rect(ctx, 746, 76, 3, 18, '#8f949e');
  rect(ctx, 698, 158, 70, 6, '#6b3d22'); rect(ctx, 702, 164, 4, 20, '#4a2a16'); rect(ctx, 758, 164, 4, 20, '#4a2a16');
  if ((S.up?.restore || 0) > 0) { rect(ctx, 716, 150, 14, 8, '#b8733a'); rect(ctx, 740, 152, 10, 6, '#8f949e'); }

  // office: cork board, desk, phone, safe
  rect(ctx, 822, 56, 76, 54, O); rect(ctx, 824, 58, 72, 50, '#b78b54');
  const notes = ['#fff6a0', '#a0e8ff', '#ffb0c8', '#c8ffb0', '#fff6a0', '#ffd0a0'];
  notes.forEach((c, i) => { const nx = 830 + (i % 3) * 22, ny = 62 + ((i / 3) | 0) * 22; rect(ctx, nx, ny, 16, 16, c); rect(ctx, nx + 7, ny + 1, 2, 2, '#d6453d'); rect(ctx, nx + 3, ny + 7, 10, 1, '#8a8174'); rect(ctx, nx + 3, ny + 10, 8, 1, '#8a8174'); });
  pixelText(ctx, 'UPGRADES', 844, 48, '#3a2a30');
  rect(ctx, 850, 158, 70, 5, '#5a3a22'); rect(ctx, 854, 163, 4, 21, '#3a2416'); rect(ctx, 912, 163, 4, 21, '#3a2416');
  rect(ctx, 860, 152, 12, 6, '#2a2230'); rect(ctx, 858, 150, 16, 3, '#2a2230');
  rect(ctx, 890, 146, 18, 12, '#3a3646'); rect(ctx, 892, 148, 14, 8, '#7cc6f2');
  rect(ctx, 926, 152, 28, 32, '#4a4d58'); rect(ctx, 928, 154, 24, 28, '#5d616e'); rect(ctx, 936, 164, 8, 8, '#8f949e'); rect(ctx, 939, 167, 2, 2, O);

  // security cameras
  const sec = S.up?.security || 0;
  if (sec >= 1) drawCam(ctx, 232);
  if (sec >= 2) drawCam(ctx, 620);

  ctx.restore();
}

function drawCam(ctx, x) {
  rect(ctx, x, 14, 2, 4, '#2a2230'); rect(ctx, x - 4, 18, 10, 5, '#d8d2c4'); rect(ctx, x - 6, 19, 3, 3, '#2a2230');
  rect(ctx, x + 4, 19, 1, 1, '#e0234e');
}

function drawSign(ctx, lvl, night) {
  const x = 128, y = 94, w = 66, h = 22;
  rect(ctx, 192, y + 4, 4, 2, '#2e2a3a'); rect(ctx, 192, y + h - 6, 4, 2, '#2e2a3a');
  const frame = ['#6b3d22', '#8a5a34', '#c9a26b', '#d9a441', '#f2c14e', '#ffe48a'][lvl];
  rect(ctx, x, y, w, h, O); rect(ctx, x + 1, y + 1, w - 2, h - 2, frame);
  rect(ctx, x + 3, y + 3, w - 6, h - 6, lvl >= 3 ? '#2a2457' : '#3a2a30');
  const glow = night && lvl >= 2 ? '#ffe48a' : lvl >= 4 ? '#ffe48a' : '#efe0b8';
  pixelText(ctx, 'PAWN', x + 6, y + 6, glow, 1);
  pixelText(ctx, 'SHOP', x + 6, y + 12, glow, 1);
  for (let i = 0; i < lvl; i++) rect(ctx, x + 30 + i * 6, y + 9, 4, 4, '#f2c14e');
  // three balls, classic pawnbroker symbol
  for (const [bx, by] of [[x + 50, y + 4], [x + 56, y + 4], [x + 53, y + 10]]) { rect(ctx, bx, by, 5, 5, O); rect(ctx, bx + 1, by + 1, 3, 3, '#f2c14e'); }
}

export const SHELF_SLOTS = [];
for (const by of [112, 146, 180]) for (const ux of [370, 450, 530, 610]) for (const ix of [6, 27, 48]) SHELF_SLOTS.push([ux + ix, by - 14]);

function drawShelves(ctx, inv) {
  for (const ux of [370, 450, 530, 610]) {
    rect(ctx, ux, 78, 3, 106, '#4a2a16'); rect(ctx, ux + 65, 78, 3, 106, '#4a2a16');
    rect(ctx, ux + 3, 78, 62, 106, '#6b4228');
    for (const by of [112, 146]) { rect(ctx, ux, by, 68, 4, '#8a5a34'); rect(ctx, ux, by + 4, 68, 1, '#3a2416'); }
    rect(ctx, ux, 180, 68, 4, '#8a5a34');
    rect(ctx, ux - 2, 74, 72, 4, '#8a5a34');
  }
  inv.slice(0, SHELF_SLOTS.length).forEach((it, i) => {
    const [x, y] = SHELF_SLOTS[i];
    drawItem(ctx, it.id, x, y);
  });
}

export function drawCounterFront(ctx, cam, S) {
  ctx.save(); ctx.translate(-cam, 0);
  // counter body
  rect(ctx, 242, 167, 90, 17, O);
  rect(ctx, 243, 169, 88, 15, '#7a4a2c');
  for (let x = 247; x < 328; x += 21) { rect(ctx, x, 172, 17, 10, '#6a3e24'); rect(ctx, x, 172, 17, 1, '#9a6a3c'); }
  rect(ctx, 240, 164, 94, 4, '#a8743f'); rect(ctx, 240, 164, 94, 1, '#c9945a');
  // glass case on counter front-left
  // register
  rect(ctx, 310, 148, 22, 16, O); rect(ctx, 311, 149, 20, 14, '#8a8f9c'); rect(ctx, 313, 151, 16, 7, '#2a3a2a');
  if (S.registerText) pixelText(ctx, S.registerText, 314, 152, '#7bc96f');
  rect(ctx, 313, 159, 3, 2, '#d8d2c4'); rect(ctx, 318, 159, 3, 2, '#d8d2c4'); rect(ctx, 323, 159, 3, 2, '#d8d2c4');
  if (S.counterItem != null) drawItem(ctx, S.counterItem, 250, 150);
  ctx.restore();
}

export function drawNight(ctx, phase) {
  if (phase === 'evening' || phase === 'over') {
    ctx.fillStyle = 'rgba(20,16,60,0.35)'; ctx.fillRect(0, 0, W, H);
  } else if (phase === 'dawn') {
    ctx.fillStyle = 'rgba(255,150,80,0.10)'; ctx.fillRect(0, 0, W, H);
  } else if (phase === 'sell' || phase === 'noon') {
    ctx.fillStyle = 'rgba(255,200,120,0.06)'; ctx.fillRect(0, 0, W, H);
  }
}

export { drawItem, ITEMS };
