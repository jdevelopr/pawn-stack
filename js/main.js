/**
 * main.js — entry point. Screens, solo/host/join wiring, render loop, input, panels.
 *
 * Roles:
 *   solo   — Sim runs here; one local player.
 *   host   — Sim runs here; host plays locally and relays views to joiners.
 *   client — no Sim; sends actions, renders views the host sends back.
 */
import { Sim, UPGRADES, COND, capOf } from './sim.js';
import { ITEMS, TIERS, itemIcon } from './items.js';
import { createHost, createClient, clientId, joinUrl, roomFromUrl } from './net.js';
import {
  W, H, WORLD_W, FLOOR, ZONES, COUNTER_X, CUSTOMER_X,
  drawScene, drawCounterFront, drawPerson, drawNight, lookFromSeed, bubble, pixelTextOutlined, textW,
  drawChar,
} from './art.js';
import { sfx, setMuted, isMuted } from './sound.js';
import { PROFILES, say } from './profiles.js';

const SLUG = 'redplanetpawn-v1';
const SAVE_KEY = 'redplanetpawn-save';
const MAX_PLAYERS = 4;
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = n => (n < 0 ? '-' : '') + Math.abs(Math.round(n)).toLocaleString('en-US') + ' CR';
const seedOf = id => [...String(id)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

const app = {
  mode: null, sim: null, host: null, client: null, pid: null,
  view: null, viewAt: 0, lastFx: -1, maxDays: 20,
  lobbyReady: {}, started: false,
};

function setScreen(name) { document.body.dataset.screen = name; }
function status(el, text, err = false) { el.textContent = text || ''; el.classList.toggle('err', !!err); }

/* ================================================================= HOME === */

const nameInput = $('#name-input');
nameInput.value = store.get('pawn-name') || '';
nameInput.addEventListener('input', () => store.set('pawn-name', nameInput.value.trim()));
const playerName = () => nameInput.value.trim() || 'Owner';

for (const b of document.querySelectorAll('#len-seg button')) {
  b.addEventListener('click', () => {
    document.querySelectorAll('#len-seg button').forEach(x => x.classList.toggle('on', x === b));
    app.maxDays = +b.dataset.len;
    sfx('click');
  });
}
if (store.get(SAVE_KEY)) $('#continue-btn').hidden = false;

$('#solo-btn').addEventListener('click', () => {
  sfx('click');
  store.del(SAVE_KEY);
  app.mode = 'solo'; app.pid = 'me';
  app.sim = new Sim({ maxDays: app.maxDays, mode: 'solo' });
  app.sim.addPlayer('me', playerName());
  app.sim.start(Date.now());
  startGame();
});

$('#continue-btn').addEventListener('click', () => {
  sfx('click');
  try {
    app.sim = Sim.load(JSON.parse(store.get(SAVE_KEY)));
    app.mode = 'solo'; app.pid = 'me';
    startGame();
  } catch (e) {
    store.del(SAVE_KEY); $('#continue-btn').hidden = true;
    status($('#home-status'), 'That save could not be loaded.', true);
  }
});

$('#host-btn').addEventListener('click', () => { sfx('click'); hostGame(); });
$('#join-form').addEventListener('submit', e => {
  e.preventDefault(); sfx('click');
  const code = $('#join-code').value.trim().toUpperCase();
  if (code.length !== 4) return status($('#home-status'), 'Room codes are 4 letters.', true);
  joinGame(code);
});
$('#join-code').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
$('#help-btn').addEventListener('click', () => { $('#help').hidden = false; $('#help-close').focus(); });
$('#help-close').addEventListener('click', () => { $('#help').hidden = true; });
$('#again-btn').addEventListener('click', () => { location.href = location.pathname; });

/* ================================================================ HOST === */

function hostGame() {
  if (typeof Peer === 'undefined') return status($('#home-status'), 'Networking library failed to load. Check your connection.', true);
  if (!app.maxDays) app.maxDays = 20;
  status($('#home-status'), 'Opening a room...');
  app.mode = 'host';
  app.pid = clientId();
  app.sim = new Sim({ maxDays: app.maxDays, mode: 'mp' });
  app.sim.addPlayer(app.pid, playerName());

  const host = app.host = createHost({
    slug: SLUG,
    accept(cid) {
      if (cid === app.pid) return 'You cannot join your own room in the same browser.';
      const known = !!app.sim.s.players[cid];
      if (app.started && !known) return 'That game already started.';
      if (!known && app.sim.s.order.length >= MAX_PLAYERS) return 'Room is full.';
      return null;
    },
  });
  host.on('open', code => {
    $('#room-code').textContent = code;
    $('#join-url').value = joinUrl(code);
    $('#ready-btn').hidden = true;
    $('#start-btn').hidden = false;
    $('#lobby-len').textContent = `${app.maxDays} sol game`;
    setScreen('lobby');
    renderLobby();
  });
  host.on('join', (cid, name) => {
    app.sim.addPlayer(cid, name);
    if (app.started) { app.sim.setConnected(cid, true); pushViews(true); host.sendTo(cid, { t: 'start' }); toast(`${name} reconnected.`, 'good'); }
    else { sfx('join'); renderLobby(); }
  });
  host.on('leave', cid => {
    if (!app.started) { delete app.lobbyReady[cid]; app.sim.removePlayer(cid); renderLobby(); }
    else { app.sim.setConnected(cid, false); toast(`${app.sim.s.players[cid]?.name} disconnected.`, 'bad'); }
  });
  host.on('msg', (cid, msg) => {
    if (msg.t === 'ready' && !app.started) { app.lobbyReady[cid] = !!msg.v; sfx('ready'); renderLobby(); }
    else if (msg.t === 'act' && app.started) { app.sim.act(cid, msg.a, Date.now()); }
  });
  host.on('error', err => {
    console.error(err);
    const msg = err.type === 'network' || err.type === 'server-error' ? 'Cannot reach the matchmaking server.' : (err.message || 'Network error.');
    if (document.body.dataset.screen === 'lobby') status($('#lobby-status'), msg, true);
    else if (document.body.dataset.screen === 'home') status($('#home-status'), msg, true);
    else toast(msg, 'err');
  });
  host.open();
}

function lobbyPlayers() {
  const S = app.sim.s;
  return S.order.map(id => ({
    pid: id, name: S.players[id].name, color: S.players[id].color,
    ready: id === app.pid ? true : !!app.lobbyReady[id], host: id === app.pid,
  }));
}

function renderLobby(players) {
  if (app.mode === 'host') {
    players = lobbyPlayers();
    app.host.broadcast({ t: 'lobby', players, maxDays: app.maxDays });
    const others = players.filter(p => !p.host);
    $('#start-btn').disabled = !(others.length >= 1 && others.every(p => p.ready));
    status($('#lobby-status'), others.length ? '' : 'Waiting for players to join.');
  }
  const ul = $('#roster');
  const prev = new Set([...ul.children].map(li => li.dataset.pid));
  ul.innerHTML = '';
  (players || []).forEach((p, i) => {
    const li = document.createElement('li');
    li.dataset.pid = p.pid;
    if (!prev.has(p.pid)) li.style.setProperty('--i', i); else li.style.animation = 'none';
    li.innerHTML = `<span class="sw" style="background:${p.color}"></span><span class="nm">${esc(p.name)}${p.pid === app.pid ? ' (you)' : ''}</span>
      <span class="tag ${p.ready ? 'ok' : ''}">${p.host ? 'HOST' : p.ready ? 'READY' : 'NOT READY'}</span>`;
    ul.appendChild(li);
  });
}

$('#start-btn').addEventListener('click', () => {
  if (app.mode !== 'host') return;
  sfx('click');
  app.started = true;
  app.sim.start(Date.now());
  app.host.broadcast({ t: 'start' });
  startGame();
});
$('#copy-btn').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#join-url').value); $('#copy-btn').textContent = 'Copied'; }
  catch { $('#join-url').select(); }
  setTimeout(() => ($('#copy-btn').textContent = 'Copy link'), 1400);
});
$('#leave-btn').addEventListener('click', () => { location.href = location.pathname; });

