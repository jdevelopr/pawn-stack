/**
 * art.js - all pixel drawing (Mars, 2149).
 *
 * Layout and gameplay positions use the original 384x216 "logical" grid. Everything is
 * drawn on a 768x432 canvas (PX = 2 art pixels per logical pixel) for twice the detail,
 * and CSS scales that canvas by a whole number so every pixel stays on the grid.
 *
 * Public coordinates:
 *   drawScene / drawCounterFront / text helpers take FINE (768-space) coordinates.
 *   drawChar / bubble take LOGICAL positions and convert internally.
 */
import { drawItem, ITEMS } from './items.js';

export const PX = 2;
export const W = 384, H = 216, WORLD_W = 960, FLOOR = 184;          // logical
const FW = W * PX, FH = H * PX, FWORLD = WORLD_W * PX, FF = FLOOR * PX; // fine
export const O = '#211a2b';
const EYE = '#1a1220'; // facial features stay dark; outlines (O) on characters get softened

export const ZONES = {
  counter: { x0: 268, x1: 348, label: 'COUNTER' },
  shelves: { x0: 362, x1: 690, label: 'SHELVES' },
  office: { x0: 800, x1: 950, label: 'OFFICE' },
};
export const COUNTER_X = 290;   // where the keeper stands at the counter (logical)
export const CUSTOMER_X = 228;  // where customers stand (logical)

