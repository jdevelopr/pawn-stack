/**
 * main.js — entry point. Screens, solo/host/join wiring, render loop, input, panels.
 *
 * Roles:
 *   solo   — Sim runs here; one local player.
 *   host   — Sim runs here; host plays locally and relays views to joiners.
 *   client — no Sim; sends actions, renders views the host sends back.
 */
import { Sim, UPGRADES, COND, capOf, INSURANCE } from './sim.js';
import { ITEMS, TIERS, itemIcon } from './items.js';
import { createHost, createClient, clientId, joinUrl, roomFromUrl } from './net.js';
import {
  W, H, PX, WORLD_W, FLOOR, ZONES, COUNTER_X, CUSTOMER_X,
  drawScene, drawCounterFront, drawPerson, drawNight, lookFromSeed, bubble, pixelTextOutlined, textW,
  drawChar, SHELF_SLOTS,
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
app.aiN = Math.max(0, Math.min(3, +(store.get('pawn-ai') || 0)));
for (const b of document.querySelectorAll('#ai-seg button')) {
  b.classList.toggle('on', +b.dataset.ai === app.aiN);
  b.addEventListener('click', () => {
    document.querySelectorAll('#ai-seg button').forEach(x => x.classList.toggle('on', x === b));
    app.aiN = +b.dataset.ai; store.set('pawn-ai', String(app.aiN));
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
  for (let i = 0; i < app.aiN; i++) app.sim.addAI(i);
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
const shoppers = []; // walk-in browsers heading to the shelves
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
  // the canvas is 768x432 (2x art); scale it by a whole number only, so pixels stay even
  const s = scale = Math.max(1, Math.floor(Math.min(innerWidth / (W * PX), innerHeight / (H * PX))));
  const st = $('#stage');
  st.style.width = W * PX * s + 'px'; st.style.height = H * PX * s + 'px';
  // Scale the in-game UI with the game so it covers the same share of the screen as it did
  // before the art resolution doubled: compare against the old 384x216 canvas's whole-number fit.
  // 0.8 on a 768-wide game, 0.9 at 1536 and above. Panels also shrink to fit (see fitPanels).
  const z = Math.max(0.8, Math.min(0.9, (W * PX * s) / 1536 * 0.9));
  const ui = $('#ui');
  if (ui) {
    ui.style.zoom = z;
    ui.style.width = (W * PX * s) / z + 'px'; ui.style.height = (H * PX * s) / z + 'px';
  }
  fitPanels();
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
    if (d > R * R - R * 0.6) continue;   // trims single-pixel spikes at the poles
    const lx = (-px - py) / (R * 1.41);           // light from top-left
    const z = Math.sqrt(1 - d / (R * R));
    const lit = lx * 0.6 + z * 0.6;
    const dither = 0;
    const v = lit + dither;
    x.fillStyle = v > 0.95 ? '#ff9a6a' : v > 0.7 ? '#e5704a' : v > 0.4 ? '#c4553a' : v > 0.15 ? '#8e3a2a' : '#54201e';
    x.fillRect(cx + px, cy + py, 1, 1);
  }
  for (const [ox, oy, cr] of [[-0.3, 0.1, 0.12], [0.2, -0.3, 0.08], [0.1, 0.35, 0.1], [-0.5, -0.2, 0.06]]) {
    const ccx = cx + Math.round(ox * R), ccy = cy + Math.round(oy * R), rr = Math.max(2, Math.round(cr * R));
    for (let py = -rr; py <= rr; py++) for (let px = -rr; px <= rr; px++) {
      if (px * px + py * py > rr * rr - rr * 0.6) continue;
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
    setTimeout(() => { if (app.view?.phase === 'evening' && !panel) openPanel(guildPending() ? 'guild' : 'eve'); }, 1300);
  }
  if (ph === 'noon') setTimeout(() => { if (app.view?.phase === 'noon') openPanel('price'); }, 300);
  if (ph === 'sell' && old === 'noon') showCard('AFTERNOON', 'Doors open: buyers and walk-in shoppers', 1600);
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
      else { const p = playerById(e.pid); toast(`${p?.name || 'A rival'} closed the deal for ${money(e.price)}.`, 'bad'); sfx('lose'); }
      break;
    case 'sell':
      if (me) { sfx('sell'); burst(CUSTOMER_X + 30, 140, '+' + money(e.price), '#7bc96f', 14); bumpCash(); }
      else { const p = playerById(e.pid); toast(`${p?.name || 'A rival'} made the sale.`, 'bad'); sfx('lose'); }
      break;
    case 'walkin':
      if (me) {
        const sl = SHELF_SLOTS[e.slot] || SHELF_SLOTS[0];
        const sx = (sl[0] + 14) / PX;
        sfx('sell'); burst(sx, (sl[1] - 6) / PX, '+' + money(e.price), '#7bc96f', 8); bumpCash();
        toast(`Walk-in bought ${ITEMS[e.itemId].n} for ${money(e.price)}.`, 'good');
        shoppers.push({ look: lookFromSeed((Math.random() * 1e9) | 0), x: -14, target: sx, dir: 1, frame: 0, anim: 0, wait: 0.9, carry: e.itemId, out: false });
      }
      break;
    case 'coins': if (me) { sfx('sell'); burst(keeper.x, 140, '+' + money(e.amt), '#7bc96f', 6); bumpCash(); } break;
    case 'haggle': if (me) { sfx('haggle'); shakeSay(false); } break;
    case 'strike': if (me) { sfx('strike'); shakeSay(true); } break;
    case 'upgrade': if (me) { sfx('upgrade'); flashUpgrade = e.id; } break;
    case 'guild': sfx('open'); break;
    case 'guildReveal':
      sfx('day');
      guildKey = '';
      if (app.view?.phase === 'evening' && panel !== 'guild') setTimeout(() => openPanel('guild'), 0);
      break;
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
  if (z === 'shelves') openPanel(app.view?.phase === 'noon' ? 'price' : 'inv');
  else if (z === 'office') openPanel('upg');
  else if (z === 'counter') {
    if (app.view?.phase === 'evening') openPanel(guildPending() ? 'guild' : 'eve');
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

function updateShoppers(dt) {
  for (const n of shoppers) {
    const d = n.target - n.x;
    if (Math.abs(d) > 0.5) { n.x += Math.sign(d) * Math.min(Math.abs(d), 170 * dt); n.dir = Math.sign(d); n.anim += dt; n.frame = 1 + (Math.floor(n.anim / 0.14) % 2); }
    else { n.frame = 0; if (!n.out && (n.wait -= dt) <= 0) { n.out = true; n.target = -20; } }
  }
  for (let i = shoppers.length - 1; i >= 0; i--) if (shoppers[i].out && shoppers[i].x <= -14) shoppers.splice(i, 1);
}

function update(dt, t) {
  updateShoppers(dt);
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
  const c = Math.round(cam * PX);          // camera in fine (2x) pixels
  const me = v?.me;
  ctx.clearRect(0, 0, W * PX, H * PX);
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
  for (const n of shoppers) drawChar(ctx, 'person', n.x, FLOOR, n.look, n.frame, n.dir, { carry: n.out ? n.carry : null });
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
    const msg = cust.st.msg || (v.phase === 'buy' ? say(cust.prof, cust.loan ? 'loanAsk' : 'ask', { p: cust.ask }, seedOf(cust.id)) : say(cust.prof, 'want', { c: cust.cat === 'any' ? 'good stuff' : cust.cat }, seedOf(cust.id)));
    bubble(ctx, npc.x, FLOOR - 40, msg);
  }
  for (const n of npcs) if (n.leaving && n.say && n.x > 120) bubble(ctx, n.x, FLOOR - 40, n.say);
  ctx.restore();

  drawNight(ctx, v?.phase);

  // particles
  ctx.save(); ctx.translate(-c, 0);
  for (const p of parts) {
    const fx = Math.round(p.x * PX), fy = Math.round(p.y * PX);
    if (p.text) pixelTextOutlined(ctx, p.text, fx - Math.round(textW(p.text) / 2), fy, p.col);
    else {
      ctx.fillStyle = '#7a5410'; ctx.fillRect(fx - 1, fy - 1, 6, 6);
      ctx.fillStyle = p.col; ctx.fillRect(fx, fy, 4, 4);
      ctx.fillStyle = '#fff2b0'; ctx.fillRect(fx, fy, 2, 1);
    }
  }
  // zone label above keeper
  const z = zoneAt(keeper.x);
  if (z && !panel && !(z === 'counter' && cust && !cust.done)) {
    const label = `E: ${ZONES[z].label}`;
    const lx = Math.max(c + 4, Math.min(c + W * PX - textW(label) - 4, Math.round(keeper.x * PX - textW(label) / 2)));
    pixelTextOutlined(ctx, label, lx, FLOOR * PX - 92, '#f2c14e');
  }
  ctx.restore();

  // off-screen customer arrow
  if (cust && !cust.done && z !== 'counter') {
    const sx = CUSTOMER_X * PX - c;
    if (sx < 0 || sx > W * PX) { pixelTextOutlined(ctx, '< CUSTOMER', 12, 240, '#f2c14e'); }
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
  const tag = c.hard ? ' <span class="tag-hard">DESPERATE</span>' : c.loan ? ' <span class="tag-loan">PAWN LOAN</span>' : '';
  const tell = c.hard ? 'Down on their luck and needs credits fast. Prices are low.' : P.tell;
  return `<div class="who"><span class="who-name">${esc(P.name)}${tag}</span><span class="who-tell">${esc(tell)}</span></div>`;
}

/* price memory: last market sale, what you paid, what the wholesaler gave */
function memHtml(m) {
  if (!m) return '';
  const part = (lbl, r) => r ? `${lbl} ${money(r.price)} <span class="mem-dim">(${COND[r.cond].n}, sol ${r.day})</span>` : '';
  const bits = [part('Last sold', m.sale), part('You paid', m.paid), part('Wholesale', m.dump)].filter(Boolean);
  return bits.length ? `<div class="mem">${bits.join('<br>')}</div>` : '';
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

  const phaseNames = { dawn: 'MORNING', buy: 'BUYING', noon: 'PRICING', sell: 'SELLING', evening: 'EVENING', over: 'CLOSED' };
  $('#hud-day').textContent = v.maxDays ? `SOL ${v.day}/${v.maxDays}` : `SOL ${v.day}`;
  let phTxt = phaseNames[ph] || '';
  if ((ph === 'evening' || ph === 'noon') && v.left) phTxt += ` ${Math.ceil(remain(v.left) / 1000)}s`;
  $('#hud-phase').textContent = phTxt;
  $('#hud-queue').textContent = (ph === 'buy' || ph === 'sell') ? `${v.queue} IN LINE` : '';
  const cashEl = $('#hud-cash');
  cashEl.textContent = money(v.me.cash);
  cashEl.style.color = v.me.cash < 0 ? 'var(--red)' : '';
  $('#hud-inv').textContent = `BAG ${v.me.inv.length}/${v.me.cap}`;
  $('#hud-mute').innerHTML = isMuted() ? SVG_MUTE : SVG_SOUND;

  // event banner
  const eb = $('#event-banner');
  const bits = [];
  if (v.event && ph !== 'over') {
    const hot = v.event.mod > 1;
    bits.push(`<span class="${hot ? 'hot' : 'cold'}">${esc(v.event.cat)} ${hot ? 'in demand' : 'slump'}</span> this sol`);
  }
  if (ph !== 'over' && v.mods) {
    const M = v.mods;
    if (M.pact) bits.push(`<span class="guild-tag">PRICE PACT</span> buyers pay +${M.pact.bonus}% to sol ${M.pact.until}`);
    if (M.boost) bits.push(`<span class="guild-tag">GRID BOOST</span> more traffic to sol ${M.boost}`);
    if (M.blackout === v.day) bits.push(`<span class="cold">BLACKOUT</span> no walk-ins this sol`);
  }
  const ebHtml = bits.join(' &middot; ');
  if (eb.dataset.k !== ebHtml) { eb.innerHTML = ebHtml; eb.dataset.k = ebHtml; }

  // rivals
  const rv = $('#rivals');
  if (v.players.length > 1) {
    rv.innerHTML = v.players.map(p => `<div class="rival ${p.connected ? '' : 'off'}"><span class="sw" style="background:${p.color}"></span>${esc(p.name)}${p.pid === app.pid ? ' (you)' : p.ai ? ' <span class="ai-tag">AI</span>' : ''} ${money(p.cash)} &middot; ${p.n} items${ph === 'evening' && p.ready ? ' <span class="rd">READY</span>' : ''}${p.bankrupt ? ' <span class="rd" style="color:var(--red)">BROKE</span>' : ''}</div>`).join('');
  } else rv.innerHTML = '';
  // keep the deal panel clear of the standings list
  const dealTop = (rv.childElementCount ? rv.offsetTop + rv.offsetHeight + 6 : 34) + 'px';
  if ($('#deal').style.top !== dealTop) $('#deal').style.top = dealTop;

  // log
  const logHtml = v.players.length > 1 ? v.log.slice(-4).map(l => `<div>${esc(l)}</div>`).join('') : '';
  if ($('#log').dataset.k !== logHtml) { $('#log').innerHTML = logHtml; $('#log').dataset.k = logHtml; }

  // phase card
  if (ph === 'dawn') {
    showCard(`SOL ${v.day}`, eventLine(v.event, v.day));
  }
  else if (cardUntil && performance.now() > cardUntil) hideCard();
  else if (!cardUntil && !$('#card').hidden) hideCard();

  // prompt
  const z = zoneAt(keeper.x);
  let prompt = '';
  if (cust && !cust.done && z !== 'counter') prompt = 'Customer at the counter';
  if (ph === 'evening' && !panel) prompt = guildPending() ? 'The Pawn Guild is waiting on your answer (counter)' : 'Office board: upgrades. Counter: day summary.';
  if (ph === 'noon' && !panel) prompt = 'Shelves: set prices, then open the doors';
  $('#prompt').textContent = prompt;

  renderDeal();
  if (panel === 'eve') renderEvening();
  if (panel === 'inv') renderInv();
  if (panel === 'upg') renderUpg();
  if (panel === 'price') renderPrice();
  if (panel === 'guild') renderGuild();
  fitPanels();
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
/** Shrink any open panel that is taller than the space below it, so nothing ever scrolls. */
function fitPanels() {
  const ui = document.getElementById('ui');
  if (!ui) return;
  for (const el of document.querySelectorAll('#ui .panel')) {
    if (el.hidden) continue;
    const avail = ui.clientHeight - el.offsetTop - 6;
    const k = Math.max(0.45, Math.min(1, avail / el.offsetHeight));
    const cur = +el.style.getPropertyValue('--k') || 1;
    if (Math.abs(cur - k) > 0.005) el.style.setProperty('--k', k.toFixed(3));
  }
}

function openPanel(name) {
  closePanel();
  panel = name;
  dirtyUI = true;
  sfx('open');
  const el = { inv: '#invp', upg: '#upg', eve: '#eve', price: '#pricep', guild: '#guildp' }[name];
  $(el).hidden = false;
  if (name === 'inv') renderInv(true);
  if (name === 'upg') renderUpg(true);
  if (name === 'eve') { eveKey = ''; renderEvening(); }
  if (name === 'price') { priceKey = ''; renderPrice(); }
  if (name === 'guild') { guildKey = ''; renderGuild(); }
}
function closePanel() {
  for (const s of ['#invp', '#upg', '#eve', '#pricep', '#guildp']) $(s).hidden = true;
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
  let s = '<div class="strikes" data-p="strikes">Patience';
  for (let i = 0; i < max; i++) s += `<i class="${i < max - n ? 'on' : ''}"></i>`;
  return s + '</div>';
}

function buyHtml(v, c) {
  const it = ITEMS[c.itemId];
  const e = c.est;
  const full = !c.loan && v.me.inv.length >= v.me.cap;
  const def = offerVal[c.id] ?? String(Math.max(1, Math.round(c.loan ? c.ask * 0.7 : Math.min(c.ask * 0.6, (e.lo + e.hi) / 2 * 0.55))));
  offerVal[c.id] = def;
  const lim = c.lim;
  return `
    ${whoHtml(c)}
    <div class="item-head"><img class="icon" src="${itemIcon(c.itemId)}" alt="">
      <div><div class="item-name">${esc(it.n)}</div>
      <div class="meta">${it.cat} &middot; ${COND[c.cond].n} &middot; ${tierTag(e.tier)}</div></div></div>
    <div class="kv"><span>Appraisal</span><b>${estTxt(e)}</b></div>
    ${e.fake ? '<div class="fake">APPRAISER: LIKELY A FAKE</div>' : ''}
    ${memHtml(c.mem)}
    <div class="hint" data-p="hint">${esc(c.hint || '')}</div>
    <div class="kv"><span>${c.loan ? 'Wants to borrow' : 'Asking'}</span><span class="big-ask" data-p="ask">${money(c.ask)}</span></div>
    ${c.loan ? `<div class="loan-terms" data-p="terms">Repays ${money(Math.round(c.ask * (1 + c.loan.rate)))} (${Math.round(c.loan.rate * 100)}% interest) in ${c.loan.days} sols, or you keep the item.</div>` : ''}
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
      <button class="btn primary" id="offer-btn" data-p="offer" ${c.st.out || full ? 'disabled' : ''}>${c.loan ? 'Offer loan' : 'Offer'}</button>
      <button class="btn good" id="take-btn" data-p="take" ${c.st.out || full || c.ask > v.me.cash ? 'disabled' : ''}>${c.loan ? 'Lend' : 'Pay'} ${money(c.ask)}</button>
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
    ${el.length ? `<div class="pick-grid">${el.map(i => `
      <button class="pick-tile ${i.uid === pickUid[c.id] ? 'on' : ''}" data-uid="${i.uid}" title="${esc(ITEMS[i.id].n)}"><img src="${itemIcon(i.id, 2)}" alt="${esc(ITEMS[i.id].n)}"></button>`).join('')}</div>
      ${sel ? `<div class="pick-info"><span class="nm">${esc(ITEMS[sel.id].n)}</span><br>${COND[sel.cond].n} &middot; paid ${money(sel.paid)} &middot; est ${estTxt(sel.est)}${sel.est.fake ? ' <span class="fake">FAKE?</span>' : ''}${sel.mem?.sale ? `<br><span class="mem-dim">Last sold ${money(sel.mem.sale.price)} (${COND[sel.mem.sale.cond].n})</span>` : ''}</div>` : ''}
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
  el.querySelectorAll('.pick-tile').forEach(b => b.addEventListener('click', () => { pickUid[c.id] = b.dataset.uid; sfx('tick'); dealKey = ''; renderDeal(); }));
}

/* inventory */
let invKey = '';
function renderInv(force) {
  const v = app.view, el = $('#invp');
  const inv = v.me.inv;
  const loans = v.me.loans || [];
  const key = JSON.stringify([inv, loans, v.me.cap, v.phase]);
  if (key === invKey && !force) return;
  // don't rebuild under the player's cursor while they're typing a price
  if (!force && el.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;
  invKey = key;
  const listed = inv.filter(i => i.price != null).length;
  el.innerHTML = `${closeBtn}<h2>Inventory ${inv.length}/${v.me.cap}</h2>
    <div class="inv-tools"><span class="meta">${listed} on sale to walk-ins</span>
      <button class="btn small" data-bulk="auto">Auto-price all</button>
      <button class="btn small" data-bulk="down">All -10%</button>
      <button class="btn small" data-bulk="up">All +10%</button></div>
    ${inv.length ? `<div class="inv-grid">${inv.map((i, n) => `
      <div class="inv-card" style="--i:${n}" title="${esc(ITEMS[i.id].n)}">
        <img class="icon sm" src="${itemIcon(i.id, 2)}" alt="">
        <div class="inv-txt"><div class="nm">${esc(ITEMS[i.id].n)}</div>
        <div class="meta">${COND[i.cond].n} &middot; paid ${money(i.paid)}</div>
        <div class="meta">est ${estTxt(i.est)}${i.est.fake ? ' <span class="fake">FAKE?</span>' : ''}</div>
        ${i.mem?.sale ? `<div class="meta mem-dim">sold ${money(i.mem.sale.price)} (${COND[i.mem.sale.cond].n})</div>` : ''}</div>
        <div class="tag-row">
          ${i.price != null
            ? `<input class="field tag-in" type="number" min="1" value="${i.price}" data-price="${i.uid}" aria-label="Shelf price"><button class="btn small" data-hold="${i.uid}" title="Take off sale">Hold</button>`
            : `<span class="meta held">Not for sale</span><button class="btn small good" data-list="${i.uid}" title="Put on sale at a suggested price">List</button>`}
          <button class="btn small" data-dump="${i.uid}" title="Dump to wholesaler">Dump</button>
        </div>
      </div>`).join('')}</div>` : '<div class="empty">Nothing on the shelves.</div>'}
    ${loans.length ? `<h3>VAULT: PAWN LOANS</h3><div class="inv-grid">${loans.map(l => `
      <div class="inv-card" title="${esc(ITEMS[l.itemId].n)}">
        <img class="icon sm" src="${itemIcon(l.itemId, 2)}" alt="">
        <div class="inv-txt"><div class="nm">${esc(ITEMS[l.itemId].n)}</div>
        <div class="meta">lent ${money(l.amount)} &middot; back ${money(l.back)}</div>
        <div class="meta">due sol ${l.due}${l.est.fake ? ' <span class="fake">FAKE?</span>' : ''}</div></div>
      </div>`).join('')}</div>` : ''}`;
  el.querySelector('[data-close]').addEventListener('click', closePanel);
  el.querySelectorAll('[data-price]').forEach(inp => {
    const commit = () => { const n = Math.floor(+inp.value); if (n > 0) act({ type: 'price', uid: inp.dataset.price, price: n }); };
    inp.addEventListener('change', commit);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } });
  });
  el.querySelectorAll('[data-hold]').forEach(b => b.addEventListener('click', () => act({ type: 'price', uid: b.dataset.hold, price: null })));
  el.querySelectorAll('[data-list]').forEach(b => b.addEventListener('click', () => act({ type: 'price', uid: b.dataset.list, price: 'auto' })));
  el.querySelectorAll('[data-bulk]').forEach(b => b.addEventListener('click', () => {
    sfx('tick');
    for (const i of inv) {
      if (b.dataset.bulk === 'auto') act({ type: 'price', uid: i.uid, price: 'auto' });
      else if (i.price != null) act({ type: 'price', uid: i.uid, price: Math.max(1, Math.round(i.price * (b.dataset.bulk === 'down' ? 0.9 : 1.1))) });
    }
    renderInv(true);
  }));
  el.querySelectorAll('[data-dump]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.confirm) { act({ type: 'dump', uid: b.dataset.dump }); }
    else { b.dataset.confirm = '1'; b.textContent = 'Sure?'; b.classList.add('bad'); }
  }));
}

/* upgrades */
let upgKey = '';
let officeTab = 'upgrades';
function renderUpg(force) {
  const v = app.view, el = $('#upg');
  const eve = v.phase === 'evening';
  const key = JSON.stringify([v.me.up, v.me.cash, v.phase, v.me.insurance, v.me.premium, officeTab]);
  if (key === upgKey && !force) return;
  upgKey = key;
  const tabs = [['staff', 'Staff'], ['upgrades', 'Upgrades'], ['insurance', 'Insurance']];
  const wages = UPGRADES.filter(u => u.staff).reduce((t, u) => t + v.me.up[u.id] * u.wage, 0);
  let body = '';
  if (officeTab === 'insurance') {
    body = `<div class="hint">Covers overnight theft and damage. The premium is charged each night with rent and grows with the value of your stock.</div>
      <div class="upg-list">${INSURANCE.map(I => {
        const prem = I.id ? Math.round(I.base + I.rate * v.me.inv.reduce((t, i) => t + (i.paid || 0), 0)) : 0;
        const on = (v.me.insurance || 0) === I.id;
        return `<div class="upg ${on ? 'on' : ''}">
          <div class="nm">${I.name}${on ? ' <span class="staff">ACTIVE</span>' : ''}</div>
          <div class="ds">${esc(I.desc)}${I.id ? ` About ${money(prem)} per sol right now.` : ''}</div>
          <div class="upg-btns"><button class="btn ${on ? '' : 'primary'}" data-ins="${I.id}" ${!eve || on ? 'disabled' : ''}>${on ? 'Current' : 'Choose'}</button></div>
        </div>`;
      }).join('')}</div>`;
  } else {
    const list = UPGRADES.filter(u => (officeTab === 'staff') === !!u.staff);
    body = `${officeTab === 'staff' ? `<div class="kv"><span>Wages per sol</span><b>${money(wages)}</b></div>` : ''}
      <div class="upg-list">${list.map(u => {
        const lvl = v.me.up[u.id], max = u.cost.length, cost = u.cost[lvl];
        const pips = Array.from({ length: max }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('');
        return `<div class="upg">
          <div class="nm">${u.name} <span class="pips ${flashUpgrade === u.id ? 'flash' : ''}">${pips}</span>${u.staff ? `<span class="staff">${money(u.wage)}/SOL EACH</span>` : ''}</div>
          <div class="ds">${esc(u.desc)}</div>
          <div class="upg-btns">
            <button class="btn ${lvl < max ? 'primary' : ''}" data-up="${u.id}" ${!eve || lvl >= max || cost > v.me.cash ? 'disabled' : ''}>${lvl >= max ? 'MAX' : (u.staff ? 'Hire ' : '') + money(cost)}</button>
            ${lvl > 0 ? `<button class="btn small" data-down="${u.id}" ${eve ? '' : 'disabled'} title="${u.staff ? 'Saves ' + money(u.wage) + ' per sol' : 'Refunds ' + money(Math.round(u.cost[lvl - 1] * 0.3))}">${u.staff ? 'Let go' : 'Sell back'}</button>` : ''}
          </div>
        </div>`;
      }).join('')}</div>`;
  }
  el.innerHTML = `${closeBtn}<h2>Office</h2>
    <div class="tabs">${tabs.map(([id, n]) => `<button class="tab ${officeTab === id ? 'on' : ''}" data-tab="${id}">${n}</button>`).join('')}</div>
    <div class="kv"><span>Cash</span><b>${money(v.me.cash)}</b></div>
    ${eve ? '' : '<div class="hint">Changes can be made in the evening.</div>'}
    ${body}`;
  flashUpgrade = null;
  el.querySelector('[data-close]').addEventListener('click', closePanel);
  el.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { officeTab = b.dataset.tab; sfx('tick'); renderUpg(true); }));
  el.querySelectorAll('[data-up]').forEach(b => b.addEventListener('click', () => act({ type: 'upgrade', id: b.dataset.up })));
  el.querySelectorAll('[data-ins]').forEach(b => b.addEventListener('click', () => act({ type: 'insure', level: +b.dataset.ins })));
  el.querySelectorAll('[data-down]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.confirm) act({ type: 'downgrade', id: b.dataset.down });
    else { b.dataset.confirm = '1'; b.textContent = 'Confirm'; b.classList.add('bad'); }
  }));
}
function openOffice(tab) { if (tab) officeTab = tab; openPanel('upg'); }