/* ================================================================ JOIN === */

let readyState = false;
function joinGame(code) {
  if (typeof Peer === 'undefined') return status($('#home-status'), 'Networking library failed to load. Check your connection.', true);
  app.mode = 'client';
  app.code = code;
  status($('#home-status'), 'Connecting...');
  const client = app.client = createClient({ slug: SLUG, code, name: playerName() });
  client.on('welcome', pid => {
    app.pid = pid;
    try { sessionStorage.setItem('pawn-room', code); } catch {}
    if (!app.started) {
      $('#room-code').textContent = code;
      $('#join-url').value = joinUrl(code);
      $('#start-btn').hidden = true;
      $('#ready-btn').hidden = false;
      setScreen('lobby');
      status($('#lobby-status'), '');
    }
  });
  client.on('msg', msg => {
    if (msg.t === 'lobby') {
      $('#lobby-len').textContent = `${msg.maxDays} sol game`;
      renderLobby(msg.players);
    } else if (msg.t === 'start') {
      if (!app.started) { app.started = true; startGame(); }
    } else if (msg.t === 'view') {
      if (!app.started) { app.started = true; startGame(); }
      setView(msg.v);
    }
  });
  client.on('rejected', reason => {
    setScreen('home'); status($('#home-status'), reason, true);
  });
  client.on('disconnected', () => {
    if (app.started && app.view?.phase !== 'over') {
      toast('Lost connection to host. Reconnecting...', 'err');
      setTimeout(() => { try { client.destroy(); } catch {} joinGame(code); }, 2000);
    } else if (!app.started) {
      setScreen('home'); status($('#home-status'), 'The host closed the room.', true);
    }
  });
  client.on('error', err => {
    console.error(err);
    const msg = err.message || 'Network error.';
    if (app.started) toast(msg, 'err');
    else { setScreen('home'); status($('#home-status'), msg, true); }
  });
  client.connect();
}

$('#ready-btn').addEventListener('click', () => {
  readyState = !readyState;
  app.client.send({ t: 'ready', v: readyState });
  $('#ready-btn').textContent = readyState ? 'Not ready' : 'Ready';
  $('#ready-btn').classList.toggle('primary', !readyState);
  sfx('ready');
});

const urlRoom = roomFromUrl();
if (urlRoom) {
  $('#join-code').value = urlRoom;
  if (store.get('pawn-name')) joinGame(urlRoom);
  else { status($('#home-status'), 'Enter your name, then press Join.'); nameInput.focus(); }
}

/* ============================================================= ACTIONS === */

function act(a) {
  if (app.mode === 'client') app.client.send({ t: 'act', a });
  else { app.sim.act(app.pid, a, Date.now()); refreshLocal(); }
}

function refreshLocal() {
  const now = Date.now();
  if (app.mode === 'solo' || app.mode === 'host') setView(app.sim.viewFor(app.pid, now));
}

let lastSend = 0;
function pushViews(force) {
  if (app.mode !== 'host') return;
  const now = Date.now();
  if (!force && !app.sim.dirty && now - lastSend < 1000) return;
  for (const pid of app.sim.s.order) {
    if (pid === app.pid || !app.host.connected(pid)) continue;
    app.host.sendTo(pid, { t: 'view', v: app.sim.viewFor(pid, now) });
  }
  app.sim.dirty = false;
  lastSend = now;
}

/* ================================================================ GAME === */

const cv = $('#cv');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

const keeper = { x: COUNTER_X, dir: -1, frame: 0, anim: 0, moving: false };
let cam = COUNTER_X - W / 2;
const npcs = [];    // customers walking in/out
const parts = [];   // particles
const keys = new Set();
let panel = null;   // 'inv' | 'upg' | 'eve' | null
let simTimer = null;

function startGame() {
  setScreen('game');
  fit();
  if (app.mode !== 'client') {
    clearInterval(simTimer);
    simTimer = setInterval(() => {
      const now = Date.now();
      app.sim.tick(now);
      pushViews();
      refreshLocal();
      if (app.mode === 'solo') autosave();
    }, 100);
    refreshLocal();
  }
  if (app.mode === 'host') window.addEventListener('beforeunload', e => { if (app.view?.phase !== 'over') { e.preventDefault(); e.returnValue = ''; } });
  requestAnimationFrame(loop);
}

let savedFor = '';
function autosave() {
  const S = app.sim.s;
  if (S.phase === 'over') { store.del(SAVE_KEY); return; }
  if (S.phase !== 'evening') return;
  const key = S.day + ':' + S.fxId + ':' + S.players.me.cash;
  if (key === savedFor) return;
  savedFor = key;
  store.set(SAVE_KEY, JSON.stringify(app.sim.serialize()));
}

let scale = 3;
const SCALE = () => scale;
function fit() {
  const s = scale = Math.max(1, Math.floor(Math.min(innerWidth / W, innerHeight / H)));
  const st = $('#stage');
  st.style.width = W * s + 'px'; st.style.height = H * s + 'px';
  document.documentElement.style.setProperty('--s', s);
}
addEventListener('resize', () => { fit(); drawBackdrop(); });
fit();