/* ------------------------------------------------------------ helpers --- */
function rgbOf(c) {
  if (c.startsWith('rgb')) return c.match(/\d+/g).map(Number);
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Darken (f<1, drifting cool) or lighten (f>1, drifting warm). */
function sh(c, f) {
  let [r, g, b] = rgbOf(c);
  if (f < 1) { r = r * f + 24 * (1 - f) * 0.4; g = g * f + 14 * (1 - f) * 0.4; b = b * f + 52 * (1 - f) * 0.6; }
  else { const k = f - 1; r += (255 - r) * k; g += (248 - g) * k; b += (220 - b) * k * 0.85; }
  const q = v => Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${q(r)},${q(g)},${q(b)})`;
}
const shadeHex = sh;
function rect(ctx, x, y, w, h, c) { if (w <= 0 || h <= 0) return; ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function disc(ctx, cx, cy, r, c) {
  for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy - r * 0.3))); if (w > 0) rect(ctx, cx - w, cy + dy, w * 2, 1, c); }
}
function ell(ctx, cx, cy, rx, ry, c) {
  for (let dy = -ry; dy <= ry; dy++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry + 0.6))));
    if (w > 0) rect(ctx, cx - w, cy + dy, w * 2, 1, c);
  }
}
function rng(seed) { let s = seed; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
function layer(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

/* ------------------------------------------------------------- 5x7 font --- */
const G5 = {
  A: '01110100011000111111100011000110001', B: '11110100011000111110100011000111110', C: '01110100011000010000100001000101110',
  D: '11110100011000110001100011000111110', E: '11111100001000011110100001000011111', F: '11111100001000011110100001000010000',
  G: '01110100011000010111100011000101111', H: '10001100011000111111100011000110001', I: '01110001000010000100001000010001110',
  J: '00111000100001000010000101001001100', K: '10001100101010011000101001001010001', L: '10000100001000010000100001000011111',
  M: '10001110111010110101100011000110001', N: '10001100011100110101100111000110001', O: '01110100011000110001100011000101110',
  P: '11110100011000111110100001000010000', Q: '01110100011000110001101011001001101', R: '11110100011000111110101001001010001',
  S: '01111100001000001110000010000111110', T: '11111001000010000100001000010000100', U: '10001100011000110001100011000101110',
  V: '10001100011000110001100010101000100', W: '10001100011000110101101011010101010', X: '10001100010101000100010101000110001',
  Y: '10001100010101000100001000010000100', Z: '11111000010001000100010001000011111',
  0: '01110100011001110101110011000101110', 1: '00100011000010000100001000010001110', 2: '01110100010000100010001000100011111',
  3: '11111000100010000010000011000101110', 4: '00010001100101010010111110001000010', 5: '11111100001111000001000011000101110',
  6: '00110010001000011110100011000101110', 7: '11111000010001000100010000100001000', 8: '01110100011000101110100011000101110',
  9: '01110100011000101111000010001001100',
  '.': '00000000000000000000000000110001100', ',': '00000000000000000000011000010001000', '!': '00100001000010000100001000000000100',
  '?': '01110100010000100010001000000000100', "'": '00100001000100000000000000000000000', '-': '00000000000000011111000000000000000',
  ':': '00000011000110000000011000110000000', '/': '00001000010001000100010001000010000', '%': '11000110010001000100010001001100011',
  '+': '00000001000010011111001000010000000', '(': '00010001000100001000010000010000010', ')': '01000001000001000010000100010001000',
  '&': '01100100101010001000101011001001101', '#': '01010010101111101010111110101001010', '"': '01010010100101000000000000000000000',
  '<': '00010001000100010000010000010000010', '>': '01000001000001000001000100010001000', '=': '00000000001111100000111110000000000',
  $: '00100011111010001110001011111000100', '*': '00000001001010101110101010010000000',
  ' ': '00000000000000000000000000000000000',
};
/** Width in fine pixels of a string in the 5x7 font. */
export const textW = (s, sc = 1) => (String(s).length * 6 - 1) * sc;
export function pixelText(ctx, str, x, y, col, sc = 1) {
  str = String(str).toUpperCase();
  ctx.fillStyle = col;
  let cx = Math.round(x);
  const cy = Math.round(y);
  for (const ch of str) {
    const g = G5[ch] || G5['?'];
    for (let i = 0; i < 35; i++) if (g[i] === '1') ctx.fillRect(cx + (i % 5) * sc, cy + ((i / 5) | 0) * sc, sc, sc);
    cx += 6 * sc;
  }
}
export function pixelTextOutlined(ctx, str, x, y, col, sc = 1, oc = O) {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) pixelText(ctx, str, x + dx, y + dy, oc, sc);
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

/** Speech bubble whose tail points at logical (x, y). */
export function bubble(ctx, x, y, text, col = '#fffaf0') {
  const fx = Math.round(x * PX), fy = Math.round(y * PX);
  const lines = wrap(text, 24).slice(0, 3);
  const w = Math.max(...lines.map(l => textW(l))) + 14;
  const h = lines.length * 10 + 9;
  const bx = Math.round(Math.max(4, fx - w / 2)), by = fy - h - 4;
  // shadow, outline, body with rounded corners
  rect(ctx, bx + 2, by, w - 4, h, O); rect(ctx, bx, by + 2, w, h - 4, O); rect(ctx, bx + 1, by + 1, w - 2, h - 2, O);
  rect(ctx, bx + 2, by + 1, w - 4, h - 2, col); rect(ctx, bx + 1, by + 2, w - 2, h - 4, col);
  rect(ctx, bx + 2, by + h - 3, w - 4, 1, sh(col, 0.9));
  // tail
  for (let i = 0; i < 4; i++) { rect(ctx, fx - 4 + i, by + h - 1 + i, 8 - i * 2, 1, O); if (i < 3) rect(ctx, fx - 3 + i, by + h - 2 + i, 6 - i * 2, 1, col); }
  lines.forEach((l, i) => pixelText(ctx, l, bx + 7, by + 5 + i * 10, '#2a2238'));
}

/* ------------------------------------------------------------- people --- */
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

/**
 * Drawing kit for a character whose feet are at fine (fx, fy). Shapes are written for a
 * right-facing figure in a box `bw` wide and are mirrored automatically when facing left.
 */
function kit(ctx, fx, fy, bw, bh, dir) {
  const X = fx - (bw >> 1), Y = fy - bh, f = dir > 0;
  const mx = (a, w) => (f ? a : bw - a - w);
  const R = (a, b, w, h, c) => { if (w > 0 && h > 0) { ctx.fillStyle = c; ctx.fillRect(X + mx(a, w), Y + b, w, h); } };
  const Ro = (a, b, w, h, c) => { R(a - 1, b - 1, w + 2, h + 2, O); R(a, b, w, h, c); };
  /** rows: [[x, width], ...] starting at row y0 — filled shape with a 1px outline */
  const shape = (y0, rows, c, outline = true) => {
    if (outline) {
      rows.forEach(([a, w], i) => R(a - 1, y0 + i, w + 2, 1, O));
      R(rows[0][0], y0 - 1, rows[0][1], 1, O);
      const l = rows[rows.length - 1]; R(l[0], y0 + rows.length, l[1], 1, O);
    }
    rows.forEach(([a, w], i) => R(a, y0 + i, w, 1, c));
  };
  const E = (cx, cy, rx, ry, c, outline = true) => {
    const rows = [];
    for (let dy = -ry; dy <= ry; dy++) {
      const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry + 0.6))));
      rows.push([cx - w, Math.max(1, w * 2)]);
    }
    shape(cy - ry, rows, c, outline);
  };
  return { X, Y, f, R, Ro, shape, E };
}

/** Human, 28x68 fine px, feet at fine (fx, fy). */
function drawPerson2(ctx, fx, fy, L, frame = 0, dir = 1, ex = {}) {
  const tall = L.tall === 2 ? 2 : L.tall === 1 ? 1 : 0;
  const { R, Ro, shape } = kit(ctx, fx, fy + 0, 28, 68 + tall, dir);
  const T = tall; // shift upper body
  const skin = L.skin, skD = sh(skin, 0.82), skDD = sh(skin, 0.66), skL = sh(skin, 1.12);
  const shirt = L.shirt, stD = sh(shirt, 0.74), stDD = sh(shirt, 0.6), stL = sh(shirt, 1.18);
  const pants = L.pants, ptD = sh(pants, 0.72), ptL = sh(pants, 1.2);
  const hair = L.hair, hrD = sh(hair, 0.7), hrL = sh(hair, 1.3);
  const shoe = '#2a2230', shoeL = '#4a4558';
  const legs = frame === 1 ? [4, 17] : frame === 2 ? [10, 12] : [8, 14];
  const sw = frame === 1 ? 2 : frame === 2 ? -2 : 0;
  // back arm (behind body)
  const bax = 6 - sw;
  Ro(bax, 27 + T, 5, 15, stDD); Ro(bax, 42 + T, 5, 4, skD);
  // legs
  const [lx, rx] = legs;
  Ro(lx, 46 + T, 6, 18 - T, ptD); R(lx, 54, 6, 1, sh(pants, 0.6));
  Ro(lx, 64, 8, 3, shoe); R(lx, 66, 8, 1, '#141018');
  Ro(rx, 46 + T, 6, 18 - T, pants); R(rx + 4, 48 + T, 1, 14 - T, ptL); R(rx, 55, 6, 1, ptD);
  Ro(rx, 64, 8, 3, shoe); R(rx + 5, 64, 2, 1, shoeL); R(rx, 66, 8, 1, '#141018');
  // torso
  Ro(4, 24 + T, 20, 23, shirt);
  R(4, 24 + T, 4, 23, stD); R(20, 26 + T, 2, 18, stL);
  R(9, 38 + T, 6, 1, stD); R(11, 41 + T, 7, 1, stD);
  R(16, 29 + T, 1, 1, stDD); R(16, 33 + T, 1, 1, stDD); R(16, 37 + T, 1, 1, stDD);
  Ro(4, 44 + T, 20, 2, '#3a3346'); R(17, 44 + T, 3, 2, '#c9a040');
  // collar + neck
  R(11, 21 + T, 8, 4, skD); R(12, 24 + T, 7, 2, stL); R(14, 24 + T, 3, 3, skD);
  if (ex.apron) {
    const ap = ex.apron, apD = sh(ap, 0.78), apL = sh(ap, 1.1);
    Ro(10, 28 + T, 13, 17, ap); R(10, 28 + T, 13, 1, apL); R(10, 28 + T, 2, 17, apD);
    R(12, 24 + T, 2, 4, ap); R(20, 24 + T, 2, 4, ap);
    Ro(13, 36 + T, 7, 4, apD); R(14, 36 + T, 5, 1, apL);
  }
  if (ex.tie) { const td = sh(ex.tie, 0.7); R(15, 26 + T, 3, 2, td); R(15, 28 + T, 3, 11, ex.tie); R(16, 39 + T, 1, 1, ex.tie); R(17, 29 + T, 1, 9, td); }
  if (ex.badge) { R(19, 29 + T, 3, 3, '#f2c14e'); R(20, 30 + T, 1, 1, '#fff2b0'); R(19, 31 + T, 1, 1, '#b8892a'); }
  // front arm
  const ax = 14 + sw;
  Ro(ax, 26 + T, 6, 15, shirt); R(ax, 26 + T, 2, 15, stD); R(ax + 4, 27 + T, 1, 12, stL); R(ax, 39 + T, 6, 2, stD);
  Ro(ax, 41 + T, 6, 5, skin); R(ax, 41 + T, 6, 1, skD); R(ax + 2, 45 + T, 1, 1, skDD); R(ax + 4, 45 + T, 1, 1, skDD); R(ax + 5, 42 + T, 1, 2, skL);
  // head
  const hy = 1 + T;
  const head = [[9, 9], [7, 13], [6, 15], [6, 16], [6, 16], [6, 16], [6, 16], [6, 16], [6, 16], [6, 16], [6, 16], [6, 16], [6, 16], [6, 16], [6, 16], [7, 15], [7, 14], [8, 12], [9, 10], [11, 7]];
  shape(hy + 1, head, skin);
  R(6, hy + 5, 3, 12, skD); R(8, hy + 16, 12, 2, skD); R(10, hy + 18, 9, 1, skDD);
  R(12, hy + 2, 6, 1, skL); R(20, hy + 6, 1, 6, skL);
  // ear
  R(9, hy + 9, 3, 5, skD); R(10, hy + 10, 1, 3, skDD);
  // eye, brow, nose, mouth, cheek
  R(16, hy + 9, 4, 3, '#f4f0ea'); R(18, hy + 9, 2, 3, EYE); R(18, hy + 9, 1, 1, '#ffffff');
  R(15, hy + 7, 6, 1, hrD);
  R(22, hy + 11, 2, 3, skin); R(24, hy + 11, 1, 3, O); R(22, hy + 14, 2, 1, skD);
  R(17, hy + 16, 5, 1, sh(skin, 0.62)); R(16, hy + 15, 1, 1, skD);
  R(14, hy + 13, 2, 1, sh(skin, 0.92));
  // hair
  const st = L.style;
  if (st === 0) {
    shape(hy, [[9, 10], [7, 14], [6, 16], [6, 16], [6, 6]], hair);
    R(6, hy + 5, 4, 6, hair); R(12, hy + 6, 2, 4, hair); R(18, hy + 4, 5, 2, hair);
    R(9, hy + 1, 6, 1, hrL); R(7, hy + 3, 3, 1, hrL); R(15, hy + 2, 4, 1, hrL);
  } else if (st === 1) {
    R(4, hy + 6, 6, 19, hair); R(4, hy + 6, 1, 19, O); R(4, hy + 25, 6, 1, O); R(5, hy + 10, 2, 13, hrD);
    shape(hy, [[9, 10], [7, 14], [6, 16], [6, 16], [6, 8]], hair);
    R(18, hy + 4, 5, 2, hair); R(9, hy + 1, 6, 1, hrL); R(7, hy + 3, 3, 1, hrL);
  } else if (st === 2) {
    R(6, hy + 8, 4, 7, hair); R(7, hy + 8, 1, 6, hrL); R(11, hy + 3, 6, 1, skL); R(10, hy + 4, 2, 1, skL);
  } else {
    shape(hy - 3, [[8, 12], [6, 16], [5, 18], [5, 18], [5, 18], [6, 16], [6, 7]], hair);
    R(9, hy - 2, 5, 1, hrL); R(7, hy, 2, 2, hrL); R(15, hy - 1, 4, 1, hrL); R(19, hy + 3, 3, 2, hair);
    for (let i = 0; i < 5; i++) R(7 + i * 3, hy + 1 + (i % 2), 1, 1, hrD);
  }
  if (ex.monocle) {
    const g = '#f2c14e', gd = '#b8892a';
    R(15, hy + 8, 6, 1, g); R(15, hy + 12, 6, 1, g); R(15, hy + 9, 1, 3, g); R(20, hy + 9, 1, 3, g); R(16, hy + 9, 1, 1, '#fff2b0');
    for (let i = 0; i < 9; i++) R(16 - (i > 4 ? 1 : 0), hy + 13 + i, 1, 1, gd);
  }
  if (ex.glasses) {
    R(15, hy + 8, 7, 4, '#2a2230'); R(16, hy + 9, 5, 2, '#4a4a6a'); R(16, hy + 9, 2, 1, '#8a8aaa'); R(11, hy + 9, 4, 1, '#2a2230');
  }
  const hat = ex.hat || L.hat;
  if (hat) {
    const hd = sh(hat, 0.72), hl = sh(hat, 1.25);
    shape(hy - 3, [[9, 10], [7, 14], [7, 15], [7, 15], [7, 15]], hat);
    R(7, hy + 1, 15, 1, hd); R(10, hy - 3, 6, 1, hl); R(8, hy - 1, 2, 1, hl);
    Ro(17, hy + 2, 10, 2, hd); R(17, hy + 2, 10, 1, hat);
  }
}

/** Spacesuit with a bubble helmet. */
function drawAstro2(ctx, fx, fy, L, frame = 0, dir = 1) {
  const { R, Ro, E } = kit(ctx, fx, fy, 28, 68, dir);
  const suit = L.suit || '#e8ecf2', sD = sh(suit, 0.78), sDD = sh(suit, 0.62), sL = sh(suit, 1.1);
  const acc = L.accent || '#ec8a2f', visor = L.visor || '#2a4a8a';
  const legs = frame === 1 ? [3, 17] : frame === 2 ? [9, 12] : [7, 14];
  const sw = frame === 1 ? 2 : frame === 2 ? -2 : 0;
  // backpack
  Ro(0, 25, 7, 21, '#9aa0ad'); R(0, 25, 7, 1, '#c9ced8'); R(1, 29, 4, 1, '#6b6f7a'); R(1, 32, 4, 1, '#6b6f7a'); R(1, 35, 4, 1, '#6b6f7a');
  R(2, 40, 2, 2, acc); R(5, 26, 1, 18, '#6b6f7a');
  // back arm
  Ro(7 - sw, 27, 6, 14, sDD); Ro(7 - sw, 41, 6, 5, '#7a808c');
  // legs
  const [lx, rx] = legs;
  Ro(lx, 46, 7, 16, sD); R(lx, 53, 7, 3, sDD);
  Ro(lx - 1, 62, 9, 5, '#5d616e'); R(lx - 1, 66, 9, 1, '#3a3d46');
  Ro(rx, 46, 7, 16, suit); R(rx + 5, 47, 1, 14, sL); R(rx, 52, 7, 4, '#c9ced8'); R(rx, 52, 7, 1, '#e8ecf2');
  Ro(rx - 1, 62, 9, 5, '#6b6f7a'); R(rx, 62, 7, 1, '#9aa0ad'); R(rx - 1, 66, 9, 1, '#3a3d46');
  // torso
  Ro(3, 24, 22, 23, suit); R(3, 24, 4, 23, sD); R(22, 26, 2, 18, sL);
  R(3, 38, 22, 3, acc); R(3, 38, 22, 1, sh(acc, 1.2)); R(3, 40, 22, 1, sh(acc, 0.75));
  Ro(14, 28, 8, 7, '#2a3346'); R(15, 29, 1, 1, '#ff6f61'); R(17, 29, 1, 1, '#ffb347'); R(19, 29, 1, 1, '#4fe0d0'); R(15, 31, 6, 1, '#4fe0d0'); R(15, 33, 3, 1, '#4fe0d0');
  Ro(8, 27, 4, 4, acc); R(9, 28, 2, 2, sh(acc, 1.25));
  Ro(3, 44, 22, 2, sDD); R(13, 44, 3, 2, '#9aa0ad');
  // front arm
  const ax = 15 + sw;
  Ro(ax, 26, 7, 14, suit); R(ax, 26, 2, 14, sD); R(ax + 5, 27, 1, 11, sL); R(ax, 36, 7, 2, sD);
  Ro(ax, 40, 7, 6, '#9aa0ad'); R(ax, 40, 7, 1, '#c9ced8'); R(ax + 2, 45, 1, 1, '#5d616e'); R(ax + 4, 45, 1, 1, '#5d616e');
  // helmet
  Ro(5, 21, 18, 3, '#9aa0ad'); R(5, 21, 18, 1, '#c9ced8');
  E(14, 11, 12, 11, '#e8ecf2');
  E(14, 13, 10, 8, '#d2d8e2', false); E(13, 9, 9, 7, '#eef2f8', false);
  R(4, 14, 3, 5, '#c9ced8');
  E(18, 12, 8, 6, O, false); E(18, 12, 7, 5, visor, false);
  E(18, 14, 6, 3, sh(visor, 0.75), false);
  R(14, 8, 4, 1, '#ffffff'); R(13, 9, 1, 2, '#ffffff'); R(21, 15, 3, 1, sh(visor, 1.5)); R(22, 9, 2, 1, sh(visor, 1.35));
  if (L.faceVisible) R(19, 11, 1, 1, EYE);
  R(5, -6, 1, 8, '#8f949e'); R(4, -7, 3, 1, '#6b6f7a'); R(5, -8, 1, 1, '#ff4a5a');
}

/** Grey: big teardrop head, huge almond eyes, slim robed body. */
function drawGrey2(ctx, fx, fy, L, frame = 0, dir = 1) {
  const { R, Ro, shape } = kit(ctx, fx, fy, 28, 70, dir);
  const skin = L.skin || '#b8c4c0', skD = sh(skin, 0.8), skDD = sh(skin, 0.66), skL = sh(skin, 1.15);
  const robe = L.robe || '#6a4ab0', rD = sh(robe, 0.74), rL = sh(robe, 1.2);
  const legs = frame === 1 ? [8, 16] : frame === 2 ? [12, 13] : [10, 15];
  const sw = frame === 1 ? 2 : frame === 2 ? -2 : 0;
  // back arm
  Ro(9 - sw, 32, 3, 18, skDD);
  // legs + feet
  for (const [lx, back] of [[legs[0], true], [legs[1], false]]) {
    Ro(lx, 54, 3, 13, back ? skD : skin); Ro(lx, 67, 6, 1, back ? skDD : skD);
  }
  // robe
  shape(30, [[9, 10], [8, 12], [8, 12], [8, 12], [8, 12], [8, 12], [8, 12], [8, 12], [8, 12], [7, 14], [7, 14], [7, 14], [7, 14], [6, 16], [6, 16], [6, 16], [6, 16], [5, 18], [5, 18], [5, 18], [5, 18], [4, 20], [4, 20], [4, 20]], robe);
  R(8, 31, 3, 22, rD); R(5, 48, 3, 6, rD); R(18, 33, 1, 18, rL);
  R(10, 30, 8, 2, rL); R(12, 32, 4, 1, rD);
  R(7, 42, 14, 2, '#ffb347'); R(7, 42, 14, 1, '#ffd27a'); R(16, 44, 2, 5, '#ffb347');
  // neck
  R(12, 24, 4, 7, skD); R(13, 24, 1, 6, skDD);
  // front arm: long and thin, three fingers
  const ax = 17 + sw;
  Ro(ax, 32, 3, 18, skin); R(ax, 32, 1, 18, skD);
  R(ax - 1, 50, 1, 3, skD); R(ax + 1, 50, 1, 4, skin); R(ax + 3, 50, 1, 3, skD);
  // head
  const hw = [6, 9, 10, 11, 12, 12, 13, 13, 13, 13, 12, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
  shape(1, hw.map(w => [14 - w, w * 2]), skin);
  hw.forEach((w, i) => { R(14 - w, 1 + i, 3, 1, skD); R(14 + w - 2, 1 + i, 2, 1, i > 4 ? skD : skin); });
  R(9, 2, 8, 1, skL); R(6, 4, 4, 1, skL); R(5, 6, 2, 2, skL);
  R(11, 20, 6, 1, skD);
  // eyes (3/4 view: far eye small, near eye big)
  const eye = '#0d0b14';
  shape(9, [[7, 4], [6, 5], [7, 4], [8, 2]], eye, false);
  shape(8, [[16, 5], [15, 7], [15, 8], [16, 7], [17, 5], [19, 2]], eye, false);
  R(17, 9, 2, 1, '#6ab0e0'); R(16, 10, 1, 1, '#3a6a9a'); R(21, 12, 1, 1, '#9ad8ff'); R(8, 10, 1, 1, '#6ab0e0');
  R(19, 16, 1, 1, skDD); R(21, 16, 1, 1, skDD);
  R(16, 18, 4, 1, skDD);
}

/** Glorp: a wobbly gel blob with eye stalks. No legs; it oozes. */
function drawGlorp2(ctx, fx, fy, L, frame = 0, dir = 1, t = 0) {
  const body = L.body || '#7bd85a', bD = sh(body, 0.72), bDD = sh(body, 0.58), bL = sh(body, 1.22), bLL = sh(body, 1.45);
  const wob = Math.round(Math.sin(t / 160 + (L.seed || 0)) * (frame ? 3 : 1.6));
  const h = 40 + wob, w = 36 - wob;
  const X0 = fx - Math.round(w / 2), base = fy;
  const f = dir > 0;
  const rows = [];
  for (let i = 0; i < h; i++) {
    const k = i < 14 ? Math.sqrt(1 - Math.pow((14 - i) / 14.5, 2)) * 0.98 + 0.02 : 1;
    const rw = Math.max(6, Math.round(w * k));
    rows.push([X0 + Math.round((w - rw) / 2), rw]);
  }
  rows.forEach(([x, rw], i) => rect(ctx, x - 1, base - h + i, rw + 2, 1, O));
  rect(ctx, rows[0][0], base - h - 1, rows[0][1], 1, O);
  rect(ctx, X0 - 1, base, w + 2, 1, O);
  rows.forEach(([x, rw], i) => {
    const y = base - h + i;
    rect(ctx, x, y, rw, 1, body);
    rect(ctx, x, y, Math.max(1, Math.round(rw * 0.18)), 1, bD);            // shaded side
    if (i > h - 7) rect(ctx, x, y, rw, 1, i > h - 3 ? bDD : bD);         // puddle base
  });
  // highlights and inner bubbles
  rect(ctx, X0 + 7, base - h + 4, 6, 2, bL); rect(ctx, X0 + 5, base - h + 6, 2, 6, bL); rect(ctx, X0 + 8, base - h + 5, 2, 1, bLL);
  for (const [bx, by, br] of [[0.68, 0.45, 3], [0.3, 0.7, 2], [0.78, 0.75, 2]]) {
    const cx = X0 + Math.round(w * bx), cy = base - h + Math.round(h * by);
    disc(ctx, cx, cy, br, bL); disc(ctx, cx, cy, br - 1, body); rect(ctx, cx - 1, cy - br, 1, 1, bLL);
  }
  for (const [sx, sy] of [[0.4, 0.4], [0.58, 0.62], [0.22, 0.5]]) rect(ctx, X0 + Math.round(w * sx), base - h + Math.round(h * sy), 2, 2, bD);
  // eye stalks
  for (const [sxk, sl] of [[0.32, 12], [0.64, 16]]) {
    const sx = X0 + Math.round(w * sxk);
    rect(ctx, sx - 1, base - h - sl, 5, sl + 2, O); rect(ctx, sx, base - h - sl + 1, 3, sl + 2, body); rect(ctx, sx, base - h - sl + 1, 1, sl, bD);
    const ey = base - h - sl - 5;
    disc(ctx, sx + 1, ey, 5, O); disc(ctx, sx + 1, ey, 4, '#ffffff'); rect(ctx, sx - 2, ey + 2, 6, 1, '#d8dde6');
    const px = sx + (f ? 2 : -1);
    rect(ctx, px, ey - 1, 3, 3, '#0d0b14'); rect(ctx, px, ey - 1, 1, 1, '#ffffff');
  }
  // mouth
  const mx = X0 + Math.round(w / 2) + (f ? 3 : -3), my = base - 15;
  rect(ctx, mx - 6, my, 12, 1, EYE); rect(ctx, mx - 7, my - 1, 1, 1, EYE); rect(ctx, mx + 6, my - 1, 1, 1, EYE);
  rect(ctx, mx - 4, my + 1, 8, 1, EYE); rect(ctx, mx - 2, my + 1, 4, 1, '#ff6fa8');
}

/** Zix: lanky insectoid with antennae, compound eyes, four arms and veined wings. */
function drawZix2(ctx, fx, fy, L, frame = 0, dir = 1, t = 0) {
  const { R, Ro, shape, E } = kit(ctx, fx, fy, 28, 70, dir);
  const shell = L.shell || '#7d4fc9', sD = sh(shell, 0.72), sDD = sh(shell, 0.58), sL = sh(shell, 1.22);
  const acc = L.accent || '#4fe0d0';
  const flap = Math.floor(t / 90) % 2;
  // wings (behind)
  const wing = [[3, 4], [1, 8], [0, 10], [0, 10], [0, 11], [1, 10], [1, 10], [2, 9], [2, 9], [3, 8], [4, 6], [5, 5], [6, 3]];
  shape(17 - flap * 2, wing, '#9ad0f0');
  wing.forEach(([a, w], i) => { if (i > 0 && i < wing.length - 1) R(a + w - 2, 17 - flap * 2 + i, 1, 1, '#d8f0ff'); });
  R(4, 19 - flap * 2, 1, 10, '#6fa8d0'); R(7, 20 - flap * 2, 1, 9, '#6fa8d0'); R(2, 22 - flap * 2, 6, 1, '#6fa8d0');
  // legs (jointed)
  const lg = frame === 1 ? [[7, -2], [15, 2]] : frame === 2 ? [[10, 1], [12, -1]] : [[9, 0], [14, 0]];
  lg.forEach(([lx, o], i) => {
    const c = i === 0 ? sD : shell;
    Ro(lx, 52, 3, 7, c); Ro(lx - 2 + o, 58, 3, 8, c); Ro(lx - 3 + o, 66, 6, 1, sDD);
    R(lx, 58, 2, 1, sL);
  });
  // abdomen
  E(11, 44, 7, 9, shell); R(5, 40, 13, 1, sD); R(5, 44, 13, 1, sD); R(6, 48, 11, 1, sD); R(6, 37, 4, 1, sL); R(5, 39, 2, 3, sL);
  // thorax
  E(14, 30, 6, 8, shell); R(9, 29, 10, 2, acc); R(9, 29, 10, 1, sh(acc, 1.25)); R(10, 24, 3, 2, sL);
  // four arms
  for (const [ay, sw] of [[25, frame === 1 ? 1 : 0], [33, frame === 2 ? 1 : 0]]) {
    Ro(18, ay, 6, 2, sD); Ro(23 + sw, ay, 2, 8, shell); R(22 + sw, ay + 8, 2, 1, O); R(25 + sw, ay + 8, 1, 2, O); R(23 + sw, ay + 1, 1, 6, sL);
  }
  // head
  E(16, 14, 8, 7, shell); R(10, 10, 6, 1, sL); R(9, 12, 2, 2, sL); R(9, 17, 12, 1, sD);
  E(20, 12, 3, 3, '#c0283a'); R(19, 10, 2, 1, '#ff6070'); R(21, 12, 1, 1, '#ff9aa0'); R(20, 14, 1, 1, '#ff6070'); R(22, 11, 1, 1, '#ffd0d0');
  R(11, 12, 2, 2, '#c0283a'); R(11, 12, 1, 1, '#ff9aa0');
  R(22, 19, 3, 2, sDD); R(20, 21, 3, 1, sDD); R(24, 21, 1, 1, sDD);
  // antennae
  for (const [x0, pts] of [[13, [[0, 0], [-1, -2], [-2, -4], [-2, -6], [-3, -8]]], [18, [[0, 0], [1, -2], [2, -4], [3, -6], [3, -8]]]]) {
    pts.forEach(([dx, dy]) => R(x0 + dx, 7 + dy, 1, 2, O));
    const tip = pts[pts.length - 1];
    R(x0 + tip[0] - 1, 7 + tip[1] - 2, 3, 2, acc); R(x0 + tip[0] - 1, 7 + tip[1] - 2, 1, 1, sh(acc, 1.4));
  }
}

/** Boxy shop droid used for staff. */
function drawBot2(ctx, fx, fy, L, dir = 1, t = 0, ex = {}) {
  const { R, Ro } = kit(ctx, fx, fy, 28, 66, dir);
  const body = L.body || '#c9ced8', bD = sh(body, 0.74), bDD = sh(body, 0.6), bL = sh(body, 1.15);
  const light = L.light || '#4fe0d0', eye = L.eye || '#ff4a5a';
  // legs + feet
  for (const lx of [7, 17]) { Ro(lx, 49, 4, 14, '#6b6f7a'); R(lx + 1, 50, 1, 12, '#9aa0ad'); R(lx, 55, 4, 2, '#4a4d58'); }
  Ro(5, 63, 8, 3, '#4a4d58'); Ro(15, 63, 8, 3, '#4a4d58'); R(5, 63, 8, 1, '#6b6f7a'); R(15, 63, 8, 1, '#6b6f7a');
  // back arm
  Ro(1, 28, 4, 15, bDD);
  // torso
  Ro(3, 23, 22, 26, body); R(3, 23, 22, 1, bL); R(3, 23, 3, 26, bD); R(22, 25, 2, 22, bL); R(3, 44, 22, 2, bD);
  for (const [rx, ry] of [[6, 26], [21, 26], [6, 45], [21, 45]]) R(rx, ry, 1, 1, bDD);
  Ro(8, 29, 12, 9, '#14202e');
  const ph = Math.floor(t / 250) % 4;
  for (let i = 0; i < 4; i++) R(9 + i * 3, 31 + ((i + ph) % 3), 2, 6 - ((i + ph) % 3), i === ph ? light : sh(light, 0.6));
  R(9, 40, 3, 2, '#ffb347'); R(13, 40, 3, 2, light); R(17, 40, 2, 2, '#ff6f61');
  if (ex.badge) { R(20, 26, 3, 3, '#f2c14e'); R(21, 27, 1, 1, '#fff2b0'); }
  // front arm
  Ro(23, 27, 4, 15, bD); R(23, 27, 1, 15, bL); Ro(22, 42, 6, 3, '#6b6f7a'); R(22, 45, 2, 2, '#4a4d58'); R(26, 45, 2, 2, '#4a4d58');
  // neck + head
  R(11, 20, 6, 3, '#6b6f7a');
  Ro(5, 3, 18, 17, body); R(5, 3, 18, 1, bL); R(5, 3, 3, 17, bD); R(5, 18, 18, 2, bD);
  Ro(9, 8, 13, 7, '#14202e');
  const scan = Math.floor(t / 110) % 8, sx = scan < 4 ? scan : 7 - scan;
  R(10 + sx * 3, 10, 3, 3, eye); R(10 + sx * 3, 10, 1, 1, sh(eye, 1.5));
  R(7, 6, 1, 1, bDD); R(20, 6, 1, 1, bDD);
  R(13, -2, 2, 5, '#6b6f7a'); R(12, -5, 4, 3, light); R(12, -5, 1, 1, sh(light, 1.5));
  if (ex.monocle) { R(20, 7, 4, 1, '#f2c14e'); R(20, 15, 4, 1, '#f2c14e'); R(23, 8, 1, 7, '#f2c14e'); R(22, 16, 1, 6, '#b8892a'); }
}

/* --------------------------------------------- outline-free characters --- */
// Characters are drawn once per pose into an offscreen canvas, then every black outline
// pixel is replaced with a darker tone of the body part it borders. Poses are cached.

const CHAR_W = 72, CHAR_H = 128, CX = 36, CY = 118;
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
      let src = -1;
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= CHAR_W || ny >= CHAR_H) continue;
        const j = (ny * CHAR_W + nx) * 4;
        if (d[j + 3] === 255 && !isOut(j)) { src = j; break; }
      }
      if (src >= 0) todo.push([i, d[src] * 0.64 | 0, d[src + 1] * 0.6 | 0, Math.min(255, d[src + 2] * 0.7 + 8) | 0]);
    }
    if (!todo.length) break;
    for (const [i, r, gg, b] of todo) { d[i] = r; d[i + 1] = gg; d[i + 2] = b; }
  }
  for (let i = 0; i < d.length; i += 4) if (isOut(i)) d[i + 3] = 0;
  g.putImageData(img, 0, 0);
}

const DRAW = {
  person: (x, L, f, dir, ex) => drawPerson2(x, CX, CY, L, f, dir, ex),
  astro: (x, L, f, dir) => drawAstro2(x, CX, CY, L, f, dir),
  grey: (x, L, f, dir) => drawGrey2(x, CX, CY, L, f, dir),
  glorp: (x, L, f, dir, ex, t) => drawGlorp2(x, CX, CY, L, f, dir, t),
  zix: (x, L, f, dir, ex, t) => drawZix2(x, CX, CY, L, f, dir, t),
  bot: (x, L, f, dir, ex, t) => drawBot2(x, CX, CY, L, dir, t, ex),
};

function animKey(kind, L, frame, t) {
  if (kind === 'glorp') return Math.round(Math.sin(t / 160 + (L.seed || 0)) * (frame ? 3 : 1.6));
  if (kind === 'zix') return Math.floor(t / 90) % 2;
  if (kind === 'bot') return (Math.floor(t / 110) % 8) + ':' + (Math.floor(t / 250) % 4);
  return 0;
}

/** Draw any character (no black outline) with feet at LOGICAL (x, y). */
export function drawChar(ctx, kind, x, y, L, frame = 0, dir = 1, extra = {}, t = 0) {
  const { carry, ...ex } = extra;
  const a = animKey(kind, L, frame, t);
  const key = kind + '|' + JSON.stringify(L) + '|' + frame + '|' + dir + '|' + JSON.stringify(ex) + '|' + a;
  let c = charCache.get(key);
  if (!c) {
    c = layer(CHAR_W, CHAR_H);
    DRAW[kind](c.getContext('2d'), L, frame, dir, ex, t);
    softenOutlines(c);
    if (charCache.size > 600) charCache.clear();
    charCache.set(key, c);
  }
  const fx = Math.round(x * PX), fy = Math.round(y * PX);
  ctx.drawImage(c, fx - CX, fy - CY);
  if (carry != null) drawItem(ctx, carry, fx - 14, fy - 112);
}

/** Kept for compatibility: draws a person at LOGICAL coordinates. */
export function drawPerson(ctx, x, y, L, frame, dir, extra) { drawChar(ctx, 'person', x, y, L, frame, dir, extra); }

/* ---------------------------------------------------------------- scene --- */
// Mars sky: butterscotch by day, and famously blue at sunset.
const SKY = {
  dawn: ['#f0b088', '#e99f80', '#d98a72', '#c27778', '#a86a7e', '#866089', '#5a4a7a', '#463e6c'],
  buy: ['#f6d4ac', '#f2c79a', '#edbd91', '#e8b48a', '#e2ab83', '#dca27c', '#d59975', '#cf906e'],
  noon: ['#f9dbb4', '#f6cfa2', '#f1c599', '#ecbb90', '#e6b289', '#e0a982', '#da9f7b', '#d49674'],
  sell: ['#e6b088', '#d9a07a', '#c99482', '#b88a8a', '#9c8ca0', '#7f8fb8', '#6f8ac0', '#5f84c8'],
  evening: ['#2c2050', '#241a44', '#201840', '#1b1538', '#171230', '#130f2a', '#100d24', '#0c0a1e'],
};
SKY.lobby = SKY.buy; SKY.over = SKY.evening; SKY.noonset = SKY.sell;

const isNight = p => p === 'evening' || p === 'over';
const cache = {};
function cached(key, w, h, draw) {
  if (cache[key]) return cache[key];
  const c = layer(w, h);
  draw(c.getContext('2d'));
  return (cache[key] = c);
}

/** Sky, stars, sun and moons: screen-space, one per phase. */
function skyLayer(phase) {
  return cached('sky:' + phase, FW, FF, ctx => {
    const sky = SKY[phase] || SKY.buy, night = isNight(phase);
    const bh = Math.ceil(FF / sky.length);
    sky.forEach((c, i) => {
      rect(ctx, 0, i * bh, FW, bh, c);
      // dithered seam into the next band
      if (i < sky.length - 1) for (let x = 0; x < FW; x += 2) { rect(ctx, x + ((i & 1) ? 1 : 0), (i + 1) * bh - 2, 1, 1, sky[i + 1]); rect(ctx, x + ((i & 1) ? 0 : 1), (i + 1) * bh - 1, 1, 1, sky[i + 1]); }
    });
    const r = rng(3);
    if (night || phase === 'dawn') {
      const n = night ? 170 : 60;
      for (let i = 0; i < n; i++) {
        const x = (r() * FW) | 0, y = (r() * FF * 0.62) | 0, k = r();
        const c = k < 0.1 ? '#a0d8ff' : k < 0.18 ? '#ffd27a' : '#fff6d8';
        rect(ctx, x, y, 1, 1, c);
        if (k > 0.93) { rect(ctx, x - 1, y, 3, 1, sh(c, 0.7)); rect(ctx, x, y - 1, 1, 3, sh(c, 0.7)); rect(ctx, x, y, 1, 1, '#ffffff'); }
      }
    }
    if (night) {
      // Phobos (lumpy, cratered) and Deimos, plus a tiny blue Earth
      ell(ctx, 160, 60, 11, 9, '#a89880'); ell(ctx, 158, 58, 9, 7, '#c9b8a0'); rect(ctx, 154, 55, 4, 2, '#e0d2bc');
      disc(ctx, 163, 63, 2, '#8a7a66'); disc(ctx, 155, 62, 1, '#8a7a66'); rect(ctx, 165, 56, 2, 2, '#a89880');
      disc(ctx, 300, 104, 4, '#c8b8a0'); rect(ctx, 298, 102, 2, 1, '#e8dcc8');
      rect(ctx, 420, 80, 3, 3, '#3f8ae0'); rect(ctx, 421, 80, 2, 1, '#9ad8ff'); rect(ctx, 420, 82, 1, 1, '#4caf50');
    } else {
      const sy = phase === 'dawn' ? 180 : phase === 'sell' ? 210 : 70, sx = phase === 'sell' ? 330 : 280;
      const sun = phase === 'sell' ? '#eef4ff' : '#fff2d6';
      disc(ctx, sx, sy, 16, sh(sky[2], 1.08)); disc(ctx, sx, sy, 13, sh(sky[1], 1.15));
      disc(ctx, sx, sy, 10, sun); rect(ctx, sx - 5, sy - 6, 4, 2, '#ffffff');
    }
  });
}

const MESAS_FAR = (() => { const r = rng(17); const o = []; let x = -100; while (x < 1300) { const w = 90 + ((r() * 140) | 0); o.push({ x, w, h: 30 + ((r() * 40) | 0) }); x += w - 30; } return o; })();
const MESAS = (() => { const r = rng(11); const o = []; let x = -120; while (x < 1300) { const w = 80 + ((r() * 120) | 0); o.push({ x, w, h: 48 + ((r() * 88) | 0), step: 8 + ((r() * 16) | 0) }); x += w - 20; } return o; })();
const DOMES = [{ x: 40, r: 52 }, { x: 192, r: 32 }, { x: 300, r: 68 }, { x: 500, r: 40 }, { x: 660, r: 56 }, { x: 860, r: 36 }, { x: 1000, r: 60 }];

function mesaColors(phase) {
  if (isNight(phase)) return { far: '#2a1e34', base: '#3a2438', dark: '#2a1a2a', lit: '#4e3250', strata: '#321e30' };
  if (phase === 'sell') return { far: '#9c7a86', base: '#8a5a5a', dark: '#6a4448', lit: '#b07a70', strata: '#7a4e50' };
  if (phase === 'dawn') return { far: '#b8806e', base: '#a85a48', dark: '#86443a', lit: '#cc7a5e', strata: '#964e40' };
  return { far: '#d29072', base: '#b8664a', dark: '#9a5038', lit: '#d8805c', strata: '#a85a40' };
}

/** Far + near mesas, wide strip drawn with parallax. */
function mesaLayer(phase) {
  return cached('mesa:' + phase, 1400, FF, ctx => {
    const m = mesaColors(phase);
    for (const s of MESAS_FAR) {
      rect(ctx, s.x + 10, FF - s.h - 30, s.w - 20, s.h + 30, m.far); rect(ctx, s.x, FF - s.h - 20, s.w, s.h + 20, m.far);
    }
    for (const s of MESAS) {
      const top = FF - s.h;
      rect(ctx, s.x + s.step, top, s.w - s.step * 2, s.h, m.base);
      rect(ctx, s.x, top + s.step, s.w, s.h - s.step, m.base);
      rect(ctx, s.x + s.step, top, s.w - s.step * 2, 2, m.lit);
      rect(ctx, s.x, top + s.step, s.step, 2, m.lit);
      rect(ctx, s.x + s.w - s.step, top + s.step, s.step, 2, sh(m.lit, 0.92));
      rect(ctx, s.x + s.w - 10, top + s.step, 10, s.h - s.step, m.dark);
      rect(ctx, s.x + s.w - s.step - 6, top + 2, 6, s.step, m.dark);
      for (let y = top + s.step + 10; y < FF - 6; y += 12) rect(ctx, s.x + 2, y, s.w - 12, 2, m.strata);
      for (let x = s.x + 12; x < s.x + s.w - 14; x += 22) rect(ctx, x, top + s.step + 3, 2, 6, m.dark);
    }
  });
}

function domeLayer(phase) {
  return cached('dome:' + phase, 1300, FF, ctx => {
    const night = isNight(phase);
    const frame = night ? '#4a4a64' : '#c8ccd8', frameD = night ? '#34344a' : '#9aa0ad';
    const glass = night ? '#2a4470' : '#9fd0e8', glassD = night ? '#1e3458' : '#82bcd8', glassL = night ? '#3a5a8a' : '#c8ecfa';
    for (const d of DOMES) {
      const cx = d.x, base = FF - 8, r = d.r;
      for (let dy = 0; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy)); rect(ctx, cx - w, base - dy, w * 2, 1, frame); }
      for (let dy = 2; dy <= r - 2; dy++) {
        const w = Math.round(Math.sqrt((r - 2) * (r - 2) - dy * dy));
        rect(ctx, cx - w, base - dy, w * 2, 1, dy < r * 0.3 ? glassD : glass);
      }
      // ribs
      for (const k of [-0.66, -0.33, 0, 0.33, 0.66]) {
        const rx = Math.round(cx + k * r), hh = Math.round(Math.sqrt(Math.max(0, r * r - (k * r) ** 2)));
        rect(ctx, rx, base - hh + 2, 1, hh - 2, frameD);
      }
      for (const k of [0.4, 0.75]) { const y = Math.round(base - r * k), w = Math.round(Math.sqrt(r * r - (r * k) ** 2)); rect(ctx, cx - w + 2, y, w * 2 - 4, 1, frameD); }
      // highlight arc
      for (let i = 0; i < r * 0.5; i++) { const a = 2.3 + i / r; rect(ctx, cx + Math.round(Math.cos(a) * (r - 6)), base - Math.round(Math.sin(a) * (r - 6)), 2, 1, glassL); }
      // base ring with lit windows
      rect(ctx, cx - r - 2, base, r * 2 + 4, 6, frameD); rect(ctx, cx - r - 2, base, r * 2 + 4, 1, frame);
      for (let i = -r + 8; i < r - 8; i += 12) {
        const lit = night ? ((i + d.x) % 3 ? '#ffd27a' : '#6ef0e0') : '#e8f4ff';
        rect(ctx, cx + i, base - 8, 4, 4, lit); rect(ctx, cx + i, base - 8, 4, 1, sh(lit, 1.15));
      }
      if (r > 50) { rect(ctx, cx + 4, base - r - 12, 1, 12, frameD); rect(ctx, cx + 2, base - r - 13, 5, 1, frameD); rect(ctx, cx + 4, base - r - 15, 1, 2, '#ff4a5a'); }
    }
  });
}

const ROCKS = (() => { const r = rng(5); return Array.from({ length: 40 }, () => ({ x: (r() * 384) | 0, y: FF + 4 + ((r() * 56) | 0), w: 3 + ((r() * 9) | 0), h: 2 + ((r() * 4) | 0) })); })();
const POSTERS = [
  { x: 560, y: 64, w: 54, h: 34, bg: '#ffb347', fg: '#2a1e10', lines: ['WE BUY', 'ALIEN', 'ART'] },
  { x: 1340, y: 50, w: 46, h: 40, bg: '#4fe0d0', fg: '#0f2a28', lines: ['NO', 'REFUNDS', 'EVER'] },
  { x: 1564, y: 150, w: 40, h: 30, bg: '#ff6fa8', fg: '#2a0f1c', lines: ['SOL', 'SALE'] },
];

/** Everything that scrolls 1:1 with the camera and doesn't animate. */
function worldLayer(phase, up, signLevel) {
  const key = 'world:' + phase + ':' + signLevel + ':' + (up.security || 0) + ':' + (up.restore || 0);
  return cached(key, FWORLD, FH, ctx => {
    const night = isNight(phase);
    const m = mesaColors(phase);
    /* ---- exterior ground ---- */
    const g0 = night ? '#5a2e26' : '#b65a3a', g1 = night ? '#4a2620' : '#a84e32', g2 = night ? '#3e201c' : '#984428';
    rect(ctx, 0, FF, 416, FH - FF, g0); rect(ctx, 0, FF + 18, 416, 20, g1); rect(ctx, 0, FF + 38, 416, FH - FF - 38, g2);
    rect(ctx, 0, FF, 416, 2, night ? '#6e3a2e' : '#d0744c');
    for (let x = 0; x < 416; x += 2) if ((x * 7) % 5 < 2) rect(ctx, x, FF + 17 + ((x >> 1) & 1), 1, 1, g0);
    for (const k of ROCKS) {
      rect(ctx, k.x, k.y, k.w, k.h, night ? '#43221c' : '#8e4228');
      rect(ctx, k.x + 1, k.y, k.w - 2, 1, night ? '#6e3a2e' : '#d68a60');
      rect(ctx, k.x + k.w - 1, k.y + 1, 1, k.h - 1, night ? '#2e1814' : '#6e3020');
      rect(ctx, k.x - 1, k.y + k.h, k.w + 2, 1, night ? '#33191a' : '#7a3822');
    }
    for (let x = 6; x < 380; x += 9) rect(ctx, x, FF + 26 + ((x * 13) % 5), 6, 1, night ? '#3e201c' : '#8e4228');  // tire tracks
    // landing pad
    rect(ctx, 76, FF + 10, 168, 8, '#4a4d58'); rect(ctx, 76, FF + 10, 168, 1, '#8f949e'); rect(ctx, 76, FF + 17, 168, 1, '#2a2d38');
    for (let x = 80; x < 240; x += 16) rect(ctx, x, FF + 12, 8, 4, '#f2c14e');
    // beacon tower (lattice)
    rect(ctx, 188, 220, 2, 148, '#3a3646'); rect(ctx, 198, 220, 2, 148, '#3a3646');
    for (let y = 224; y < 366; y += 12) { rect(ctx, 190, y, 8, 1, '#3a3646'); for (let i = 0; i < 6; i++) rect(ctx, 190 + i + (((y / 12) & 1) ? 0 : 2), y + 2 + i, 1, 1, '#2e2a3a'); }
    rect(ctx, 184, 212, 20, 8, '#3a3646'); rect(ctx, 184, 212, 20, 1, '#6b6f7a');
    rect(ctx, 192, 204, 4, 8, '#8f949e');
    // rover
    const rv = (x, y, w, h, c) => rect(ctx, x, y, w, h, c);
    rv(36, 316, 84, 30, O); rv(38, 318, 80, 26, '#e8e2d4'); rv(38, 318, 80, 2, '#ffffff'); rv(38, 338, 80, 6, '#c9c2b0');
    rv(78, 300, 38, 20, O); rv(80, 302, 34, 16, '#7cc6f2'); rv(82, 304, 8, 2, '#d8f0ff'); rv(81, 304, 1, 8, '#d8f0ff'); rv(80, 314, 34, 4, '#5aa8d8');
    rv(40, 326, 76, 3, '#ec8a2f'); rv(44, 320, 12, 4, '#3a3d46'); rv(46, 321, 8, 1, '#4fe0d0');
    rv(42, 304, 30, 2, '#4a4d58'); rv(44, 296, 26, 8, '#2a3a5a'); for (let i = 0; i < 4; i++) rv(46 + i * 6, 297, 5, 6, '#3f5a8a');
    rv(56, 304, 2, 14, '#6b6f7a');
    for (const wx of [44, 70, 96]) { disc(ctx, wx + 8, 350, 9, O); disc(ctx, wx + 8, 350, 8, '#3a3d46'); disc(ctx, wx + 8, 350, 4, '#8f949e'); rect(ctx, wx + 6, 348, 2, 2, '#c9ced8'); }
    rv(118, 326, 8, 4, '#ff6f61');

    /* ---- hull facade ---- */
    rect(ctx, 388, 0, 28, 280, '#5d616e');
    for (let y = 0; y < 280; y += 20) {
      rect(ctx, 388, y, 28, 1, '#4a4d58'); rect(ctx, 388, y + 1, 28, 1, '#7a7f8c');
      rect(ctx, 392, y + 6, 2, 2, '#9aa0ad'); rect(ctx, 410, y + 6, 2, 2, '#9aa0ad'); rect(ctx, 393, y + 7, 1, 1, '#3a3d46'); rect(ctx, 411, y + 7, 1, 1, '#3a3d46');
    }
    rect(ctx, 388, 0, 2, 280, '#7a7f8c'); rect(ctx, 414, 0, 2, 280, '#3a3d46');
    for (let y = 120; y < 160; y += 4) rect(ctx, 394, y, 16, 2, '#3a3d46');   // vent grille
    // sign bracket
    rect(ctx, 380, 192, 8, 4, '#3a3646'); rect(ctx, 380, 224, 8, 4, '#3a3646');

    /* ---- interior shell ---- */
    rect(ctx, 416, 0, FWORLD - 416, 28, '#1c1f2e');
    for (let x = 416; x < FWORLD; x += 64) { rect(ctx, x, 0, 6, 28, '#252a3a'); rect(ctx, x, 0, 1, 28, '#33394c'); }
    // back wall panels (64 px) with bevels and rivets
    rect(ctx, 416, 28, FWORLD - 416, 244, '#3e4a5e');
    for (let x = 416; x < FWORLD; x += 64) {
      rect(ctx, x, 32, 1, 236, '#2c3546'); rect(ctx, x + 1, 32, 1, 236, '#55657e');
      rect(ctx, x + 2, 32, 61, 1, '#4c5a72');
      rect(ctx, x + 63, 32, 1, 236, '#323e52');
      for (const [rx, ry] of [[6, 38], [56, 38], [6, 258], [56, 258]]) { rect(ctx, x + rx, ry, 2, 2, '#6a7890'); rect(ctx, x + rx + 1, ry + 1, 1, 1, '#2c3546'); }
      rect(ctx, x + 2, 150, 61, 1, '#36425a'); rect(ctx, x + 2, 151, 61, 1, '#46546c');
    }
    // conduits along the top
    rect(ctx, 416, 40, FWORLD - 416, 6, '#2c3546'); rect(ctx, 416, 41, FWORLD - 416, 1, '#55657e'); rect(ctx, 416, 45, FWORLD - 416, 1, '#1e2533');
    rect(ctx, 416, 50, FWORLD - 416, 3, '#7a4a3a'); rect(ctx, 416, 50, FWORLD - 416, 1, '#9a6a54');
    for (let x = 440; x < FWORLD; x += 128) { rect(ctx, x, 38, 6, 18, '#6b6f7a'); rect(ctx, x, 38, 6, 1, '#9aa0ad'); }
    rect(ctx, 416, 28, FWORLD - 416, 4, '#6a7890'); rect(ctx, 416, 31, FWORLD - 416, 1, '#2c3546');
    // wainscot + kick plate
    rect(ctx, 416, 272, FWORLD - 416, 96, '#2c3546');
    rect(ctx, 416, 272, FWORLD - 416, 2, night ? '#4fe0d0' : '#6a7890'); rect(ctx, 416, 274, FWORLD - 416, 1, '#1e2533');
    for (let x = 416; x < FWORLD; x += 64) {
      rect(ctx, x + 6, 286, 52, 64, '#252d3c'); rect(ctx, x + 6, 286, 52, 1, '#1e2533'); rect(ctx, x + 6, 349, 52, 1, '#36415a');
      rect(ctx, x + 6, 286, 1, 64, '#1e2533'); rect(ctx, x + 57, 286, 1, 64, '#36415a');
    }
    rect(ctx, 416, 356, FWORLD - 416, 12, '#4a4d58'); rect(ctx, 416, 356, FWORLD - 416, 1, '#6b6f7a');
    for (let x = 420; x < FWORLD; x += 8) rect(ctx, x, 360, 4, 1, '#3a3d46');
    // floor: deck plates with diamond tread
    rect(ctx, 416, FF, FWORLD - 416, FH - FF, '#4a4d58');
    rect(ctx, 416, FF, FWORLD - 416, 2, '#9aa0ad'); rect(ctx, 416, FF + 2, FWORLD - 416, 1, '#6b6f7a');
    for (let y = FF + 6; y < FH; y += 6) for (let x = 418 + ((y / 6) & 1) * 3; x < FWORLD; x += 6) { rect(ctx, x, y, 2, 1, '#5a5e6a'); rect(ctx, x, y + 1, 2, 1, '#3e414c'); }
    for (let x = 416; x < FWORLD; x += 64) { rect(ctx, x, FF + 3, 1, 29, '#2a2d38'); rect(ctx, x + 1, FF + 3, 1, 29, '#6b6f7a'); rect(ctx, x + 32, FF + 34, 1, FH - FF - 34, '#2a2d38'); }
    rect(ctx, 416, FF + 32, FWORLD - 416, 1, '#2a2d38'); rect(ctx, 416, FF + 33, FWORLD - 416, 1, '#6b6f7a');
    // airlock frame
    rect(ctx, 384, 272, 36, 8, '#2a2d38'); rect(ctx, 384, 272, 36, 1, '#6b6f7a'); rect(ctx, 396, 274, 12, 4, '#14202e');
    for (const px of [386, 410]) {
      rect(ctx, px, 280, 8, FF - 280, '#2a2d38');
      for (let y = 280; y < FF; y += 10) { rect(ctx, px + 1, y, 6, 5, '#f2c14e'); rect(ctx, px + 1, y + 5, 6, 5, '#2a2d38'); rect(ctx, px + 1, y, 6, 1, '#ffd87a'); }
    }
    rect(ctx, 384, FF - 2, 36, 4, '#6b6f7a');
    // porthole behind the counter
    const pcx = 488, pcy = 124, pr = 30;
    disc(ctx, pcx, pcy, 43, O); disc(ctx, pcx, pcy, 42, '#6b6f7a'); disc(ctx, pcx, pcy, 40, '#9aa0ad'); disc(ctx, pcx, pcy, 37, '#7a808c');
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; const bx = pcx + Math.round(Math.cos(a) * 38.5), by = pcy + Math.round(Math.sin(a) * 38.5); rect(ctx, bx - 2, by - 2, 4, 4, '#c9ced8'); rect(ctx, bx, by, 2, 2, '#4a4d58'); }
    disc(ctx, pcx, pcy, 33, O); disc(ctx, pcx, pcy, 32, '#3a3d46');
    const sky = SKY[phase] || SKY.buy;
    for (let dy = -pr; dy <= pr; dy++) {
      const hw = Math.floor(Math.sqrt(pr * pr - dy * dy));
      const y = pcy + dy, x0 = pcx - hw, x1 = pcx + hw;
      const span = (a, b, c) => { const l = Math.max(a, x0), rr = Math.min(b, x1); if (rr >= l) rect(ctx, l, y, rr - l + 1, 1, c); };
      span(x0, x1, sky[Math.min(7, Math.max(0, Math.floor((dy + pr) / (2 * pr) * 8)))]);
      if (y >= pcy + 8) span(x0, x1, y >= pcy + 20 ? m.dark : m.base);
      else if (y >= pcy - 2) { span(pcx - 14, pcx + 10, m.base); span(pcx + 6, pcx + 10, m.dark); }
      else if (y >= pcy - 6) span(pcx - 10, pcx + 6, y === pcy - 6 ? m.lit : m.base);
      if (night && dy < 0 && (dy * 7 + hw) % 11 === 0) span(pcx - hw + ((dy * 13) & 15) + 4, pcx - hw + ((dy * 13) & 15) + 4, '#fff6d8');
    }
    if (night) { disc(ctx, pcx + 12, pcy - 14, 3, '#c9b8a0'); }
    for (let i = 0; i < 10; i++) rect(ctx, pcx - 18 + i, pcy - 22 + Math.round(i * 0.4), 2, 1, '#e8f4ff');
    rect(ctx, pcx - 20, pcy - 18, 1, 4, '#e8f4ff');
    // posters
    for (const p of POSTERS) {
      rect(ctx, p.x - 1, p.y - 1, p.w + 2, p.h + 2, O); rect(ctx, p.x, p.y, p.w, p.h, p.bg);
      rect(ctx, p.x, p.y, p.w, 1, sh(p.bg, 1.2)); rect(ctx, p.x + p.w - 1, p.y + 1, 1, p.h - 1, sh(p.bg, 0.8));
      rect(ctx, p.x + p.w / 2 - 1, p.y - 3, 3, 3, '#c9ced8');
      p.lines.forEach((l, i) => pixelText(ctx, l, p.x + Math.round((p.w - textW(l)) / 2), p.y + 4 + i * 10, p.fg));
    }
    // strip light housings
    for (const lx of [600, 940, 1280, 1720]) {
      rect(ctx, lx - 30, 26, 60, 10, '#14161f'); rect(ctx, lx - 30, 26, 60, 1, '#33394c');
      rect(ctx, lx - 26, 34, 52, 3, night ? '#bff8f0' : '#e8f4ff'); rect(ctx, lx - 26, 36, 52, 1, night ? '#7fd8cc' : '#b8c8d8');
    }

    /* ---- shelving backs (items are drawn live on top) ---- */
    for (const ux of SHELF_UNITS) drawShelfUnit(ctx, ux, night);

    /* ---- workbench + pegboard ---- */
    rect(ctx, 1394, 138, 140, 86, O); rect(ctx, 1396, 140, 136, 82, '#55657e'); rect(ctx, 1396, 140, 136, 2, '#6a7890'); rect(ctx, 1396, 220, 136, 2, '#3e4a5e');
    for (let y = 146; y < 216; y += 8) for (let x = 1402; x < 1528; x += 8) { rect(ctx, x, y, 2, 2, '#323e52'); }
    // tools on the pegboard
    rect(ctx, 1412, 152, 4, 30, '#c9ced8'); rect(ctx, 1406, 150, 16, 6, '#c9ced8'); rect(ctx, 1406, 150, 16, 1, '#ffffff'); rect(ctx, 1412, 182, 4, 2, '#8f949e');
    rect(ctx, 1440, 160, 28, 8, '#ec8a2f'); rect(ctx, 1440, 160, 28, 2, '#ffb36a'); rect(ctx, 1466, 162, 8, 4, '#7cc6f2'); rect(ctx, 1446, 168, 6, 12, '#3a3d46');
    rect(ctx, 1490, 152, 6, 38, '#8f949e'); rect(ctx, 1490, 152, 2, 38, '#c9ced8'); rect(ctx, 1488, 188, 10, 6, '#f2c14e');
    rect(ctx, 1508, 150, 14, 14, '#4fe0d0'); rect(ctx, 1510, 152, 10, 10, '#1e3a40'); rect(ctx, 1512, 154, 2, 2, '#4fe0d0');
    rect(ctx, 1404, 200, 40, 6, '#6b3d22'); rect(ctx, 1404, 200, 40, 2, '#8a5a34');
    // bench
    rect(ctx, 1394, 314, 142, 14, O); rect(ctx, 1396, 316, 138, 10, '#6b6f7a'); rect(ctx, 1396, 316, 138, 2, '#9aa0ad'); rect(ctx, 1396, 324, 138, 2, '#4a4d58');
    rect(ctx, 1402, 328, 8, 40, '#3a3d46'); rect(ctx, 1520, 328, 8, 40, '#3a3d46'); rect(ctx, 1402, 344, 126, 4, '#3a3d46');
    // vise + lamp
    rect(ctx, 1500, 304, 20, 12, '#3f5a8a'); rect(ctx, 1500, 304, 20, 2, '#6a8ac0'); rect(ctx, 1506, 298, 8, 6, '#3f5a8a'); rect(ctx, 1520, 308, 8, 2, '#c9ced8');
    rect(ctx, 1420, 284, 2, 32, '#6b6f7a'); rect(ctx, 1420, 284, 16, 2, '#6b6f7a'); rect(ctx, 1432, 284, 12, 8, '#ffb347'); rect(ctx, 1434, 292, 8, 2, '#fff2b0');
    if ((up.restore || 0) > 0) { rect(ctx, 1436, 300, 30, 16, '#c9ced8'); rect(ctx, 1440, 304, 22, 8, '#4fe0d0'); rect(ctx, 1442, 306, 6, 2, '#bff8f0'); rect(ctx, 1476, 304, 20, 12, '#ec8a2f'); rect(ctx, 1476, 304, 20, 2, '#ffb36a'); }

    /* ---- office: holo board, desk, plant, safe ---- */
    rect(ctx, 1638, 106, 164, 120, O); rect(ctx, 1640, 108, 160, 116, '#14202e'); rect(ctx, 1640, 108, 160, 2, '#2a3a50');
    const cols = ['#4fe0d0', '#ffb347', '#ff6fa8', '#8cf06e', '#7cc6f2', '#ffb347'];
    for (let i = 0; i < 6; i++) {
      const nx = 1652 + (i % 3) * 48, ny = 122 + ((i / 3) | 0) * 50, c = cols[i];
      rect(ctx, nx, ny, 40, 40, '#0b1420'); rect(ctx, nx + 1, ny + 1, 38, 38, '#1d2c3e'); rect(ctx, nx + 1, ny + 1, 38, 1, '#2e4258');
      rect(ctx, nx + 5, ny + 6, 26, 3, c); rect(ctx, nx + 5, ny + 14, 18, 2, sh(c, 0.75)); rect(ctx, nx + 5, ny + 20, 22, 2, sh(c, 0.75));
      for (let b = 0; b < 4; b++) rect(ctx, nx + 6 + b * 7, ny + 34 - (b + i) % 4 * 3 - 3, 5, (b + i) % 4 * 3 + 3, sh(c, 0.6));
    }
    pixelText(ctx, 'UPGRADES', 1696, 94, '#4fe0d0');
    // desk + terminal + chair
    rect(ctx, 1698, 314, 142, 12, O); rect(ctx, 1700, 316, 138, 8, '#6b6f7a'); rect(ctx, 1700, 316, 138, 2, '#9aa0ad');
    rect(ctx, 1706, 324, 8, 44, '#3a3d46'); rect(ctx, 1824, 324, 8, 44, '#3a3d46');
    rect(ctx, 1770, 286, 46, 30, O); rect(ctx, 1772, 288, 42, 24, '#14202e'); rect(ctx, 1776, 292, 30, 3, '#4fe0d0'); rect(ctx, 1776, 299, 20, 2, '#4fe0d0'); rect(ctx, 1776, 304, 26, 2, '#2a8a80'); rect(ctx, 1788, 312, 10, 4, '#3a3d46');
    rect(ctx, 1720, 304, 20, 12, '#c9ced8'); rect(ctx, 1724, 300, 12, 4, '#ff6fa8'); rect(ctx, 1722, 306, 16, 2, '#9aa0ad');
    rect(ctx, 1740, 326, 26, 4, '#3f5a8a'); rect(ctx, 1752, 330, 2, 30, '#3a3d46'); rect(ctx, 1744, 360, 18, 3, '#3a3d46'); rect(ctx, 1764, 300, 4, 28, '#3f5a8a');
    // potted Mars potato plant
    rect(ctx, 1604, 340, 22, 28, '#9a5a3a'); rect(ctx, 1602, 338, 26, 4, '#b8704a'); rect(ctx, 1604, 342, 22, 1, '#7a4428');
    for (const [lx, ly, lw] of [[1608, 318, 4], [1614, 310, 4], [1620, 316, 4], [1604, 326, 6], [1618, 324, 8], [1612, 330, 6]]) { rect(ctx, lx, ly, lw, 10, '#4caf50'); rect(ctx, lx, ly, 2, 10, '#7bd85a'); }
    // safe
    rect(ctx, 1846, 298, 62, 70, O); rect(ctx, 1848, 300, 58, 66, '#6b6f7a'); rect(ctx, 1848, 300, 58, 2, '#9aa0ad'); rect(ctx, 1904, 302, 2, 64, '#4a4d58');
    rect(ctx, 1854, 306, 46, 54, '#5d616e'); rect(ctx, 1854, 306, 46, 1, '#4a4d58');
    disc(ctx, 1876, 330, 12, '#3a3d46'); disc(ctx, 1876, 330, 10, '#9aa0ad'); disc(ctx, 1876, 330, 5, '#c9ced8'); rect(ctx, 1875, 320, 2, 6, '#3a3d46');
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; rect(ctx, 1876 + Math.round(Math.cos(a) * 8), 330 + Math.round(Math.sin(a) * 8), 1, 1, '#4a4d58'); }
    rect(ctx, 1892, 322, 4, 18, '#c9ced8'); rect(ctx, 1892, 322, 4, 1, '#ffffff');

    /* ---- security cameras ---- */
    const sec = up.security || 0;
    const cam = x => {
      rect(ctx, x, 28, 4, 8, '#1c1f2e'); rect(ctx, x - 10, 36, 22, 10, '#c9ced8'); rect(ctx, x - 10, 36, 22, 2, '#ffffff'); rect(ctx, x - 10, 44, 22, 2, '#9aa0ad');
      rect(ctx, x - 16, 38, 6, 6, '#1c1f2e'); rect(ctx, x - 15, 39, 3, 3, '#3a5a8a'); rect(ctx, x - 15, 39, 1, 1, '#9ad8ff');
    };
    if (sec >= 1) cam(470);
    if (sec >= 2) cam(1244);
  });
}

/* ------------------------------------------------------------- shelves --- */
const SHELF_UNITS = [740, 900, 1060, 1220];
const SHELF_BOARDS = [224, 292, 360];
export const SHELF_SLOTS = [];
for (const by of SHELF_BOARDS) for (const ux of SHELF_UNITS) for (const ix of [10, 54, 98]) SHELF_SLOTS.push([ux + ix, by - 30]);

function drawShelfUnit(ctx, ux, night) {
  rect(ctx, ux + 6, 152, 124, 216, '#344158');
  for (let y = 156; y < 366; y += 6) for (let x = ux + 8 + ((y / 6) & 1) * 3; x < ux + 128; x += 6) rect(ctx, x, y, 2, 2, '#2c3850');
  for (const by of SHELF_BOARDS) rect(ctx, ux + 6, by - 4, 124, 4, '#2a3348');
  for (const px of [ux, ux + 130]) {
    rect(ctx, px, 150, 6, 218, '#6b6f7a'); rect(ctx, px, 150, 2, 218, '#9aa0ad'); rect(ctx, px + 5, 150, 1, 218, '#4a4d58');
    for (let y = 160; y < 364; y += 8) rect(ctx, px + 2, y, 2, 3, '#3a3d46');
  }
  for (const by of SHELF_BOARDS) {
    rect(ctx, ux, by, 136, 6, '#9aa0ad'); rect(ctx, ux, by, 136, 1, '#d8dde6'); rect(ctx, ux, by + 5, 136, 1, '#5d616e');
    rect(ctx, ux, by + 6, 136, 1, night ? '#4fe0d0' : '#3a3d46');
  }
  rect(ctx, ux - 2, 146, 140, 6, '#9aa0ad'); rect(ctx, ux - 2, 146, 140, 1, '#d8dde6'); rect(ctx, ux - 2, 151, 140, 1, '#ff6f61');
}

function drawShelfItems(ctx, inv) {
  inv.slice(0, SHELF_SLOTS.length).forEach((it, i) => {
    const [x, y] = SHELF_SLOTS[i];
    rect(ctx, x + 4, y + 28, 20, 2, '#2a3348');            // contact shadow
    drawItem(ctx, it.id, x, y);
    rect(ctx, x + 20, y + 30, 8, 5, '#e8eef8'); rect(ctx, x + 21, y + 32, 5, 1, '#8f9cc0');   // price tag
  });
}

/* ------------------------------------------------------------- public --- */
export function drawScene(ctx, cam, S) {
  const phase = S.phase || 'buy';
  const night = isNight(phase);
  const t = S.t || 0;
  ctx.drawImage(skyLayer(phase), 0, 0);
  ctx.drawImage(mesaLayer(phase), -Math.round(cam * 0.3) - 60, 0);
  ctx.drawImage(domeLayer(phase), -Math.round(cam * 0.55), 0);
  ctx.drawImage(worldLayer(phase, S.up || {}, S.signLevel || 0), -cam, 0);
  ctx.save(); ctx.translate(-cam, 0);
  // animated bits
  const blink = Math.floor(t / 600) % 2;
  rect(ctx, 190, 198, 8, 6, blink ? '#ff4a5a' : '#7a2a30'); if (blink) rect(ctx, 192, 198, 4, 2, '#ffb0a8');
  drawSign(ctx, S.signLevel || 0, night, t);
  if (Math.floor(t / 400) % 2) rect(ctx, 1640, 108, 160, 2, '#4fe0d0');
  rect(ctx, 398, 275, 8, 2, Math.floor(t / 900) % 2 ? '#6ef06e' : '#2a6a2a');
  drawShelfItems(ctx, S.inv || []);
  if ((S.up?.security || 0) >= 1 && Math.floor(t / 700) % 2) rect(ctx, 479, 39, 2, 2, '#ff4a5a');
  ctx.restore();
}

function drawSign(ctx, lvl, night, t) {
  const x = 204, y = 180, w = 176, h = 56;
  const frame = ['#4a4d58', '#5d616e', '#8f949e', '#c9ced8', '#ffb347', '#4fe0d0'][lvl];
  rect(ctx, x - 1, y - 1, w + 2, h + 2, O); rect(ctx, x, y, w, h, frame); rect(ctx, x, y, w, 1, sh(frame, 1.25)); rect(ctx, x, y + h - 2, w, 2, sh(frame, 0.72));
  rect(ctx, x + 4, y + 4, w - 8, h - 8, '#14101e');
  for (const [bx, by] of [[x + 2, y + 2], [x + w - 4, y + 2], [x + 2, y + h - 4], [x + w - 4, y + h - 4]]) rect(ctx, bx, by, 2, 2, sh(frame, 1.3));
  const flick = lvl === 0 && night && Math.floor(t / 900) % 5 === 0;
  const neon = flick ? '#5a3040' : lvl >= 2 || night ? '#ff6f61' : '#d8a090';
  const neon2 = lvl >= 3 ? '#4fe0d0' : '#ffb347';
  // neon: a soft halo in a darker tone, then the tube
  pixelText(ctx, 'RED PLANET', x + 11, y + 10, sh(neon, 0.45)); pixelText(ctx, 'RED PLANET', x + 10, y + 9, neon);
  pixelText(ctx, 'PAWN', x + 11, y + 23, sh(neon2, 0.45), 2); pixelText(ctx, 'PAWN', x + 10, y + 22, neon2, 2);
  for (let i = 0; i < lvl; i++) { rect(ctx, x + 66 + i * 9, y + 32, 6, 6, '#ffb347'); rect(ctx, x + 66 + i * 9, y + 32, 2, 2, '#fff2b0'); }
  // three planets: the pawnbroker's balls in orbit
  for (const [bx, by, c] of [[x + 138, y + 10, '#ff6f61'], [x + 154, y + 10, '#ffb347'], [x + 146, y + 26, '#4fe0d0']]) {
    disc(ctx, bx + 6, by + 6, 7, O); disc(ctx, bx + 6, by + 6, 6, sh(c, 0.75)); disc(ctx, bx + 5, by + 5, 5, c); rect(ctx, bx + 3, by + 3, 2, 2, '#ffffff');
  }
  rect(ctx, x + 136, y + 22, 34, 1, sh(neon2, 0.5));
}

export function drawCounterFront(ctx, cam, S) {
  ctx.save(); ctx.translate(-cam, 0);
  // body
  rect(ctx, 484, 334, 180, 34, O); rect(ctx, 486, 336, 176, 32, '#4a4d58');
  for (let x = 494; x < 656; x += 42) {
    rect(ctx, x, 342, 34, 20, '#3a3d46'); rect(ctx, x, 342, 34, 1, '#2a2d38'); rect(ctx, x, 361, 34, 1, '#5d616e');
    rect(ctx, x + 3, 346, 2, 2, '#9aa0ad'); rect(ctx, x + 29, 346, 2, 2, '#9aa0ad'); rect(ctx, x + 12, 350, 10, 2, '#5d616e');
  }
  rect(ctx, 486, 364, 176, 2, '#4fe0d0'); rect(ctx, 486, 366, 176, 2, '#2a8a80');
  // top
  rect(ctx, 478, 326, 192, 10, O); rect(ctx, 480, 328, 188, 7, '#9aa0ad'); rect(ctx, 480, 328, 188, 2, '#d8dde6'); rect(ctx, 480, 334, 188, 1, '#6b6f7a');
  // holo terminal
  rect(ctx, 618, 290, 46, 38, O); rect(ctx, 620, 292, 42, 34, '#6b6f7a'); rect(ctx, 620, 292, 42, 2, '#9aa0ad');
  rect(ctx, 624, 296, 34, 16, '#0f1a24'); rect(ctx, 624, 296, 34, 1, '#1e3040');
  if (S.registerText) pixelText(ctx, S.registerText, 626 + Math.max(0, 32 - textW(S.registerText)) / 2, 300, '#4fe0d0');
  rect(ctx, 625, 316, 6, 4, '#ffb347'); rect(ctx, 634, 316, 6, 4, '#4fe0d0'); rect(ctx, 643, 316, 6, 4, '#ff6f61'); rect(ctx, 652, 316, 6, 4, '#9aa0ad');
  rect(ctx, 625, 316, 6, 1, '#ffd9a0'); rect(ctx, 634, 316, 6, 1, '#bff8f0'); rect(ctx, 643, 316, 6, 1, '#ffb0a8');
  if (S.counterItem != null) {
    rect(ctx, 496, 324, 34, 4, '#1e3a40'); rect(ctx, 498, 324, 30, 1, '#4fe0d0');
    drawItem(ctx, S.counterItem, 499, 296);
  }
  ctx.restore();
}

export function drawNight(ctx, phase) {
  if (phase === 'evening' || phase === 'over') {
    ctx.fillStyle = 'rgba(16,12,48,0.32)'; ctx.fillRect(0, 0, FW, FH);
  }
}

export { drawItem, ITEMS };