/* midday pricing break */
let priceKey = '';
function renderPrice() {
  const v = app.view, el = $('#pricep');
  if (v.phase !== 'noon') { closePanel(); return; }
  const inv = v.me.inv;
  const solo = v.mode === 'solo';
  const readyN = v.players.filter(p => p.ready && p.connected).length;
  const liveN = v.players.filter(p => p.connected && !p.bankrupt).length;
  const secs = v.left ? Math.ceil(remain(v.left) / 1000) : 0;
  const key = JSON.stringify([inv.map(i => [i.uid, i.price]), v.me.ready, readyN, secs]);
  if (key === priceKey) return;
  if (el.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;  // don't rebuild while typing
  priceKey = key;
  const mid = i => (i.est.lo + i.est.hi) / 2;
  const listed = inv.filter(i => i.price != null).length;
  const go = solo ? 'Open the doors' : v.me.ready ? `Waiting ${readyN}/${liveN}` : `Ready${secs ? ` (${secs}s)` : ''}`;
  el.innerHTML = `${closeBtn}<h2>Midday: set your prices</h2>
    <div class="hint">Walk-in shoppers buy anything priced below what they'd pay. Higher prices earn more per sale but sell less often.</div>
    ${inv.length ? `
    <div class="inv-tools"><span class="meta">${listed}/${inv.length} on sale</span>
      <span class="meta">Set all to estimate:</span>
      <button class="btn small" data-pct="0.9">90%</button><button class="btn small" data-pct="1.1">110%</button>
      <button class="btn small" data-pct="1.3">130%</button><button class="btn small" data-pct="1.5">150%</button>
      <button class="btn small" data-bulk="auto">Suggested</button>
      <button class="btn small" data-bulk="down">-10%</button><button class="btn small" data-bulk="up">+10%</button></div>
    <div class="price-grid">${inv.map(i => {
      const m = mid(i), margin = i.price != null ? i.price - i.paid : null;
      return `<div class="price-row ${i.price == null ? 'held' : ''}" title="${esc(ITEMS[i.id].n)}">
        <img class="icon sm" src="${itemIcon(i.id, 2)}" alt="">
        <div class="inv-txt"><div class="nm">${esc(ITEMS[i.id].n)}</div>
          <div class="meta">${COND[i.cond].n} &middot; paid ${money(i.paid)} &middot; est ${estTxt(i.est)}${i.est.fake ? ' <span class="fake">FAKE?</span>' : ''}</div>
          ${i.mem?.sale ? `<div class="meta mem-dim">last sold ${money(i.mem.sale.price)} (${COND[i.mem.sale.cond].n})</div>` : ''}</div>
        <div class="price-ctl">
          ${i.price != null
            ? `<input class="field tag-in" type="number" min="1" value="${i.price}" data-price="${i.uid}" aria-label="Price for ${esc(ITEMS[i.id].n)}">
               <span class="margin ${margin >= 0 ? 'p' : 'n'}">${margin >= 0 ? '+' : ''}${money(margin)}</span>
               <button class="btn small" data-hold="${i.uid}">Hold</button>`
            : `<span class="meta">Not for sale</span><button class="btn small good" data-list="${i.uid}">List</button>`}
        </div>
      </div>`;
    }).join('')}</div>` : '<div class="empty">Nothing on the shelves yet.</div>'}
    <div class="row"><button class="btn primary" id="price-go" ${v.me.bankrupt ? 'disabled' : ''}>${go}</button></div>`;
  el.querySelectorAll('[data-price]').forEach(inp => {
    const commit = () => { const n = Math.floor(+inp.value); if (n > 0) act({ type: 'price', uid: inp.dataset.price, price: n }); };
    inp.addEventListener('change', commit);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } });
  });
  el.querySelectorAll('[data-hold]').forEach(b => b.addEventListener('click', () => act({ type: 'price', uid: b.dataset.hold, price: null })));
  el.querySelectorAll('[data-list]').forEach(b => b.addEventListener('click', () => act({ type: 'price', uid: b.dataset.list, price: 'auto' })));
  el.querySelectorAll('[data-pct]').forEach(b => b.addEventListener('click', () => {
    sfx('tick');
    for (const i of inv) act({ type: 'price', uid: i.uid, price: Math.max(1, Math.round(mid(i) * +b.dataset.pct)) });
  }));
  el.querySelectorAll('[data-bulk]').forEach(b => b.addEventListener('click', () => {
    sfx('tick');
    for (const i of inv) {
      if (b.dataset.bulk === 'auto') act({ type: 'price', uid: i.uid, price: 'auto' });
      else if (i.price != null) act({ type: 'price', uid: i.uid, price: Math.max(1, Math.round(i.price * (b.dataset.bulk === 'down' ? 0.9 : 1.1))) });
    }
  }));
  el.querySelector('[data-close]').addEventListener('click', closePanel);
  $('#price-go').addEventListener('click', () => {
    // commit a price that is still being typed before opening
    const a = document.activeElement; if (a && a.dataset && a.dataset.price) a.blur();
    sfx('click'); act({ type: 'ready', v: !v.me.ready });
  });
}