/* menu backdrop: a pixel-art starfield with Mars, drawn at game resolution */
function drawBackdrop() {
  const bd = document.getElementById('backdrop');
  if (!bd) return;
  const bw = Math.ceil(innerWidth / scale), bh = Math.ceil(innerHeight / scale);
  bd.width = bw; bd.height = bh;
  const x = bd.getContext('2d');
  const bands = ['#0b0d18', '#0e1020', '#121228', '#161430', '#1a1636'];
  bands.forEach((c, i) => { x.fillStyle = c; x.fillRect(0, Math.floor(i * bh / bands.length), bw, Math.ceil(bh / bands.length)); });
  let seed = 9;
  const r = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < bw * bh / 400; i++) {
    x.fillStyle = ['#ffffff', '#a0d8ff', '#ffd27a', '#6a7090'][(r() * 4) | 0];
    x.fillRect((r() * bw) | 0, (r() * bh) | 0, 1, 1);
  }
  // Mars: dithered sphere with polar cap and craters
  const R = Math.round(Math.min(bw, bh) * 0.22), cx = bw - Math.round(R * 1.15), cy = bh - Math.round(R * 1.2);
  for (let py = -R; py <= R; py++) for (let px = -R; px <= R; px++) {
    const d = px * px + py * py;
    if (d > R * R) continue;
    const lx = (-px - py) / (R * 1.41);           // light from top-left
    const z = Math.sqrt(1 - d / (R * R));
    const lit = lx * 0.6 + z * 0.6;
    const dither = 0;
    const v = lit + dither;
    x.fillStyle = v > 0.95 ? '#ff9a6a' : v > 0.7 ? '#e5704a' : v > 0.4 ? '#c4553a' : v > 0.15 ? '#8e3a2a' : '#54201e';
    if (py < -R * 0.82 && v > 0.3) x.fillStyle = '#f4ece0';
    x.fillRect(cx + px, cy + py, 1, 1);
  }
  for (const [ox, oy, cr] of [[-0.3, 0.1, 0.12], [0.2, -0.3, 0.08], [0.1, 0.35, 0.1], [-0.5, -0.2, 0.06]]) {
    const ccx = cx + Math.round(ox * R), ccy = cy + Math.round(oy * R), rr = Math.max(2, Math.round(cr * R));
    for (let py = -rr; py <= rr; py++) for (let px = -rr; px <= rr; px++) {
      if (px * px + py * py > rr * rr) continue;
      x.fillStyle = (px + py < 0) ? '#6e2a22' : '#a84a34';
      x.fillRect(ccx + px, ccy + py, 1, 1);
    }
  }
}
drawBackdrop();

/* ---------------------------------------------------------- view intake --- */

let prevPhase = null;
function setView(v) {
  if (!v) return;
  const first = !app.view;
  app.view = v; app.viewAt = performance.now();
  if (first) app.lastFx = v.fx.length ? v.fx[v.fx.length - 1].id : 0;
  for (const e of v.fx) if (e.id > app.lastFx) { app.lastFx = e.id; onFx(e); }
  if (v.phase !== prevPhase) onPhase(v.phase, prevPhase);
  prevPhase = v.phase;
  dirtyUI = true;
}
const since = () => performance.now() - app.viewAt;
const remain = ms => Math.max(0, ms - since());

function onPhase(ph, old) {
  if (ph === 'dawn' || ph === 'noon') {
    keeper.x = COUNTER_X; keeper.dir = -1;
    closePanel();
  }
  if (ph === 'evening') {
    showCard('CLOSING TIME', '', 1400);
    setTimeout(() => { if (app.view?.phase === 'evening' && !panel) openPanel('eve'); }, 1300);
  }
  if (ph === 'buy' || ph === 'sell') closePanel();
  if (ph === 'over') {
    clearInterval(simTimer);
    setTimeout(showResults, old ? 900 : 0);
  }
}

function onFx(e) {
  const me = e.pid === app.pid;
  switch (e.type) {
    case 'toast': toast(e.text, e.kind); if (e.kind === 'err') sfx('err'); break;
    case 'buy':
      if (me) { sfx('buy'); burst(CUSTOMER_X + 30, 140, '-' + money(e.price), '#f2c14e'); }
      else { const p = playerById(e.pid); toast(`${p?.name || 'A rival'} bought it for ${money(e.price)}.`, 'bad'); sfx('lose'); }
      break;
    case 'sell':
      if (me) { sfx('sell'); burst(CUSTOMER_X + 30, 140, '+' + money(e.price), '#7bc96f', 14); bumpCash(); }
      else { const p = playerById(e.pid); toast(`${p?.name || 'A rival'} made the sale.`, 'bad'); sfx('lose'); }
      break;
    case 'coins': if (me) { sfx('sell'); burst(keeper.x, 140, '+' + money(e.amt), '#7bc96f', 6); bumpCash(); } break;
    case 'haggle': if (me) { sfx('haggle'); shakeSay(false); } break;
    case 'strike': if (me) { sfx('strike'); shakeSay(true); } break;
    case 'upgrade': if (me) { sfx('upgrade'); flashUpgrade = e.id; } break;
    case 'phase':
      if (e.phase === 'dawn') sfx('day');
      if (e.phase === 'noon') sfx('day');
      break;
  }
}
const playerById = pid => app.view?.players.find(p => p.pid === pid);

/* --------------------------------------------------------------- input --- */

addEventListener('keydown', e => {
  if (document.body.dataset.screen !== 'game') return;
  const typing = e.target.tagName === 'INPUT';
  if (e.key === 'Escape') { if (panel) { closePanel(); e.preventDefault(); } else if (typing) e.target.blur(); return; }
  if (typing) return;
  const k = e.key.toLowerCase();
  if (['arrowleft', 'arrowright', 'a', 'd'].includes(k)) { keys.add(k); e.preventDefault(); }
  if (k === 'e' || k === ' ') { interact(); e.preventDefault(); }
  if (k === 'i') { panel === 'inv' ? closePanel() : openPanel('inv'); }
  if (k === 'm') toggleMute();
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());

function zoneAt(x) {
  for (const [k, z] of Object.entries(ZONES)) if (x >= z.x0 && x <= z.x1) return k;
  return null;
}
function interact() {
  const z = zoneAt(keeper.x);
  if (z === 'shelves') openPanel('inv');
  else if (z === 'office') openPanel('upg');
  else if (z === 'counter') {
    if (app.view?.phase === 'evening') openPanel('eve');
    else { closePanel(); dirtyUI = true; }
  }
}

/* --------------------------------------------------------------- loop --- */

let last = performance.now();
let dirtyUI = true;
function loop(t) {
  const dt = Math.min(0.05, (t - last) / 1000); last = t;
  update(dt, t);
  render(t);
  ui(t);
  if (document.body.dataset.screen === 'game') requestAnimationFrame(loop);
}

function update(dt, t) {
  let mv = 0;
  if (!panel) {
    if (keys.has('a') || keys.has('arrowleft')) mv -= 1;
    if (keys.has('d') || keys.has('arrowright')) mv += 1;
  }
  keeper.moving = mv !== 0;
  if (mv) {
    keeper.dir = mv;
    keeper.x = Math.max(214, Math.min(WORLD_W - 12, keeper.x + mv * 110 * dt));
    keeper.anim += dt;
    keeper.frame = 1 + (Math.floor(keeper.anim / 0.14) % 2);
    if (Math.floor(keeper.anim / 0.28) !== Math.floor((keeper.anim - dt) / 0.28)) sfx('step');
  } else keeper.frame = 0;
  const target = Math.max(0, Math.min(WORLD_W - W, keeper.x - W / 2));
  cam += (target - cam) * Math.min(1, dt * 6);
  syncNpcs();
  for (const n of npcs) {
    const d = n.target - n.x;
    if (Math.abs(d) > 0.5) { n.x += Math.sign(d) * Math.min(Math.abs(d), 150 * dt); n.dir = Math.sign(d); n.anim += dt; n.frame = 1 + (Math.floor(n.anim / 0.14) % 2); }
    else { n.frame = 0; n.dir = n.leaving ? -1 : 1; }
  }
  for (let i = npcs.length - 1; i >= 0; i--) if (npcs[i].leaving && npcs[i].x <= -14) npcs.splice(i, 1);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.t += dt;
    p.x += p.vx * dt; p.y += p.vy * dt; if (!p.text) p.vy += 220 * dt;
    if (p.t > p.life) parts.splice(i, 1);
  }
}

function currentCustomer() {
  const v = app.view;
  if (!v) return null;
  return v.phase === 'buy' ? v.seller : v.phase === 'sell' ? v.buyer : null;
}

function syncNpcs() {
  const c = currentCustomer();
  const active = npcs.find(n => !n.leaving);
  if (c && (!active || active.id !== c.id)) {
    if (active) leave(active);
    npcs.push({ id: c.id, prof: c.prof, look: customerLook(c.prof, c.look), x: -14, target: CUSTOMER_X, dir: 1, frame: 0, anim: 0, leaving: false, carry: null, born: performance.now() });
  } else if (!c && active) leave(active);
  else if (c && active && c.done && !active.doneAt) {
    active.doneAt = performance.now();
    if (c.outcome?.type === 'sold') active.carry = c.outcome.itemId;
    if (c.outcome?.type === 'left' && app.view.phase === 'buy') active.carry = c.itemId;
    active.say = c.outcome?.pid === app.pid || c.outcome?.type === 'left' ? c.outcome?.text : 'Sold to someone else.';
    setTimeout(() => leave(active), 900);
  }
}
function leave(n) { if (!n.leaving) { n.leaving = true; n.target = -20; } }

function burst(x, y, text, col, coins = 8) {
  parts.push({ x, y, vx: 0, vy: -18, t: 0, life: 1.4, text, col });
  for (let i = 0; i < coins; i++) parts.push({ x, y, vx: (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 80, t: 0, life: 0.9, col: '#f2c14e' });
}

/* ------------------------------------------------------------- render --- */

function render(t) {
  const v = app.view;
  const c = Math.round(cam);
  const me = v?.me;
  ctx.clearRect(0, 0, W, H);
  drawScene(ctx, c, { phase: v?.phase, inv: me?.inv || [], up: me?.up, signLevel: me?.up.sign || 0, t });

  ctx.save(); ctx.translate(-c, 0);
  // staff
  const up = me?.up || {};
  if (up.appraise) drawChar(ctx, 'bot', 348, FLOOR, { body: '#c9ced8', eye: '#4fe0d0' }, 0, -1, { monocle: true }, t);
  if (up.haggler) drawChar(ctx, 'person', 262, FLOOR - 2, STAFF.haggler, 0, -1, { tie: '#d6453d' });
  if (up.sales) drawChar(ctx, 'person', 500, FLOOR, STAFF.sales, 0, Math.floor(t / 2400) % 2 ? 1 : -1, { badge: true });
  if (up.restore) drawChar(ctx, 'person', 732, FLOOR, STAFF.restore, 0, 1, { apron: '#6b3d22', glasses: true });
  if (up.security >= 3) drawChar(ctx, 'bot', 220, FLOOR, { body: '#3f5a8a', eye: '#ff4a5a', light: '#ff4a5a' }, 0, 1, { badge: true }, t);
  // customers
  for (const n of npcs) drawCustomer(n, t);
  // keeper
  drawChar(ctx, 'person', keeper.x, FLOOR, KEEPER(me?.color), keeper.frame, keeper.dir, { apron: '#efe0b8' });
  ctx.restore();

  // counter (in front of keeper)
  const cust = currentCustomer();
  const npc = npcs.find(n => !n.leaving);
  const atCounter = npc && Math.abs(npc.x - CUSTOMER_X) < 2;
  const counterItem = v?.phase === 'buy' && cust && !cust.done && atCounter ? cust.itemId : null;
  drawCounterFront(ctx, c, { counterItem, registerText: me ? String(Math.max(0, me.cash)).slice(-4) : '' });

  // bubbles
  ctx.save(); ctx.translate(-c, 0);
  if (npc && atCounter && cust && !cust.done) {
    const msg = cust.st.msg || (v.phase === 'buy' ? say(cust.prof, 'ask', { p: cust.ask }, seedOf(cust.id)) : say(cust.prof, 'want', { c: cust.cat === 'any' ? 'good stuff' : cust.cat }, seedOf(cust.id)));
    bubble(ctx, npc.x, FLOOR - 40, msg);
  }
  for (const n of npcs) if (n.leaving && n.say && n.x > 120) bubble(ctx, n.x, FLOOR - 40, n.say);
  ctx.restore();

  drawNight(ctx, v?.phase);

  // particles
  ctx.save(); ctx.translate(-c, 0);
  for (const p of parts) {
    if (p.text) pixelTextOutlined(ctx, p.text, Math.round(p.x - textW(p.text) / 2), Math.round(p.y), p.col);
    else { ctx.fillStyle = '#211a2b'; ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 4, 4); ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); }
  }
  // zone label above keeper
  const z = zoneAt(keeper.x);
  if (z && !panel && !(z === 'counter' && cust && !cust.done)) {
    const label = `E: ${ZONES[z].label}`;
    pixelTextOutlined(ctx, label, Math.round(keeper.x - textW(label) / 2), FLOOR - 46, '#f2c14e');
  }
  ctx.restore();

  // off-screen customer arrow
  if (cust && !cust.done && z !== 'counter') {
    const sx = CUSTOMER_X - c;
    if (sx < 0 || sx > W) { pixelTextOutlined(ctx, '< CUSTOMER', 6, 120, '#f2c14e'); }
  }
}

const STAFF = {
  appraise: { skin: '#f1c9a5', hair: '#d9d4cc', shirt: '#e8e2d4', pants: '#3b3646', style: 2 },
  haggler: { skin: '#c68456', hair: '#2b1d16', shirt: '#555064', pants: '#2d3a5c', style: 0 },
  sales: { skin: '#e0a77c', hair: '#a8643a', shirt: '#2fb5b0', pants: '#3b3646', style: 1 },
  restore: { skin: '#8d5a3b', hair: '#1d1d2a', shirt: '#7f8a3a', pants: '#5a4632', style: 3 },
  guard: { skin: '#f6d7c0', hair: '#5a3a22', shirt: '#2d4a8a', pants: '#2d3a5c', style: 0 },
};
const KEEPER = col => ({ skin: '#e0a77c', hair: '#3a2416', shirt: col || '#e8554e', pants: '#3a3d46', style: 0 });