/* evening summary */
let eveKey = '';
function renderEvening() {
  const v = app.view, el = $('#eve');
  if (v.phase !== 'evening') { closePanel(); return; }
  const s = v.me.summary;
  const readyN = v.players.filter(p => p.ready && p.connected).length;
  const liveN = v.players.filter(p => p.connected && !p.bankrupt).length;
  const solo = v.mode === 'solo';
  const key = JSON.stringify([s, v.me.cash, v.me.ready, readyN, Math.ceil(remain(v.left) / 1000), v.guild && [v.guild.stage, v.guild.myTurn, v.guild.waiting]]);
  if (key === eveKey) return;
  eveKey = key;
  if (!s) { el.innerHTML = ''; return; }
  const line = (l, r, cls = '') => `<div class="line"><span>${l}</span><span class="${cls}">${r}</span></div>`;
  const net = v.me.cash - s.startCash;
  el.innerHTML = `${closeBtn}<h2>Sol ${v.day} books</h2>
    <div class="sum-grid">
      <div class="col"><h3>BOUGHT</h3>${s.bought.length ? s.bought.map(b => line(esc(ITEMS[b.id].n), money(b.price))).join('') : '<div class="meta">Nothing</div>'}</div>
      <div class="col"><h3>SOLD</h3>${s.sold.length ? s.sold.map(b => line(esc(ITEMS[b.id].n), `${money(b.price)} (${b.price - b.paid >= 0 ? '+' : ''}${money(b.price - b.paid)})`, b.price >= b.paid ? 'p' : 'n')).join('') : '<div class="meta">Nothing</div>'}
      ${s.walkins?.length ? '<h3>WALK-IN SALES</h3>' + s.walkins.map(b => line(esc(ITEMS[b.id].n), `${money(b.price)} (${b.price - b.paid >= 0 ? '+' : ''}${money(b.price - b.paid)})`, b.price >= b.paid ? 'p' : 'n')).join('') : ''}
      ${s.browsers ? `<div class="meta">${s.browsers} browsers, ${s.walkins?.length || 0} bought</div>` : ''}
      ${s.dumped.length ? '<h3>DUMPED</h3>' + s.dumped.map(b => line(esc(ITEMS[b.id].n), money(b.price), b.price >= b.paid ? 'p' : 'n')).join('') : ''}
      ${s.lent?.length ? '<h3>LOANED OUT</h3>' + s.lent.map(b => line(esc(ITEMS[b.id].n), `${money(b.amount)} (repays ${money(b.back)})`)).join('') : ''}</div>
    </div>
    <h3>OVERNIGHT</h3>
    ${(s.loans || []).map(l => l.kind === 'repaid' ? line(`Loan repaid: ${esc(ITEMS[l.id].n)}`, `+${money(l.back)}`, 'p') : line(`Loan forfeited: ${esc(ITEMS[l.id].n)} is yours`, `cost ${money(l.amount)}`)).join('')}
    ${line('Rent', '-' + money(s.rent), 'n')}
    ${s.wages ? line('Staff wages', '-' + money(s.wages), 'n') : ''}
    ${s.premium ? line('Insurance premium', '-' + money(s.premium), 'n') : ''}
    ${s.damaged ? line(`Damaged overnight: ${esc(ITEMS[s.damaged.id].n)}`, `now ${COND[s.damaged.cond].n}`, 'n') : ''}
    ${(s.claims || []).map(c => line(`Insurance paid (${c.kind}): ${esc(ITEMS[c.id].n)}`, '+' + money(c.pay), 'p')).join('')}
    ${s.restored.map(r => line(`Restored ${esc(ITEMS[r.id].n)}`, `now ${COND[r.cond].n}`, 'p')).join('')}
    ${s.stolen != null ? line(`Stolen: ${esc(ITEMS[s.stolen].n)}`, 'gone', 'n') : ''}
    ${s.forced.map(f => line(`Sold off to pay bills: ${esc(ITEMS[f.id].n)}`, money(f.price), 'n')).join('')}
    ${s.pactFine ? line('Guild inspectors caught you undercutting the pact', '-' + money(s.pactFine), 'n') : ''}
    ${v.guild ? `<h3>PAWN GUILD</h3>${v.guild.stage === 'reveal'
      ? [...v.guild.result.pub.slice(-1), ...v.guild.result.mine].map(t => `<div class="meta">${esc(t)}</div>`).join('')
      : `<div class="meta guild-due">${esc(v.guild.title)}: ${v.guild.myTurn ? 'your answer is needed.' : `waiting on ${v.guild.waiting} shop${v.guild.waiting === 1 ? '' : 's'}.`}</div>`}` : ''}
    <div class="total"><span>CASH ${money(v.me.cash)}</span><span style="color:${net >= 0 ? 'var(--green)' : 'var(--red)'}">${net >= 0 ? '+' : ''}${money(net)} TODAY</span></div>
    ${v.me.bankrupt ? '<div class="hint" style="color:var(--red)">You went bankrupt.</div>' : ''}
    <div class="row">
      ${v.guild ? '<button class="btn" id="eve-guild">Guild</button>' : ''}
      <button class="btn" id="eve-staff">Staff</button>
      <button class="btn" id="eve-upg">Upgrades</button>
      <button class="btn" id="eve-inv">Inventory</button>
      <button class="btn primary" id="eve-go" ${v.me.bankrupt ? 'disabled' : ''}>${guildPending() ? 'Answer the Guild' : solo ? (v.maxDays && v.day >= v.maxDays ? 'Final tally' : 'Open shop') : v.me.ready ? `Waiting ${readyN}/${liveN}` : `Ready (${Math.ceil(remain(v.left) / 1000)}s)`}</button>
    </div>`;
  el.querySelector('[data-close]').addEventListener('click', closePanel);
  $('#eve-staff').addEventListener('click', () => openOffice('staff'));
  $('#eve-upg').addEventListener('click', () => openOffice('upgrades'));
  $('#eve-inv').addEventListener('click', () => openPanel('inv'));
  $('#eve-guild')?.addEventListener('click', () => openPanel('guild'));
  $('#eve-go').addEventListener('click', () => { sfx('click'); if (guildPending()) openPanel('guild'); else act({ type: 'ready', v: !v.me.ready }); });
}