/* customer appearance by profile */
function customerLook(prof, seed) {
  const L = lookFromSeed(seed);
  const pick = arr => arr[Math.abs(seed) % arr.length];
  switch (PROFILES[prof]?.kind) {
    case 'miner': return { ...L, hat: '#f2c14e', shirt: '#ec8a2f', pants: '#4a4d58' };
    case 'tourist': return { ...L, shirt: pick(['#ff6fa8', '#4fe0d0', '#f5d94a', '#8cf06e']), hat: pick(['#f4efe6', null]), glasses: true };
    case 'collector': return { ...L, hair: '#d9d4cc', shirt: '#6b3d22', pants: '#3b3646', style: 2, monocle: true };
    case 'smuggler': return { ...L, shirt: '#2a2a3a', pants: '#1d1d2a', hat: '#3a3646', glasses: true };
    case 'astro': return { suit: pick(['#e8ecf2', '#d8dde6']), accent: pick(['#ec8a2f', '#3f7fd6', '#d6453d']), visor: pick(['#2a4a8a', '#3a2a6a']) };
    case 'prospector': return { suit: pick(['#ec8a2f', '#c9a26b']), accent: '#f2c14e', visor: '#b8892a' };
    case 'grey': return { skin: pick(['#b8c4c0', '#a8b8c8', '#c4c0b8']), robe: pick(['#6a4ab0', '#2f5fe0', '#2fb5b0']) };
    case 'glorp': return { body: pick(['#7bd85a', '#ff6fa8', '#4fe0d0', '#f5d94a']), seed: seed % 100 };
    case 'zix': return { shell: pick(['#7d4fc9', '#2f8a8a', '#b8732a']), accent: pick(['#4fe0d0', '#f5d94a', '#ff6fa8']) };
    default: return { ...L, shirt: pick(['#3f7fd6', '#2fb5b0', '#8c56c9', '#d6453d', '#555064', '#e8e2d4']) };
  }
}
function drawCustomer(n, t) {
  const extra = { carry: n.leaving ? n.carry : null };
  switch (PROFILES[n.prof]?.kind) {
    case 'astro': case 'prospector': return drawChar(ctx, 'astro', n.x, FLOOR, n.look, n.frame, n.dir, extra);
    case 'grey': return drawChar(ctx, 'grey', n.x, FLOOR, n.look, n.frame, n.dir, extra);
    case 'glorp': return drawChar(ctx, 'glorp', n.x, FLOOR, n.look, n.frame, n.dir, extra, t);
    case 'zix': return drawChar(ctx, 'zix', n.x, FLOOR, n.look, n.frame, n.dir, extra, t);
    default: return drawChar(ctx, 'person', n.x, FLOOR, n.look, n.frame, n.dir, { ...extra, monocle: !!n.look.monocle, glasses: !!n.look.glasses });
  }
}
function whoHtml(c) {
  const P = PROFILES[c.prof];
  if (!P) return '';
  return `<div class="who"><span class="who-name">${esc(P.name)}</span><span class="who-tell">${esc(P.tell)}</span></div>`;
}
const EVENT_FLAVOR = {
  hot: ['A cruise liner just docked. {c} are in demand.', 'Collectors are in town. {c} are hot this sol.', 'The colony newsfeed is hyping {c}.'],
  cold: ['A cargo hauler flooded the market. {c} are in a slump.', 'Nobody wants {c} this sol.', 'Dust storm warnings. {c} are cheap today.'],
};
function eventLine(e, day) {
  if (!e) return 'Sellers are lining up at the airlock';
  const arr = EVENT_FLAVOR[e.mod > 1 ? 'hot' : 'cold'];
  return arr[day % arr.length].replace('{c}', e.cat);
}

/* ---------------------------------------------------------------- HUD/UI --- */

let flashUpgrade = null;
let lastUiT = 0;
function ui(t) {
  const v = app.view;
  if (!v) return;
  // timers every frame
  const ph = v.phase;
  const cust = currentCustomer();
  const tb = document.querySelector('#deal .timer');
  if (tb && cust) {
    const total = 16000;
    const left = remain(cust.left);
    const open = remain(cust.openIn);
    const pct = open > 0 ? 100 : Math.min(100, (left / total) * 100);
    tb.firstElementChild.style.width = pct + '%';
    tb.classList.toggle('low', left < 4000 && open <= 0);
    const ex = document.querySelector('#deal .excl');
    if (ex) { const e = remain(cust.excl); ex.textContent = e > 0 ? `${cust.forName} gets first dibs: ${Math.ceil(e / 1000)}s` : ''; }
  }
  if (t - lastUiT < 100 && !dirtyUI) return;
  lastUiT = t;

  const phaseNames = { dawn: 'MORNING', buy: 'BUYING', noon: 'MIDDAY', sell: 'SELLING', evening: 'EVENING', over: 'CLOSED' };
  $('#hud-day').textContent = v.maxDays ? `SOL ${v.day}/${v.maxDays}` : `SOL ${v.day}`;
  let phTxt = phaseNames[ph] || '';
  if (ph === 'evening' && v.left) phTxt += ` ${Math.ceil(remain(v.left) / 1000)}s`;
  $('#hud-phase').textContent = phTxt;
  $('#hud-queue').textContent = (ph === 'buy' || ph === 'sell') ? `${v.queue} IN LINE` : '';
  const cashEl = $('#hud-cash');
  cashEl.textContent = money(v.me.cash);
  cashEl.style.color = v.me.cash < 0 ? 'var(--red)' : '';
  $('#hud-inv').textContent = `BAG ${v.me.inv.length}/${v.me.cap}`;
  $('#hud-mute').innerHTML = isMuted() ? SVG_MUTE : SVG_SOUND;

  // event banner
  const eb = $('#event-banner');
  if (v.event && ph !== 'over') {
    const hot = v.event.mod > 1;
    eb.innerHTML = `<span class="${hot ? 'hot' : 'cold'}">${esc(v.event.cat)} ${hot ? 'in demand' : 'slump'}</span> this sol`;
  } else eb.innerHTML = '';

  // rivals
  const rv = $('#rivals');
  if (v.players.length > 1) {
    rv.innerHTML = v.players.map(p => `<div class="rival ${p.connected ? '' : 'off'}"><span class="sw" style="background:${p.color}"></span>${esc(p.name)}${p.pid === app.pid ? ' (you)' : ''} ${money(p.cash)} &middot; ${p.n} items${ph === 'evening' && p.ready ? ' <span class="rd">READY</span>' : ''}${p.bankrupt ? ' <span class="rd" style="color:var(--red)">BROKE</span>' : ''}</div>`).join('');
  } else rv.innerHTML = '';

  // log
  const logHtml = v.players.length > 1 ? v.log.slice(-4).map(l => `<div>${esc(l)}</div>`).join('') : '';
  if ($('#log').dataset.k !== logHtml) { $('#log').innerHTML = logHtml; $('#log').dataset.k = logHtml; }

  // phase card
  if (ph === 'dawn') {
    showCard(`SOL ${v.day}`, eventLine(v.event, v.day));
  } else if (ph === 'noon') showCard('AFTERNOON', 'Buyers are cycling through the airlock');
  else if (cardUntil && performance.now() > cardUntil) hideCard();
  else if (!cardUntil && !$('#card').hidden) hideCard();

  // prompt
  const z = zoneAt(keeper.x);
  let prompt = '';
  if (cust && !cust.done && z !== 'counter') prompt = 'Customer at the counter';
  if (ph === 'evening' && !panel) prompt = 'Office board: upgrades. Counter: day summary.';
  $('#prompt').textContent = prompt;

  renderDeal();
  if (panel === 'eve') renderEvening();
  if (panel === 'inv') renderInv();
  if (panel === 'upg') renderUpg();
  dirtyUI = false;
}