/* Pawn Guild notice */
let guildKey = '', guildStruct = '', guildAnimFor = '';
function guildPending() { const g = app.view?.guild; return !!(g && g.myTurn && !app.view.me.bankrupt); }
// three-ball pawn crest, drawn as pixels
const GUILD_SEAL = '<svg class="g-seal" viewBox="0 0 11 11" shape-rendering="crispEdges" aria-hidden="true"><path fill="#f2c14e" d="M1 0h9v1H1zM0 1h1v6H0zM10 1h1v6h-1zM1 7h1v1H1zM9 7h1v1H9zM2 8h1v1H2zM8 8h1v1H8zM3 9h5v1H3z"/><path fill="#5a3d1e" d="M1 1h9v6H1zM2 7h7v1H2zM3 8h5v1H3z"/><path fill="#e8554e" d="M2 2h2v2H2zM7 2h2v2H7zM4.5 5h2v2h-2z"/></svg>';
function guildQuick(inp) {
  const max = inp.max, s = inp.suggest || 0;
  if (max <= 15) return Array.from({ length: max + 1 }, (_, i) => i);
  let q = s ? [0, Math.round(s / 2), s, Math.round(s * 1.5)] : [0, max * 0.05, max * 0.1, max * 0.2].map(Math.round);
  return [...new Set(q.map(x => Math.min(max, x)))];
}
function renderGuild() {
  const v = app.view, el = $('#guildp'), g = v.guild;
  if (v.phase !== 'evening' || !g) { closePanel(); return; }
  const secs = g.left ? Math.ceil(remain(g.left) / 1000) : 0;
  const struct = JSON.stringify([g.id, g.stage, g.myTurn, g.chosen, g.offer, !!g.result, g.input?.max]);
  const key = struct + '|' + secs + '|' + g.waiting;
  if (key === guildKey) return;
  const tm = el.querySelector('.g-timer');
  if (struct === guildStruct && tm) {           // only the timer / waiting count changed: patch in place
    tm.textContent = secs ? `${secs}s` : '';
    const w = el.querySelector('.g-wait'); if (w) w.textContent = waitTxt(g);
    guildKey = key; return;
  }
  guildKey = key; guildStruct = struct;
  const isMoney = !(g.id === 'supply');
  let body = '';
  if (g.stage !== 'reveal') {
    if (g.myTurn) {
      const inp = g.input;
      if (g.id === 'gift' && g.stage === 'vote') {
        body += `<div class="g-offer">The leading shop keeps <b>${money(g.offer.keep)}</b>. Every other shop gets <b>${money(g.offer.each)}</b>.</div>`;
      }
      if (g.id === 'gift' && g.stage === 'choose') body += '<div class="g-offer">Your shop is the colony leader. You decide the split.</div>';
      if (inp.kind === 'number') {
        const val = Math.min(inp.max, inp.suggest || 0);
        body += `<div class="g-num">
          <label class="meta" for="g-in">${esc(inp.label)}${g.id === 'gift' ? ` (out of ${money(inp.max)})` : isMoney ? ` (you have ${money(inp.max)})` : ` (0-${inp.max})`}</label>
          <div class="g-row"><input id="g-in" class="field tag-in" type="number" min="0" max="${inp.max}" value="${val}">
            ${guildQuick(inp).map(q => `<button class="btn small" data-q="${q}">${isMoney ? money(q) : q}</button>`).join('')}</div>
          ${g.id === 'gift' ? '<div class="meta g-calc"></div>' : ''}
          <div class="row"><button class="btn primary" id="g-send">Seal my answer</button></div>
        </div>`;
      } else if (inp.kind === 'choice') {
        body += `<div class="g-opts">${inp.options.map(([k, l]) => `<button class="btn" data-v="${k}">${esc(l)}</button>`).join('')}</div>`;
      } else if (inp.kind === 'target') {
        body += `<div class="meta">Report which shop?</div><div class="g-opts">${(g.targets || []).map(t => `<button class="btn" data-v="${t.pid}">${esc(t.name)}</button>`).join('')}<button class="btn" data-v="none">Nobody</button></div>`;
      }
    } else {
      if (g.id === 'gift' && g.stage === 'vote' && g.isProposer) body += `<div class="g-offer">You keep <b>${money(g.offer.keep)}</b>. Every other shop gets <b>${money(g.offer.each)}</b>.</div>`;
      else if (g.id === 'gift' && g.stage === 'vote') body += `<div class="g-offer">The leading shop keeps <b>${money(g.offer.keep)}</b>. Every other shop gets <b>${money(g.offer.each)}</b>.</div>`;
      body += `<div class="g-sealed">${GUILD_SEAL}<span class="g-wait">${waitTxt(g)}</span></div>`;
    }
  } else {
    const R = g.result, anim = guildAnimFor !== v.day + g.id;
    guildAnimFor = v.day + g.id;
    body += `<h3>SEALED ANSWERS</h3><div class="g-reveal ${anim ? 'anim' : ''}">${R.reveal.map((t, i) => `<div class="g-card" style="--i:${i}">${esc(t)}</div>`).join('')}</div>
      <h3>OUTCOME</h3>${R.pub.map(t => `<div class="g-pub">${esc(t)}</div>`).join('')}
      ${R.mine.map(t => `<div class="g-mine">${esc(t)}</div>`).join('')}
      <div class="hint">Answers are anonymous. Nobody learns who chose what.</div>
      <div class="row"><button class="btn primary" id="g-done">Continue</button></div>`;
  }
  el.innerHTML = `${closeBtn}<div class="g-head">${GUILD_SEAL}<div><div class="g-kicker">PAWN GUILD NOTICE</div><h2>${esc(g.title)}</h2></div><span class="g-timer">${secs ? `${secs}s` : ''}</span></div>
    <p class="g-text">${esc(g.text)}</p>${body}`;
  el.querySelector('[data-close]').addEventListener('click', closePanel);
  const send = value => { sfx('click'); act({ type: 'guild', value }); };
  const inEl = el.querySelector('#g-in');
  if (inEl) {
    const calc = () => {
      const c = el.querySelector('.g-calc'); if (!c) return;
      const keep = Math.max(0, Math.min(g.input.max, Math.floor(+inEl.value) || 0));
      c.textContent = `Each other shop gets ${money(Math.floor((g.input.max - keep) / Math.max(1, v.players.filter(p => !p.bankrupt).length - 1)))}.`;
    };
    calc();
    inEl.addEventListener('input', calc);
    inEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); send(+inEl.value); } });
    el.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => { sfx('tick'); inEl.value = b.dataset.q; calc(); }));
    el.querySelector('#g-send').addEventListener('click', () => send(+inEl.value));
  }
  el.querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => send(b.dataset.v)));
  el.querySelector('#g-done')?.addEventListener('click', () => openPanel('eve'));
}
function waitTxt(g) {
  if (g.id === 'gift' && g.stage === 'choose' && !g.isProposer) return 'The leading shop is deciding how to split the gift...';
  return g.chosen || g.isProposer
    ? `Your answer is sealed. Waiting on ${g.waiting} shop${g.waiting === 1 ? '' : 's'}...`
    : `Waiting on ${g.waiting} shop${g.waiting === 1 ? '' : 's'}...`;
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
      <span class="dt">Cash ${money(p.cash)} + ${p.items} items and loans worth ${money(p.invVal)} &middot; ${p.stats.bought} bought, ${p.stats.sold} sold${bf ? ` &middot; best flip: ${esc(ITEMS[bf.id].n)} ${bf.profit >= 0 ? '+' : ''}${money(bf.profit)}` : ''}</span></li>`;
  }).join('');
  sfx('day');
}

/* --------------------------------------------------------------- sound --- */
const SVG_SOUND = '<svg viewBox="0 0 7 7" shape-rendering="crispEdges"><path fill="#efe0b8" d="M0 2h2v3H0zM2 1h1v5H2zM3 0h1v7H3zM5 2h1v3H5z"/></svg>';
const SVG_MUTE = '<svg viewBox="0 0 7 7" shape-rendering="crispEdges"><path fill="#a99cc0" d="M0 2h2v3H0zM2 1h1v5H2zM3 0h1v7H3z"/><path fill="#e8554e" d="M5 2h1v1H5zM6 3h1v1H6zM5 4h1v1H5z"/></svg>';
function toggleMute() { setMuted(!isMuted()); dirtyUI = true; }
$('#hud-mute').addEventListener('click', toggleMute);