function bumpCash() {
  const el = $('#hud-cash'); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
}

/* ---------------------------------------------------------------- card --- */
let cardUntil = 0, cardKey = '';
function showCard(title, sub, ms) {
  const k = title + '|' + sub;
  if (k !== cardKey) {
    cardKey = k;
    $('#card-title').textContent = title;
    $('#card-sub').textContent = sub;
    const c = $('#card'); c.hidden = true; void c.offsetWidth; c.hidden = false;
    // restart animations
    for (const el of [$('#card-title'), $('#card-sub')]) { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; }
  }
  cardUntil = ms ? performance.now() + ms : 0;
}
function hideCard() { $('#card').hidden = true; cardKey = ''; cardUntil = 0; }

/* -------------------------------------------------------------- toasts --- */
function toast(text, kind = 'info') {
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = text;
  const box = $('#toasts');
  box.appendChild(el);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, 2600);
}
function shakeSay(bad) {
  const s = document.querySelector('#deal .say');
  if (!s) return;
  s.classList.remove('shake'); void s.offsetWidth; if (bad) s.classList.add('shake');
}

/* -------------------------------------------------------------- panels --- */
function openPanel(name) {
  closePanel();
  panel = name;
  dirtyUI = true;
  sfx('open');
  const el = { inv: '#invp', upg: '#upg', eve: '#eve' }[name];
  $(el).hidden = false;
  if (name === 'inv') renderInv(true);
  if (name === 'upg') renderUpg(true);
  if (name === 'eve') { eveKey = ''; renderEvening(); }
}
function closePanel() {
  for (const s of ['#invp', '#upg', '#eve']) $(s).hidden = true;
  panel = null;
}

function tierTag(t) { return t < 0 ? '<span class="tier" style="color:var(--dim)">UNKNOWN</span>' : `<span class="tier" style="color:${TIERS[t].col}">${TIERS[t].n.toUpperCase()}</span>`; }
function estTxt(e) { return `${money(e.lo)} - ${money(e.hi)}`; }
const closeBtn = '<button class="btn small close-x" data-close aria-label="Close">X</button>';

/* deal panel (buy/sell at counter) */
let dealKey = '', dealStruct = '';
let offerVal = {};      // customer id -> offer string
let pickUid = {};       // buyer id -> selected uid
function renderDeal() {
  const v = app.view;
  const el = $('#deal');
  const c = currentCustomer();
  const show = c && !c.done && zoneAt(keeper.x) === 'counter' && !panel && remain(c.openIn) <= 0;
  if (!show) { if (!el.hidden) { el.hidden = true; dealKey = ''; dealStruct = ''; } return; }
  const key = JSON.stringify([c.id, c.ask, c.st, c.feed, c.eligible, v.me.cash, v.me.inv.length, pickUid[c.id], c.hint]);
  if (key === dealKey && !el.hidden) return;
  const struct = JSON.stringify([c.id, v.phase, c.eligible, pickUid[c.id]]);
  const html = v.phase === 'buy' ? buyHtml(v, c) : sellHtml(v, c);
  dealKey = key;
  el.hidden = false;
  if (struct === dealStruct) {
    // Patch dynamic parts in place so buttons under the cursor are never replaced mid-click.
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    tmp.querySelectorAll('[data-p]').forEach(n => {
      const live = el.querySelector(`[data-p="${n.dataset.p}"]`);
      if (!live) return;
      if (n.tagName === 'BUTTON') {
        live.disabled = n.disabled; live.hidden = n.hidden;
        if (live.textContent !== n.textContent) live.textContent = n.textContent;
      } else if (live.innerHTML !== n.innerHTML) {
        live.innerHTML = n.innerHTML;
        if (n.dataset.p === 'ask') { live.classList.remove('drop'); void live.offsetWidth; live.classList.add('drop'); }
      }
    });
    return;
  }
  dealStruct = struct;
  el.innerHTML = html;
  wireDeal(v, c);
}

function strikesHtml(n, max = 3) {
  let s = '<div class="strikes" data-p="strikes"><span>Patience</span>';
  for (let i = 0; i < max; i++) s += `<i class="${i < max - n ? 'on' : ''}"></i>`;
  return s + '</div>';
}

function buyHtml(v, c) {
  const it = ITEMS[c.itemId];
  const e = c.est;
  const full = v.me.inv.length >= v.me.cap;
  const def = offerVal[c.id] ?? String(Math.max(1, Math.round(Math.min(c.ask * 0.6, (e.lo + e.hi) / 2 * 0.55))));
  offerVal[c.id] = def;
  const lim = c.lim;
  return `
    ${whoHtml(c)}
    <div class="item-head"><img class="icon" src="${itemIcon(c.itemId, SCALE())}" alt="">
      <div><div class="item-name">${esc(it.n)}</div>
      <div class="meta">${it.cat} &middot; ${COND[c.cond].n} &middot; ${tierTag(e.tier)}</div></div></div>
    <div class="kv"><span>Appraisal</span><b>${estTxt(e)}</b></div>
    ${e.fake ? '<div class="fake">APPRAISER: LIKELY A FAKE</div>' : ''}
    <div class="hint" data-p="hint">${esc(c.hint || '')}</div>
    <div class="kv"><span>Asking</span><span class="big-ask" data-p="ask">${money(c.ask)}</span></div>
    <div class="timer"><i></i></div>
    <div class="excl"></div>
    <div class="say" data-p="say">${esc(c.st.msg || '')}</div>
    ${strikesHtml(c.st.strikes, lim)}
    <div class="offer-row">
      <button class="btn small" data-step="-1">-</button>
      <input id="offer-in" class="field" type="number" min="1" value="${esc(def)}" aria-label="Your offer">
      <button class="btn small" data-step="1">+</button>
    </div>
    <div class="quick">
      <button class="btn" data-pct="0.5">50%</button><button class="btn" data-pct="0.7">70%</button><button class="btn" data-pct="0.85">85%</button>
    </div>
    <div class="row">
      <button class="btn primary" id="offer-btn" data-p="offer" ${c.st.out || full ? 'disabled' : ''}>Offer</button>
      <button class="btn good" id="take-btn" data-p="take" ${c.st.out || full || c.ask > v.me.cash ? 'disabled' : ''}>Pay ${money(c.ask)}</button>
      <button class="btn bad" id="pass-btn" data-p="pass" ${c.st.out ? 'disabled' : ''}>Pass</button>
    </div>
    <div class="hint" style="color:var(--red)" data-p="full">${full ? 'Storage full.' : ''}</div>
    <div class="feed" data-p="feed">${c.feed.map(esc).join('<br>')}</div>`;
}

function sellHtml(v, c) {
  const el = v.me.inv.filter(i => c.eligible.includes(i.uid));
  if (!el.find(i => i.uid === pickUid[c.id])) pickUid[c.id] = el[0]?.uid;
  const sel = el.find(i => i.uid === pickUid[c.id]);
  const def = offerVal[c.id + sel?.uid] ?? (sel ? String(Math.round(((sel.est.lo + sel.est.hi) / 2) * 1.15)) : '');
  if (sel) offerVal[c.id + sel.uid] = def;
  const ct = c.st.counter;
  const ctItem = ct && v.me.inv.find(i => i.uid === ct.uid);
  return `
    ${whoHtml(c)}
    <div class="lbl">Wants</div>
    <div class="item-name" style="color:var(--gold)">${c.cat === 'any' ? 'Anything good' : esc(c.cat)}</div>
    <div class="hint" data-p="hint">${esc(c.hint || '')}</div>
    <div class="timer"><i></i></div>
    <div class="excl"></div>
    <div class="say" data-p="say">${esc(c.st.msg || '')}</div>
    ${strikesHtml(c.st.strikes, c.lim)}
    ${el.length ? `<div class="pick-list">${el.map(i => `
      <button class="pick ${i.uid === pickUid[c.id] ? 'on' : ''}" data-uid="${i.uid}">
        <img class="icon sm" src="${itemIcon(i.id, SCALE())}" alt="">
        <span class="pick-txt"><span class="nm">${esc(ITEMS[i.id].n)}</span><span>${COND[i.cond].n} &middot; paid ${money(i.paid)} &middot; est ${estTxt(i.est)}${i.est.fake ? ' <span class="fake">FAKE?</span>' : ''}</span></span>
      </button>`).join('')}</div>
      <div class="offer-row">
        <button class="btn small" data-step="-1">-</button>
        <input id="price-in" class="field" type="number" min="1" value="${esc(def)}" aria-label="Your price">
        <button class="btn small" data-step="1">+</button>
      </div>
      <div class="row">
        <button class="btn primary" id="pitch-btn" data-p="pitch" ${c.st.out ? 'disabled' : ''}>Pitch</button>
        <button class="btn good" id="counter-btn" data-p="counter" ${ctItem && !c.st.out ? '' : 'hidden'}>Take ${ct ? money(ct.price) : ''}</button>
        <button class="btn bad" id="pass-btn" data-p="pass" ${c.st.out ? 'disabled' : ''}>Pass</button>
      </div>`
    : `<div class="empty">You have nothing they want.</div><div class="row"><button class="btn bad" id="pass-btn" data-p="pass" ${c.st.out ? 'disabled' : ''}>Pass</button></div>`}
    <div class="feed" data-p="feed">${c.feed.map(esc).join('<br>')}</div>`;
}

function wireDeal(v, c) {
  const el = $('#deal');
  const inp = el.querySelector('#offer-in') || el.querySelector('#price-in');
  const isBuy = v.phase === 'buy';
  const k = () => (isBuy ? c.id : c.id + pickUid[c.id]);
  const stepSize = n => (n < 50 ? 1 : n < 200 ? 5 : n < 2000 ? 10 : 50);
  if (inp) {
    inp.addEventListener('input', () => (offerVal[k()] = inp.value));
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); (el.querySelector('#offer-btn') || el.querySelector('#pitch-btn'))?.click(); } });
  }
  el.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => {
    const n = Math.max(1, (+inp.value || 0) + +b.dataset.step * stepSize(+inp.value || 0));
    inp.value = n; offerVal[k()] = String(n); sfx('tick');
  }));
  el.querySelectorAll('[data-pct]').forEach(b => b.addEventListener('click', () => {
    const n = Math.max(1, Math.round(c.ask * +b.dataset.pct));
    inp.value = n; offerVal[k()] = String(n); sfx('tick');
  }));
  el.querySelector('#offer-btn')?.addEventListener('click', () => act({ type: 'offer', amt: +inp.value }));
  el.querySelector('#take-btn')?.addEventListener('click', () => act({ type: 'take' }));
  el.querySelector('#pass-btn')?.addEventListener('click', () => { sfx('click'); act({ type: 'pass' }); });
  el.querySelector('#pitch-btn')?.addEventListener('click', () => act({ type: 'pitch', uid: pickUid[c.id], price: +inp.value }));
  el.querySelector('#counter-btn')?.addEventListener('click', () => act({ type: 'takeCounter' }));
  el.querySelectorAll('.pick').forEach(b => b.addEventListener('click', () => { pickUid[c.id] = b.dataset.uid; sfx('tick'); dealKey = ''; renderDeal(); }));
}

/* inventory */
let invKey = '';
function renderInv(force) {
  const v = app.view, el = $('#invp');
  const inv = v.me.inv;
  const key = JSON.stringify([inv, v.me.cap, v.phase]);
  if (key === invKey && !force) return;
  invKey = key;
  el.innerHTML = `${closeBtn}<h2>Inventory ${inv.length}/${v.me.cap}</h2>
    ${inv.length ? `<div class="inv-grid">${inv.map((i, n) => `
      <div class="inv-card" style="--i:${n}">
        <img class="icon sm" src="${itemIcon(i.id, SCALE())}" alt="">
        <div><div class="nm">${esc(ITEMS[i.id].n)}</div>
        <div class="meta">${COND[i.cond].n} &middot; ${tierTag(i.est.tier)}</div>
        <div class="meta">Paid ${money(i.paid)} &middot; est ${estTxt(i.est)}</div>
        ${i.est.fake ? '<div class="fake">LIKELY FAKE</div>' : ''}</div>
        <button class="btn" data-dump="${i.uid}">Dump to wholesaler</button>
      </div>`).join('')}</div>` : '<div class="empty">Nothing on the shelves.</div>'}`;
  el.querySelector('[data-close]').addEventListener('click', closePanel);
  el.querySelectorAll('[data-dump]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.confirm) { act({ type: 'dump', uid: b.dataset.dump }); }
    else { b.dataset.confirm = '1'; b.textContent = 'Click again to dump'; b.classList.add('bad'); }
  }));
}

/* upgrades */
let upgKey = '';
function renderUpg(force) {
  const v = app.view, el = $('#upg');
  const eve = v.phase === 'evening';
  const key = JSON.stringify([v.me.up, v.me.cash, v.phase]);
  if (key === upgKey && !force) return;
  upgKey = key;
  el.innerHTML = `${closeBtn}<h2>Upgrades</h2>
    <div class="kv"><span>Cash</span><b>${money(v.me.cash)}</b></div>
    ${eve ? '' : '<div class="hint">Upgrades can be bought in the evening.</div>'}
    <div class="upg-list">${UPGRADES.map(u => {
      const lvl = v.me.up[u.id], max = u.cost.length, cost = u.cost[lvl];
      const pips = Array.from({ length: max }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('');
      return `<div class="upg">
        <div class="nm">${u.name} <span class="pips ${flashUpgrade === u.id ? 'flash' : ''}">${pips}</span>${u.staff ? `<span class="staff">STAFF ${money(u.wage)}/SOL</span>` : ''}</div>
        <div class="ds">${esc(u.desc)}</div>
        <button class="btn ${lvl < max ? 'primary' : ''}" data-up="${u.id}" ${!eve || lvl >= max || cost > v.me.cash ? 'disabled' : ''}>${lvl >= max ? 'MAX' : money(cost)}</button>
      </div>`;
    }).join('')}</div>`;
  flashUpgrade = null;
  el.querySelector('[data-close]').addEventListener('click', closePanel);
  el.querySelectorAll('[data-up]').forEach(b => b.addEventListener('click', () => act({ type: 'upgrade', id: b.dataset.up })));
}

/* evening summary */
let eveKey = '';
function renderEvening() {
  const v = app.view, el = $('#eve');
  if (v.phase !== 'evening') { closePanel(); return; }
  const s = v.me.summary;
  const readyN = v.players.filter(p => p.ready && p.connected).length;
  const liveN = v.players.filter(p => p.connected && !p.bankrupt).length;
  const solo = v.players.length === 1;
  const key = JSON.stringify([s, v.me.cash, v.me.ready, readyN, Math.ceil(remain(v.left) / 1000)]);
  if (key === eveKey) return;
  eveKey = key;
  if (!s) { el.innerHTML = ''; return; }
  const line = (l, r, cls = '') => `<div class="line"><span>${l}</span><span class="${cls}">${r}</span></div>`;
  const net = v.me.cash - s.startCash;
  el.innerHTML = `${closeBtn}<h2>Sol ${v.day} books</h2>
    <div class="sum-grid">
      <div class="col"><h3>BOUGHT</h3>${s.bought.length ? s.bought.map(b => line(esc(ITEMS[b.id].n), money(b.price))).join('') : '<div class="meta">Nothing</div>'}</div>
      <div class="col"><h3>SOLD</h3>${s.sold.length ? s.sold.map(b => line(esc(ITEMS[b.id].n), `${money(b.price)} (${b.price - b.paid >= 0 ? '+' : ''}${money(b.price - b.paid)})`, b.price >= b.paid ? 'p' : 'n')).join('') : '<div class="meta">Nothing</div>'}
      ${s.dumped.length ? '<h3>DUMPED</h3>' + s.dumped.map(b => line(esc(ITEMS[b.id].n), money(b.price), b.price >= b.paid ? 'p' : 'n')).join('') : ''}</div>
    </div>
    <h3>OVERNIGHT</h3>
    ${line('Rent', '-' + money(s.rent), 'n')}
    ${s.wages ? line('Staff wages', '-' + money(s.wages), 'n') : ''}
    ${s.restored.map(r => line(`Restored ${esc(ITEMS[r.id].n)}`, `now ${COND[r.cond].n}`, 'p')).join('')}
    ${s.stolen != null ? line(`Stolen: ${esc(ITEMS[s.stolen].n)}`, 'gone', 'n') : ''}
    ${s.forced.map(f => line(`Sold off to pay bills: ${esc(ITEMS[f.id].n)}`, money(f.price), 'n')).join('')}
    <div class="total"><span>CASH ${money(v.me.cash)}</span><span style="color:${net >= 0 ? 'var(--green)' : 'var(--red)'}">${net >= 0 ? '+' : ''}${money(net)} TODAY</span></div>
    ${v.me.bankrupt ? '<div class="hint" style="color:var(--red)">You went bankrupt.</div>' : ''}
    <div class="row">
      <button class="btn" id="eve-upg">Upgrades</button>
      <button class="btn" id="eve-inv">Inventory</button>
      <button class="btn primary" id="eve-go" ${v.me.bankrupt ? 'disabled' : ''}>${solo ? (v.maxDays && v.day >= v.maxDays ? 'Final tally' : 'Open shop') : v.me.ready ? `Waiting ${readyN}/${liveN}` : `Ready (${Math.ceil(remain(v.left) / 1000)}s)`}</button>
    </div>`;
  el.querySelector('[data-close]').addEventListener('click', closePanel);
  $('#eve-upg').addEventListener('click', () => openPanel('upg'));
  $('#eve-inv').addEventListener('click', () => openPanel('inv'));
  $('#eve-go').addEventListener('click', () => { sfx('click'); act({ type: 'ready', v: !v.me.ready }); });
}

/* results */
function showResults() {
  const v = app.view;
  setScreen('over');
  const r = v.results || [];
  $('#over-title').textContent = r.length > 1 ? `${r[0].name} wins` : r[0]?.bankrupt ? 'Bankrupt' : 'Closing time';
  $('#results').innerHTML = r.map((p, i) => {
    const bf = p.stats.bestFlip;
    return `<li style="--i:${i}"><span class="rk">#${i + 1}</span>
      <span class="nm" style="color:${p.color}">${esc(p.name)}${p.bankrupt ? ' (bankrupt)' : ''}</span>
      <span class="wv">${money(p.worth)}</span>
      <span class="dt">Cash ${money(p.cash)} + ${p.items} items worth ${money(p.invVal)} &middot; ${p.stats.bought} bought, ${p.stats.sold} sold${bf ? ` &middot; best flip: ${esc(ITEMS[bf.id].n)} ${bf.profit >= 0 ? '+' : ''}${money(bf.profit)}` : ''}</span></li>`;
  }).join('');
  sfx('day');
}

/* --------------------------------------------------------------- sound --- */
const SVG_SOUND = '<svg viewBox="0 0 7 7" shape-rendering="crispEdges"><path fill="#efe0b8" d="M0 2h2v3H0zM2 1h1v5H2zM3 0h1v7H3zM5 2h1v3H5z"/></svg>';
const SVG_MUTE = '<svg viewBox="0 0 7 7" shape-rendering="crispEdges"><path fill="#a99cc0" d="M0 2h2v3H0zM2 1h1v5H2zM3 0h1v7H3z"/><path fill="#e8554e" d="M5 2h1v1H5zM6 3h1v1H6zM5 4h1v1H5z"/></svg>';
function toggleMute() { setMuted(!isMuted()); dirtyUI = true; }
$('#hud-mute').addEventListener('click', toggleMute);
