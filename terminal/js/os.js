/**
 * os.js - Red Planet Pawn: MarsNet Edition. The whole game as a fake colony desktop OS.
 *
 * Shares the simulation (sim/guild/ai/net) with the 2D game; ext.js adds scan, dossier and
 * hacking. This file is only presentation: boot/login, lobby, a draggable window manager,
 * one "app" per window, a command shell, and pixel art (item sprites + customer portraits).
 *
 * Roles (same as the 2D game): solo / host run the Sim here; client renders host views.
 */
import { COND, capOf, INSURANCE, UPGRADES } from './sim.js';
import { TermSim, COST, citizen } from './ext.js';
import { ITEMS, TIERS, CATS, itemIcon } from './items.js';
import { createHost, createClient, clientId, joinUrl, roomFromUrl } from './net.js';
import { drawChar, lookFromSeed } from './art.js';
import { sfx, setMuted, isMuted } from './sound.js';
import { PROFILES, say } from './profiles.js';

const SLUG = 'redplanetpawn-term-v1';
const SAVE_KEY = 'rpp-term-save';
const LAYOUT_KEY = 'rpp-term-layout';
const MAX_PLAYERS = 4;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = n => (n < 0 ? '-' : '') + Math.abs(Math.round(n)).toLocaleString('en-US') + ' CR';
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
const app = { mode: null, sim: null, host: null, client: null, pid: null, view: null, viewAt: 0, lastFx: -1, maxDays: 20, aiN: 0, lobbyReady: {}, started: false };
const setScreen = n => { document.body.dataset.screen = n; drawWall(); };
const status = (el, t, err = false) => { el.textContent = t || ''; el.classList.toggle('err', !!err); };

/* ============================================================ PIXEL ICONS === */
const PAL = { g: '#35d0a0', G: '#1f6e58', r: '#ff6f61', R: '#a8323a', a: '#ffb347', A: '#b8732a', c: '#4fe0d0', C: '#1f5a66', w: '#fffaf0', k: '#140f1e', p: '#6a4f8a', P: '#a98fd0', y: '#f2c14e' };
const MAPS = {
  logo: ['............', '.gggggggggg.', '.gkkkkkkkkg.', '.gkgkkkkkkg.', '.gkkgkkkkkg.', '.gkgkkkkkkg.', '.gkkkkkggkg.', '.gkkkkkkkkg.', '.gggggggggg.', '....rrrr....', '...rrrrrr...', '............'],
  cam: ['............', '............', '.PPPPPPPP...', '.PwwwwwwP.PP', '.PwkkkkwPPPP', '.PwkrrkwPPPP', '.PwkrrkwPPPP', '.PwkkkkwP.PP', '.PwwwwwwP...', '.PPPPPPPP...', '....pp......', '...pppp.....'],
  stock: ['............', '..AAAAAAAA..', '.AaaaaaaaaA.', '.AaaaaaaaaA.', '.AAAAAAAAAA.', '.AaaayyaaaA.', '.AaaayyaaaA.', '.AaaaaaaaaA.', '.AaaaaaaaaA.', '.AAAAAAAAAA.', '............', '............'],
  intel: ['............', '...cccc.....', '..cCCCCc....', '.cCwCCCCc...', '.cCCCCCCc...', '.cCCCCCCc...', '..cCCCCc....', '...cccccc...', '.......rr...', '........rr..', '.........rr.', '............'],
  ledger: ['............', '.PPPPPPPPPP.', '.PkkkkkkkkP.', '.PkkkkkkgkP.', '.PkkkkgkgkP.', '.PkkgkgkgkP.', '.PkkgkgkgkP.', '.PgkgkgkgkP.', '.PgkgkgkgkP.', '.PPPPPPPPPP.', '............', '............'],
  admin: ['............', '.....aa.....', '..a.aaaa.a..', '..aaaaaaaa..', '...aaAAaa...', '.aaaA..Aaaa.', '.aaaA..Aaaa.', '...aaAAaa...', '..aaaaaaaa..', '..a.aaaa.a..', '.....aa.....', '............'],
  guild: ['............', '.yyyyyyyyyy.', '..y......y..', '..y......y..', '..rr....rr..', '.rrrr..rrrr.', '.rrrr..rrrr.', '..rr.rr.rr..', '....rrrr....', '....rrrr....', '.....rr.....', '............'],
  net: ['............', '.c........c.', 'c..c....c..c', 'c.c..gg..c.c', 'c.c..gg..c.c', 'c..c.gg.c..c', '.c...gg...c.', '.....gg.....', '....gggg....', '...gGGGGg...', '..gggggggg..', '............'],
  shell: ['............', '.PPPPPPPPPP.', '.PkkkkkkkkP.', '.PkgkkkkkkP.', '.PkkgkkkkkP.', '.PkgkkkkkkP.', '.PkkkkgggkP.', '.PkkkkkkkkP.', '.PPPPPPPPPP.', '............', '............', '............'],
  report: ['............', '....yyyy....', '...yyy......', '..yyy.......', '..yyy.......', '..yyy.......', '..yyyy......', '...yyyyy....', '....yyyy....', '............', '............', '............'],
};
const svgCache = {};
function icon(name) {
  if (svgCache[name]) return svgCache[name];
  const m = MAPS[name] || MAPS.logo;
  let r = '';
  m.forEach((row, y) => [...row].forEach((ch, x) => { if (PAL[ch]) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${PAL[ch]}"/>`; }));
  return (svgCache[name] = `<svg viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`);
}
const paintIcons = (root = document) => root.querySelectorAll('[data-ico]').forEach(el => { if (!el.firstChild) el.innerHTML = icon(el.dataset.ico); });
paintIcons();

/* ============================================================== WALLPAPER === */
const wall = $('#wall');
function drawWall() {
  const w = 240, h = 135;
  wall.width = w; wall.height = h;
  const g = wall.getContext('2d');
  const night = app.view?.phase === 'evening' || app.view?.phase === 'over';
  const sky = night ? ['#141a3a', '#1d2a5a', '#2c4a80', '#4a74a8', '#7aa0c8'] : ['#3a1e2a', '#6a2e2e', '#a8503a', '#d07a48', '#e8a868'];
  sky.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * 14, w, 14); });
  g.fillStyle = night ? '#bcd8f0' : '#fff0c8'; g.fillRect(180, night ? 52 : 22, 6, 6); g.fillRect(179, night ? 53 : 23, 8, 4);
  if (night) { g.fillStyle = '#ffffff'; for (let i = 0; i < 30; i++) g.fillRect((i * 53) % w, (i * 29) % 40, 1, 1); }
  const ridge = (y0, amp, col, seed) => { g.fillStyle = col; for (let x = 0; x < w; x++) { const y = y0 + Math.round(Math.sin(x / 17 + seed) * amp + Math.sin(x / 7 + seed * 3) * amp / 3); g.fillRect(x, y, 1, h - y); } };
  ridge(72, 6, night ? '#2a2850' : '#8a3a2e', 1);
  ridge(86, 4, night ? '#22203a' : '#6e2c26', 4);
  // domes
  const dome = (cx, r, base) => { for (let dy = 0; dy <= r; dy++) { const hw = Math.round(Math.sqrt(r * r - dy * dy)); g.fillStyle = dy % 3 ? (night ? '#4a6a8a' : '#c8d8e0') : (night ? '#6a8aa8' : '#e8f0f0'); g.fillRect(cx - hw, base - dy, hw * 2, 1); } g.fillStyle = night ? '#ffd27a' : '#5a4a6a'; for (let i = -r + 3; i < r - 2; i += 4) g.fillRect(cx + i, base - 2, 2, 2); };
  dome(52, 16, 100); dome(86, 9, 100); dome(150, 12, 100);
  g.fillStyle = night ? '#1a1830' : '#5a2420'; g.fillRect(0, 100, w, h - 100);
  g.fillStyle = night ? '#221f3c' : '#6a2c24'; for (let i = 0; i < 40; i++) g.fillRect((i * 37) % w, 104 + (i * 13) % 30, 3, 1);
}
drawWall();
addEventListener('resize', () => { if (document.body.dataset.screen === 'desk') clampWins(); });

/* ================================================================== BOOT === */
const BOOT = ['MARSNET BIOS 4.9.2 (c) Tharsis Grid Authority', 'Memory check ......... 4096 TB OK', 'Dome uplink .......... LOCKED', 'Loading PAWN.SYS ..... OK'];
(async () => { const el = $('#boot-log'); for (const l of BOOT) { el.textContent += l + '\n'; await new Promise(r => setTimeout(r, 160)); } })();

const nameInput = $('#name-input');
nameInput.value = store.get('pawn-name') || '';
nameInput.addEventListener('input', () => store.set('pawn-name', nameInput.value.trim()));
const playerName = () => nameInput.value.trim() || 'Operator';
for (const b of document.querySelectorAll('#len-seg button')) b.addEventListener('click', () => {
  document.querySelectorAll('#len-seg button').forEach(x => x.classList.toggle('on', x === b)); app.maxDays = +b.dataset.len; sfx('click');
});
app.aiN = Math.max(0, Math.min(3, +(store.get('pawn-ai') || 0)));
for (const b of document.querySelectorAll('#ai-seg button')) {
  b.classList.toggle('on', +b.dataset.ai === app.aiN);
  b.addEventListener('click', () => { document.querySelectorAll('#ai-seg button').forEach(x => x.classList.toggle('on', x === b)); app.aiN = +b.dataset.ai; store.set('pawn-ai', String(app.aiN)); sfx('click'); });
}
if (store.get(SAVE_KEY)) $('#continue-btn').hidden = false;

$('#solo-btn').addEventListener('click', () => {
  sfx('click'); store.del(SAVE_KEY);
  app.mode = 'solo'; app.pid = 'me';
  app.sim = new TermSim({ maxDays: app.maxDays, mode: 'solo' });
  app.sim.addPlayer('me', playerName());
  for (let i = 0; i < app.aiN; i++) app.sim.addAI(i);
  app.sim.start(Date.now());
  startGame();
});
$('#continue-btn').addEventListener('click', () => {
  sfx('click');
  try { app.sim = TermSim.load(JSON.parse(store.get(SAVE_KEY))); app.mode = 'solo'; app.pid = 'me'; startGame(); }
  catch (e) { console.error(e); store.del(SAVE_KEY); $('#continue-btn').hidden = true; status($('#home-status'), 'Save file corrupted.', true); }
});
$('#host-btn').addEventListener('click', () => { sfx('click'); hostGame(); });
$('#join-form').addEventListener('submit', e => {
  e.preventDefault(); sfx('click');
  const code = $('#join-code').value.trim().toUpperCase();
  if (code.length !== 4) return status($('#home-status'), 'Room codes are 4 characters.', true);
  joinGame(code);
});
$('#join-code').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
$('#help-btn').addEventListener('click', () => { $('#help').hidden = false; paintIcons($('#help')); });
$('#help-close').addEventListener('click', () => { $('#help').hidden = true; });
$('#again-btn').addEventListener('click', () => { location.href = location.pathname; });

/* ============================================================ HOST / JOIN === */
function hostGame() {
  if (typeof Peer === 'undefined') return status($('#home-status'), 'Network library failed to load.', true);
  if (!app.maxDays) app.maxDays = 20;
  status($('#home-status'), 'Opening uplink...');
  app.mode = 'host'; app.pid = clientId();
  app.sim = new TermSim({ maxDays: app.maxDays, mode: 'mp' });
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
    $('#room-code').textContent = code; $('#join-url').value = joinUrl(code);
    $('#ready-btn').hidden = true; $('#start-btn').hidden = false;
    $('#lobby-len').textContent = `${app.maxDays} SOL CONTRACT`;
    setScreen('lobby'); paintIcons(); renderLobby();
  });
  host.on('join', (cid, name) => {
    app.sim.addPlayer(cid, name);
    if (app.started) { app.sim.setConnected(cid, true); pushViews(true); host.sendTo(cid, { t: 'start' }); note(`${name} reconnected.`, 'good'); }
    else { sfx('join'); renderLobby(); }
  });
  host.on('leave', cid => {
    if (!app.started) { delete app.lobbyReady[cid]; app.sim.removePlayer(cid); renderLobby(); }
    else { app.sim.setConnected(cid, false); note(`${app.sim.s.players[cid]?.name} disconnected.`, 'bad'); }
  });
  host.on('msg', (cid, msg) => {
    if (msg.t === 'ready' && !app.started) { app.lobbyReady[cid] = !!msg.v; sfx('ready'); renderLobby(); }
    else if (msg.t === 'act' && app.started) app.sim.act(cid, msg.a, Date.now());
  });
  host.on('error', err => {
    console.error(err);
    const m = err.type === 'network' || err.type === 'server-error' ? 'Cannot reach the matchmaking server.' : (err.message || 'Network error.');
    const sc = document.body.dataset.screen;
    if (sc === 'lobby') status($('#lobby-status'), m, true); else if (sc === 'boot') status($('#home-status'), m, true); else note(m, 'err');
  });
  host.open();
}
function renderLobby(players) {
  if (app.mode === 'host') {
    const S = app.sim.s;
    players = S.order.map(id => ({ pid: id, name: S.players[id].name, color: S.players[id].color, ready: id === app.pid || !!app.lobbyReady[id], host: id === app.pid }));
    app.host.broadcast({ t: 'lobby', players, maxDays: app.maxDays });
    const others = players.filter(p => !p.host);
    $('#start-btn').disabled = !(others.length >= 1 && others.every(p => p.ready));
    status($('#lobby-status'), others.length ? '' : 'Waiting for operators to connect.');
  }
  $('#roster').innerHTML = (players || []).map(p => `<li><span class="sw" style="background:${p.color}"></span>${esc(p.name)}${p.pid === app.pid ? ' (you)' : ''}<span class="tag ${p.ready ? 'ok' : ''}">${p.host ? 'HOST' : p.ready ? 'READY' : 'NOT READY'}</span></li>`).join('');
}
$('#start-btn').addEventListener('click', () => {
  if (app.mode !== 'host') return;
  sfx('click'); app.started = true; app.sim.start(Date.now()); app.host.broadcast({ t: 'start' }); startGame();
});
$('#copy-btn').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#join-url').value); $('#copy-btn').textContent = 'COPIED'; } catch { $('#join-url').select(); }
  setTimeout(() => ($('#copy-btn').textContent = 'COPY'), 1400);
});
$('#leave-btn').addEventListener('click', () => { location.href = location.pathname; });

let readyState = false;
function joinGame(code) {
  if (typeof Peer === 'undefined') return status($('#home-status'), 'Network library failed to load.', true);
  app.mode = 'client'; status($('#home-status'), 'Connecting...');
  const client = app.client = createClient({ slug: SLUG, code, name: playerName() });
  client.on('welcome', pid => {
    app.pid = pid;
    if (!app.started) {
      $('#room-code').textContent = code; $('#join-url').value = joinUrl(code);
      $('#start-btn').hidden = true; $('#ready-btn').hidden = false;
      setScreen('lobby'); paintIcons(); status($('#lobby-status'), '');
    }
  });
  client.on('msg', msg => {
    if (msg.t === 'lobby') { $('#lobby-len').textContent = `${msg.maxDays} SOL CONTRACT`; renderLobby(msg.players); }
    else if (msg.t === 'start') { if (!app.started) { app.started = true; startGame(); } }
    else if (msg.t === 'view') { if (!app.started) { app.started = true; startGame(); } setView(msg.v); }
  });
  client.on('rejected', r => { setScreen('boot'); status($('#home-status'), r, true); });
  client.on('disconnected', () => {
    if (app.started && app.view?.phase !== 'over') { note('Lost uplink to host. Reconnecting...', 'err'); setTimeout(() => { try { client.destroy(); } catch {} joinGame(code); }, 2000); }
    else if (!app.started) { setScreen('boot'); status($('#home-status'), 'The host closed the room.', true); }
  });
  client.on('error', err => { console.error(err); if (app.started) note(err.message || 'Network error.', 'err'); else { setScreen('boot'); status($('#home-status'), err.message || 'Network error.', true); } });
  client.connect();
}
$('#ready-btn').addEventListener('click', () => {
  readyState = !readyState; app.client.send({ t: 'ready', v: readyState });
  $('#ready-btn').textContent = readyState ? 'NOT READY' : 'READY'; sfx('ready');
});
const urlRoom = roomFromUrl();
if (urlRoom) {
  $('#join-code').value = urlRoom;
  if (store.get('pawn-name')) joinGame(urlRoom); else { status($('#home-status'), 'Enter your name, then JOIN.'); nameInput.focus(); }
}

/* ================================================================ ACTIONS === */
function act(a) {
  if (app.mode === 'client') app.client.send({ t: 'act', a });
  else { app.sim.act(app.pid, a, Date.now()); refreshLocal(); }
}
function refreshLocal() { if (app.mode === 'solo' || app.mode === 'host') setView(app.sim.viewFor(app.pid, Date.now())); }
let lastSend = 0;
function pushViews(force) {
  if (app.mode !== 'host') return;
  const now = Date.now();
  if (!force && !app.sim.dirty && now - lastSend < 1000) return;
  for (const pid of app.sim.s.order) if (pid !== app.pid && app.host.connected(pid)) app.host.sendTo(pid, { t: 'view', v: app.sim.viewFor(pid, now) });
  app.sim.dirty = false; lastSend = now;
}
let simTimer = null, savedFor = '';
function startGame() {
  setScreen('desk');
  buildDesk();
  if (app.mode !== 'client') {
    clearInterval(simTimer);
    simTimer = setInterval(() => {
      const now = Date.now();
      app.sim.tick(now); pushViews(); refreshLocal();
      if (app.mode === 'solo') autosave();
    }, 100);
    refreshLocal();
  }
  if (app.mode === 'host') addEventListener('beforeunload', e => { if (app.view?.phase !== 'over') { e.preventDefault(); e.returnValue = ''; } });
  setInterval(() => { if (document.body.dataset.screen === 'desk') renderAll(); }, 250);
  shell(`MARSNET SHELL. Operator ${playerName()} logged in.`, 'g');
  shell("Type 'help' for commands.", 'd');
}
function autosave() {
  const S = app.sim.s;
  if (S.phase === 'over') { store.del(SAVE_KEY); return; }
  if (S.phase !== 'evening') return;
  const key = S.day + ':' + S.fxId + ':' + S.players.me.cash;
  if (key === savedFor) return;
  savedFor = key; store.set(SAVE_KEY, JSON.stringify(app.sim.serialize()));
}

let prevPhase = null;
function setView(v) {
  if (!v) return;
  const first = !app.view;
  app.view = v; app.viewAt = performance.now();
  if (first) app.lastFx = v.fx.length ? v.fx[v.fx.length - 1].id : 0;
  for (const e of v.fx) if (e.id > app.lastFx) { app.lastFx = e.id; onFx(e); }
  if (v.phase !== prevPhase) onPhase(v.phase, prevPhase);
  prevPhase = v.phase;
  dirty = true;
}
const since = () => performance.now() - app.viewAt;
const remain = ms => Math.max(0, ms - since());

/* ============================================================== WINDOWS === */
const APPS = {
  counter: { title: 'AIRLOCK_CAM', ico: 'cam', label: 'AIRLOCK CAM', render: rCounter },
  intel: { title: 'INTEL.EXE', ico: 'intel', label: 'INTEL', render: rIntel },
  stock: { title: 'STOCK.DB', ico: 'stock', label: 'STOCK.DB', render: rStock },
  shell: { title: 'SHELL', ico: 'shell', label: 'SHELL', render: null },
  ledger: { title: 'LEDGER', ico: 'ledger', label: 'LEDGER', render: rLedger },
  admin: { title: 'ADMIN // SHOP OFFICE', ico: 'admin', label: 'ADMIN', render: rAdmin },
  net: { title: 'NETLINK', ico: 'net', label: 'NETLINK', render: rNet },
  guild: { title: 'GUILD_COMMS', ico: 'guild', label: 'GUILD', render: rGuild },
  report: { title: 'NIGHTLY_REPORT', ico: 'report', label: 'REPORT', render: rReport },
};
const wins = {};   // id -> { el, body, last, min }
let zTop = 10, dirty = true;
let layout = {};
try { layout = JSON.parse(store.get(LAYOUT_KEY) || '{}'); } catch {}

function defaultRect(id) {
  const W = innerWidth, H = innerHeight - 40, x0 = 96, y0 = 8, aw = W - x0 - 8, ah = H - y0 - 8;
  const c1 = Math.round(aw * 0.39), c2 = Math.round(aw * 0.35), c3 = aw - c1 - c2 - 16;
  const top = Math.round(ah * 0.6);
  const r = {
    counter: [x0, y0, c1, top], intel: [x0, y0 + top + 8, c1, ah - top - 8],
    stock: [x0 + c1 + 8, y0, c2, top], shell: [x0 + c1 + 8, y0 + top + 8, c2, ah - top - 8],
    ledger: [x0 + c1 + c2 + 16, y0, c3, ah],
  }[id];
  if (r) return { x: r[0], y: r[1], w: r[2], h: r[3] };
  const w = Math.min(560, aw - 40), h = Math.min(ah - 40, 520);
  const off = { admin: 0, net: 30, guild: 60, report: 90 }[id] || 0;
  return { x: Math.round(x0 + (aw - w) / 2 + off - 45), y: Math.round(y0 + (ah - h) / 2 + off / 2 - 20), w, h };
}

function buildDesk() {
  $('#icons').innerHTML = Object.entries(APPS).map(([id, a]) => `<button class="dico" data-open="${id}"><span data-ico="${a.ico}"></span>${a.label}</button>`).join('');
  paintIcons($('#icons')); paintIcons($('#bar'));
  ['counter', 'intel', 'stock', 'shell', 'ledger'].forEach(id => openWin(id, false));
  focusWin('counter');
}
function openWin(id, focus = true) {
  let w = wins[id];
  if (!w) {
    const a = APPS[id], r = layout[id] || defaultRect(id);
    const el = document.createElement('div');
    el.className = 'win desk-win'; el.dataset.win = id;
    el.innerHTML = `<div class="tb"><span class="tb-ico" data-ico="${a.ico}"></span><span class="tb-t">${a.title}</span><button class="tb-m" title="Minimize"></button><button class="tb-x" title="Close"></button></div><div class="wb"></div><div class="rs"></div>`;
    Object.assign(el.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
    $('#wins').appendChild(el); paintIcons(el);
    w = wins[id] = { el, body: el.querySelector('.wb'), last: '', min: false };
    el.addEventListener('mousedown', () => focusWin(id));
    el.querySelector('.tb-x').addEventListener('click', e => { e.stopPropagation(); closeWin(id); });
    el.querySelector('.tb-m').addEventListener('click', e => { e.stopPropagation(); minWin(id); });
    dragify(el, el.querySelector('.tb'), id, 'move'); dragify(el, el.querySelector('.rs'), id, 'size');
    if (id === 'shell') buildShell(w);
  }
  w.min = false; w.el.hidden = false;
  if (focus) focusWin(id);
  clampWin(id);
  dirty = true; renderAll();
  return w;
}
function closeWin(id) { const w = wins[id]; if (!w) return; w.el.remove(); delete wins[id]; renderTasks(); }
function minWin(id) { const w = wins[id]; if (!w) return; w.min = true; w.el.hidden = true; renderTasks(); }
function focusWin(id) {
  const w = wins[id]; if (!w) return;
  w.el.style.zIndex = ++zTop;
  for (const [k, x] of Object.entries(wins)) x.el.classList.toggle('focus', k === id);
  w.el.classList.remove('flash');
  renderTasks();
}
function flashWin(id) { const w = openWin(id, true); w.el.classList.remove('flash'); void w.el.offsetWidth; w.el.classList.add('flash'); }
function dragify(el, handle, id, mode) {
  handle.addEventListener('mousedown', e => {
    if (e.target.closest('button')) return;
    e.preventDefault(); focusWin(id);
    const sx = e.clientX, sy = e.clientY, r = el.getBoundingClientRect();
    const mv = ev => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (mode === 'move') { el.style.left = Math.round(r.left + dx) + 'px'; el.style.top = Math.max(0, Math.round(r.top + dy)) + 'px'; }
      else { el.style.width = Math.max(240, Math.round(r.width + dx)) + 'px'; el.style.height = Math.max(140, Math.round(r.height + dy)) + 'px'; }
    };
    const up = () => {
      removeEventListener('mousemove', mv); removeEventListener('mouseup', up); clampWin(id);
      layout[id] = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }; store.set(LAYOUT_KEY, JSON.stringify(layout));
    };
    addEventListener('mousemove', mv); addEventListener('mouseup', up);
  });
}
function clampWin(id) {
  const el = wins[id]?.el; if (!el) return;
  const W = innerWidth, H = innerHeight - 40;
  el.style.width = Math.min(el.offsetWidth, W - 8) + 'px'; el.style.height = Math.min(el.offsetHeight, H - 8) + 'px';
  el.style.left = Math.max(0, Math.min(el.offsetLeft, W - 80)) + 'px'; el.style.top = Math.max(0, Math.min(el.offsetTop, H - 30)) + 'px';
}
const clampWins = () => Object.keys(wins).forEach(clampWin);
$('#menu-btn').addEventListener('click', () => {
  sfx('click'); layout = {}; store.del(LAYOUT_KEY);
  for (const id of Object.keys(wins)) if (!['counter', 'intel', 'stock', 'shell', 'ledger'].includes(id)) closeWin(id);
  for (const id of ['counter', 'intel', 'stock', 'shell', 'ledger']) {
    const w = openWin(id, false), r = defaultRect(id);
    Object.assign(w.el.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
  }
  note('Windows tiled.', 'info');
});
$('#menu-btn').title = 'Tile windows (reset layout)';

function renderTasks() {
  const top = Object.entries(wins).sort((a, b) => (+b[1].el.style.zIndex) - (+a[1].el.style.zIndex))[0]?.[0];
  const al = alerts();
  $('#tasks').innerHTML = Object.entries(wins).map(([id, w]) => `<button class="task ${id === top && !w.min ? 'on' : ''} ${w.min ? 'min' : ''} ${al[id] ? 'alert' : ''}" data-task="${id}"><span data-ico="${APPS[id].ico}"></span>${APPS[id].label}</button>`).join('');
  paintIcons($('#tasks'));
  document.querySelectorAll('.dico').forEach(b => b.classList.toggle('alert', !!al[b.dataset.open]));
}
function alerts() {
  const v = app.view; if (!v) return {};
  return {
    counter: !!((v.seller && !v.seller.done && !v.seller.st.out) || (v.buyer && !v.buyer.done && !v.buyer.st.out)),
    guild: guildPending(), report: v.phase === 'evening' && !v.me.ready,
    stock: v.phase === 'noon' && !v.me.ready,
  };
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-task]');
  if (t) { const id = t.dataset.task, w = wins[id]; sfx('click'); if (w.min) openWin(id); else if (+w.el.style.zIndex === zTop) minWin(id); else focusWin(id); return; }
  const o = e.target.closest('[data-open]');
  if (o) { sfx('open'); openWin(o.dataset.open); }
});

/* Patch a window body, keeping typed input values and focus. */
function patch(w, html) {
  if (html == null || html === w.last) return false;
  const keep = {};
  let focusKey = null, sel = null;
  w.body.querySelectorAll('input[data-k]').forEach(i => {
    if (i.dataset.touched || i === document.activeElement) keep[i.dataset.k] = i.value;
    if (i === document.activeElement) { focusKey = i.dataset.k; try { sel = [i.selectionStart, i.selectionEnd]; } catch {} }
  });
  const st = w.body.scrollTop;
  w.body.innerHTML = html; w.last = html;
  w.body.querySelectorAll('input[data-k]').forEach(i => {
    if (i.dataset.k in keep) { i.value = keep[i.dataset.k]; i.dataset.touched = '1'; }
    if (i.dataset.k === focusKey) { i.focus(); try { if (sel) i.setSelectionRange(...sel); } catch {} }
  });
  w.body.scrollTop = st;
  w.body.querySelectorAll('canvas[data-por]').forEach(drawPortrait);
  return true;
}
document.addEventListener('input', e => { if (e.target.dataset.k) e.target.dataset.touched = '1'; });

function renderAll() {
  if (!app.view) return;
  for (const [id, w] of Object.entries(wins)) {
    if (w.min || !APPS[id].render) continue;
    patch(w, APPS[id].render(app.view));
  }
  renderTray();
  if (dirty) { renderTasks(); dirty = false; }
}

/* ============================================================== PORTRAITS === */
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
function drawPortrait(cv) {
  const prof = cv.dataset.por, seed = +cv.dataset.seed;
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, cv.width, cv.height);
  const L = customerLook(prof, seed), k = PROFILES[prof]?.kind, t = performance.now();
  const x = 18, y = 59;
  if (k === 'astro' || k === 'prospector') drawChar(g, 'astro', x, y, L, 0, 1, {});
  else if (k === 'grey' || k === 'glorp' || k === 'zix') drawChar(g, k, x, y, L, 0, 1, {}, t);
  else drawChar(g, 'person', x, y, L, 0, 1, { monocle: !!L.monocle, glasses: !!L.glasses });
}
const portrait = (prof, seed) => `<canvas data-por="${prof}" data-seed="${seed}" width="72" height="128"></canvas>`;
const img = (id, s = 4) => `<img src="${itemIcon(id, s)}" alt="" class="pix">`;
const tierTag = t => t < 0 ? '<span class="tier dim">UNKNOWN</span>' : `<span class="tier" style="color:${TIERS[t].col}">${TIERS[t].n.toUpperCase()}</span>`;
const estTxt = e => `${money(e.lo)} - ${money(e.hi)}`;

/* ================================================================ APPS === */
function phaseName(v) { return { dawn: 'DAWN', buy: 'MORNING: SELLERS', noon: 'MIDDAY: PRICING', sell: 'AFTERNOON: BUYERS', evening: 'EVENING', over: 'CLOSED' }[v.phase] || v.phase; }
const strikes = (n, max) => `<span class="strikes">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
function patience(left, total = 16000) {
  const pct = Math.max(0, Math.min(100, left / total * 100));
  return `<div class="bar ${pct < 30 ? 'low' : ''}"><i style="width:${pct}%"></i></div>`;
}
function memTxt(m) {
  if (!m) return '';
  const part = (l, r) => r ? `${l} ${money(r.price)} (${COND[r.cond].n}, sol ${r.day})` : '';
  const b = [part('Last sold', m.sale), part('You paid', m.paid), part('Wholesale', m.dump)].filter(Boolean);
  return b.length ? `<div class="mem">${b.join(' &middot; ')}</div>` : '';
}

function rCounter(v) {
  const c = v.phase === 'buy' ? v.seller : v.phase === 'sell' ? v.buyer : null;
  if (!c) {
    let msg = { dawn: 'Airlock cycling. Shop opens shortly.', noon: 'Doors sealed for midday pricing. Set shelf prices in STOCK.DB, then open the doors.', evening: 'Airlock sealed for the night. Check the NIGHTLY_REPORT.', over: 'Contract complete.' }[v.phase] || 'Nobody in the airlock.';
    const btn = v.phase === 'noon' ? `<div class="row"><button class="btn pri" data-a="ready" ${v.me.ready ? 'disabled' : ''}>${v.me.ready ? 'WAITING FOR OTHER SHOPS' : '&gt; OPEN DOORS'}</button></div>` : '';
    const q = v.queue ? `<div class="dim">${v.queue} in the queue.</div>` : '';
    return `<div class="cam"><div class="portrait static"><span class="rec">REC</span><span class="cam-id">CAM 01</span></div><div><div class="who-n">${phaseName(v)}</div><p>${msg}</p>${q}${btn}</div></div>`;
  }
  const P = PROFILES[c.prof], who = citizen(c.prof, c.look);
  const openIn = remain(c.openIn), left = remain(c.left), excl = remain(c.excl);
  const tags = (c.hard ? '<span class="tag hard">DESPERATE</span>' : '') + (c.loan ? '<span class="tag loan">PAWN LOAN</span>' : '') + (c.forMe ? '<span class="tag mine">YOUR AD</span>' : '');
  const head = `<div class="who-n">${esc(P.name.toUpperCase())}${tags}</div><div class="who-t">${esc(c.hard ? 'Down on their luck and needs credits fast.' : P.tell)}</div>`;
  const pv = `<div class="portrait ${openIn > 0 ? 'static' : ''}"><span class="rec">REC</span><span class="cam-id">${esc(who.id)}</span>${portrait(c.prof, c.look)}</div>`;
  let body = '';
  if (openIn > 0) body = '<p class="dim">Airlock cycling...</p>';
  else if (c.done) {
    const o = c.outcome || {}, mine = o.pid === app.pid;
    const nm = v.players.find(p => p.pid === o.pid)?.name;
    const res = o.type === 'left' ? 'Left the shop.' : mine ? 'Deal closed with you.' : `Closed a deal with ${esc(nm || 'a rival')}.`;
    body = `<div class="say">${esc(c.st.msg || o.text || '')}</div><div class="${mine ? 'good' : 'dim'}">${res}</div>`;
  } else {
    const st = c.st;
    if (v.phase === 'buy') {
      const line = st.msg || say(c.prof, c.loan ? 'loanAsk' : 'ask', { p: c.ask }, c.look);
      const sc = v.intel?.scans[c.uid];
      const dis = st.out || excl > 0 ? 'disabled' : '';
      body = `<div class="say" data-say>${esc(line)}</div>
        <div class="item">${img(c.itemId)}<div><div class="nm">${esc(ITEMS[c.itemId].n)}</div>
          <div>${COND[c.cond].n} &middot; ${tierTag(c.est.tier)} &middot; <span class="dim">${esc(ITEMS[c.itemId].cat)}</span></div>
          <div>Appraisal: <span class="cy">${estTxt(c.est)}</span>${c.est.fake ? ' <span class="bad">LIKELY FAKE</span>' : ''}</div>
          ${sc ? `<div>Scan: <span class="${sc.verdict === 'COUNTERFEIT' ? 'bad' : 'good'}">${sc.verdict}</span> ${money(sc.lo)} - ${money(sc.hi)}</div>` : ''}
          ${memTxt(c.mem)}</div></div>
        <div class="kv"><span>${c.loan ? 'Wants to borrow' : 'Asking'}</span><span class="gold">${money(c.ask)}${c.ask < c.startAsk ? ` <span class="dim">(was ${money(c.startAsk)})</span>` : ''}</span>
          ${c.loan ? `<span>Terms</span><span>repays +${Math.round(c.loan.rate * 100)}% in ${c.loan.days} sols</span>` : ''}
          <span>Lowballs</span><span>${strikes(st.strikes, c.lim)}</span></div>
        ${patience(left)}
        ${excl > 0 ? `<div class="amb">Came for ${esc(c.forName)}'s ad. Wait ${Math.ceil(excl / 1000)}s.</div>` : ''}
        <div class="offer"><input class="field" type="number" min="1" data-k="offer-${c.id}" id="offer-in" placeholder="offer" value="${Math.round(c.ask * 0.6)}" ${dis}>
          <button class="btn pri" data-a="offer" ${dis}>OFFER</button><button class="btn" data-a="take" ${dis}>${c.loan ? 'LEND' : 'PAY'} ${money(c.ask)}</button><button class="btn warn" data-a="pass" ${dis}>PASS</button></div>
        <div class="offer"><button class="btn sm" data-a="scan" ${dis || (sc ? 'disabled' : '')}>SCAN <span class="c">${COST.scan}</span></button><button class="btn sm" data-a="dossier" ${dis || (v.intel?.dossier ? 'disabled' : '')}>DOSSIER <span class="c">${COST.dossier}</span></button></div>
        ${c.hint ? `<div class="hint">${esc(c.hint)}</div>` : ''}`;
    } else {
      const line = st.msg || say(c.prof, 'want', { c: c.cat === 'any' ? 'anything good' : c.cat }, c.look);
      const elig = v.me.inv.filter(i => c.eligible.includes(i.uid));
      const dis = st.out || excl > 0 ? 'disabled' : '';
      body = `<div class="say" data-say>${esc(line)}</div>
        <div class="kv"><span>Wants</span><span class="amb">${esc(c.cat === 'any' ? 'ANYTHING' : c.cat)}</span><span>Strikes</span><span>${strikes(st.strikes, c.lim)}</span><span>Pitches</span><span>${st.pitches}/5</span></div>
        ${patience(left, 15000)}
        ${excl > 0 ? `<div class="amb">Came for ${esc(c.forName)}'s shop. Wait ${Math.ceil(excl / 1000)}s.</div>` : ''}
        ${st.counter ? `<div class="row"><span>Counter-offer: <b class="gold">${money(st.counter.price)}</b></span><button class="btn pri" data-a="takeCounter" ${dis}>ACCEPT</button></div>` : ''}
        <div class="sec">YOUR MATCHING STOCK</div>
        ${elig.length ? elig.map(i => `<div class="pitch">${img(i.id, 3)}<div>${esc(ITEMS[i.id].n)}<div class="dim">${COND[i.cond].n} &middot; paid ${money(i.paid)} &middot; est ${estTxt(i.est)}</div></div>
          <input class="field" type="number" min="1" data-k="pitch-${c.id}-${i.uid}" data-pitch="${i.uid}" value="${Math.round((i.price || i.est.hi))}" ${dis}><button class="btn" data-a="pitch" data-uid="${i.uid}" ${dis}>PITCH</button></div>`).join('')
        : '<div class="empty">Nothing in stock they want.</div>'}
        <div class="offer"><button class="btn sm" data-a="dossier" ${dis || (v.intel?.dossier ? 'disabled' : '')}>DOSSIER <span class="c">${COST.dossier}</span></button><button class="btn warn sm" data-a="pass" ${dis}>PASS</button></div>
        ${c.hint ? `<div class="hint">${esc(c.hint)}</div>` : ''}`;
    }
    if (c.feed?.length) body += `<div class="feed">${c.feed.map(esc).join('<br>')}</div>`;
  }
  return `<div class="cam">${pv}<div>${head}${body}</div></div>`;
}

let lastScan = null;
function rIntel(v) {
  const I = v.intel || { scans: {} };
  let h = '<div class="sec">SPECTRO SCANNER</div>';
  const uid = v.seller && !v.seller.done && v.seller.uid in I.scans ? v.seller.uid : lastScan && I.scans[lastScan] ? lastScan : null;
  const s = uid && I.scans[uid];
  if (s) {
    const fake = s.verdict === 'COUNTERFEIT';
    h += `<div class="item">${img(s.itemId, 3)}<div><div class="nm">${esc(ITEMS[s.itemId].n)}</div><div class="verdict ${fake ? 'bad' : 'good'}">${s.verdict}</div></div></div>
      <div class="spec ${fake ? 'fake' : ''}">${s.sig.map(x => `<i style="height:${x * 5}px"></i>`).join('')}</div>
      <div class="kv"><span>Value</span><span class="cy">${money(s.lo)} - ${money(s.hi)}</span><span>Tier</span><span>${tierTag(s.tier)}</span><span>Confidence</span><span>${s.conf}%</span></div>
      <div class="dim">${s.notes.map(esc).join('<br>')}</div>`;
  } else h += `<div class="dim">No scan loaded. Scan the counter item (${COST.scan} CR, costs the seller 3s of patience) or any item in STOCK.DB.</div>`;
  if (v.seller && !v.seller.done && !(v.seller.uid in I.scans)) h += `<div class="row"><button class="btn" data-a="scan">SCAN COUNTER ITEM <span class="c">${COST.scan}</span></button></div>`;
  h += '<div class="sec">COLONY RECORDS</div>';
  const d = I.dossier;
  if (d) {
    h += `<div class="dossier">${portrait(d.prof, d.look)}<div><div class="who-n">${esc(d.name)}</div><div class="idcard">ID ${esc(d.cid)}<br>CLASS ${esc(d.kind.toUpperCase())}</div>
      ${d.lines.map(l => `<div class="${l.startsWith('FLAG') ? 'flag' : ''}">${esc(l)}</div>`).join('')}</div></div>`;
  } else {
    const c = v.seller && !v.seller.done ? v.seller : v.buyer && !v.buyer.done ? v.buyer : null;
    h += c ? `<div class="dim">No record pulled for the current customer.</div><div class="row"><button class="btn" data-a="dossier">PULL DOSSIER <span class="c">${COST.dossier}</span></button></div>` : '<div class="dim">No customer at the counter.</div>';
  }
  return h;
}

let stockSel = null;
function rStock(v) {
  const me = v.me;
  let h = `<div class="row" style="margin-top:0"><span>${me.inv.length}/${me.cap} slots</span>
    <button class="btn sm" data-a="autoall">AUTO-PRICE ALL</button><button class="btn sm" data-a="markdown">MARK DOWN 10%</button>
    ${v.phase === 'noon' ? `<button class="btn pri sm" data-a="ready" ${me.ready ? 'disabled' : ''}>${me.ready ? 'WAITING' : '&gt; OPEN DOORS'}</button>${v.left ? `<span class="amb">${Math.ceil(remain(v.left) / 1000)}s</span>` : ''}` : ''}</div>`;
  if (v.phase === 'noon') h += '<div class="hint">Midday: walk-ins buy anything priced below what they would pay. Blank price = held back.</div>';
  if (!me.inv.length) h += '<div class="empty">Stock is empty. Buy from sellers in the morning.</div>';
  else {
    h += `<table class="stock"><tr><th>#</th><th></th><th>ITEM</th><th>EST</th><th>PAID</th><th>SHELF</th><th></th></tr>`;
    me.inv.forEach((i, n) => {
      const sc = v.intel?.scans[i.uid];
      const fake = i.est.fake || sc?.verdict === 'COUNTERFEIT';
      h += `<tr class="${stockSel === i.uid ? 'sel' : ''}"><td class="dim">${n + 1}</td><td>${img(i.id, 2)}</td>
        <td>${esc(ITEMS[i.id].n)}${fake ? ' <span class="chip bad">FAKE</span>' : ''}<div class="dim">${COND[i.cond].n} &middot; ${tierTag(i.est.tier)}</div></td>
        <td class="cy">${sc ? `${money(sc.lo)}-${money(sc.hi)}` : estTxt(i.est)}</td><td>${money(i.paid)}</td>
        <td><input class="field" type="number" min="1" placeholder="held" data-k="pr-${i.uid}-${i.price}" data-price="${i.uid}" value="${i.price ?? ''}"></td>
        <td class="acts"><button class="btn sm" data-a="hold" data-uid="${i.uid}" title="Hold back">${i.price == null ? 'AUTO' : 'HOLD'}</button>
          <button class="btn sm" data-a="scanInv" data-uid="${i.uid}" ${sc ? 'disabled' : ''} title="Scan ${COST.scan} CR">SCAN</button>
          <button class="btn sm warn" data-a="dump" data-uid="${i.uid}" title="Sell to wholesaler">DUMP</button></td></tr>`;
    });
    h += '</table>';
  }
  if (me.loans.length) {
    h += '<div class="sec">PAWN LOANS OUT</div>' + me.loans.map(l => `<div class="pitch">${img(l.itemId, 2)}<div>${esc(ITEMS[l.itemId].n)}<div class="dim">lent ${money(l.amount)}, owed ${money(l.back)} on sol ${l.due}</div></div><span></span><span></span></div>`).join('');
  }
  return h;
}

function rLedger(v) {
  const me = v.me;
  let h = `<div class="sec">SOL ${v.day}${v.maxDays ? ' / ' + v.maxDays : ''} &middot; ${phaseName(v)}</div>
    <div class="kv"><span>Credits</span><span class="gold">${money(me.cash)}</span><span>Stock</span><span>${me.inv.length}/${me.cap}</span>
    <span>Bought</span><span>${me.stats.bought}</span><span>Sold</span><span>${me.stats.sold}</span><span>Insurance</span><span>${INSURANCE[me.insurance].name}${me.premium ? ` (${money(me.premium)}/night)` : ''}</span></div>`;
  if (v.event) h += `<div class="sec">MARKET FEED</div><div class="${v.event.mod > 1 ? 'good' : 'bad'}">${esc(v.event.cat)} ${v.event.mod > 1 ? 'are in demand' : 'are out of favor'} (${v.event.mod > 1 ? '+' : ''}${Math.round((v.event.mod - 1) * 100)}%).</div>`;
  const m = v.mods || {};
  if (m.pact || m.boost || m.blackout) {
    h += '<div class="sec">GUILD EFFECTS</div>';
    if (m.pact) h += `<div>Price pact until sol ${m.pact.until}: ${m.pact.bonus >= 0 ? '+' : ''}${m.pact.bonus}% for you.</div>`;
    if (m.boost) h += `<div class="good">Grid boost until sol ${m.boost}.</div>`;
    if (m.blackout) h += `<div class="bad">Blackout on sol ${m.blackout}.</div>`;
  }
  if (v.players.length > 1) {
    h += '<div class="sec">COLONY STANDINGS</div>' + [...v.players].sort((a, b) => b.cash - a.cash).map(p => `<div class="kv" style="grid-template-columns:14px 1fr auto"><span class="sw" style="background:${p.color}"></span>
      <span style="color:var(--ink)">${esc(p.name)}${p.pid === app.pid ? ' (you)' : ''}${p.ai ? ' <span class="dim">AI</span>' : ''}${p.bankrupt ? ' <span class="bad">BANKRUPT</span>' : !p.connected ? ' <span class="dim">offline</span>' : ''}${(v.phase === 'evening' || v.phase === 'noon') && p.ready ? ' <span class="good">ready</span>' : ''}</span>
      <span class="gold">${money(p.cash)}</span></div>`).join('');
  }
  if (v.log.length) h += '<div class="sec">COLONY LOG</div><div class="dim">' + v.log.slice().reverse().map(esc).join('<br>') + '</div>';
  return h;
}

let adminTab = 'up';
function rAdmin(v) {
  const me = v.me, eve = v.phase === 'evening';
  let h = `<div class="tabs">${[['up', 'UPGRADES'], ['staff', 'STAFF'], ['ins', 'INSURANCE']].map(([k, l]) => `<button class="${adminTab === k ? 'on' : ''}" data-a="tab" data-tab="${k}">${l}</button>`).join('')}</div>`;
  if (!eve) h += '<div class="amb">Changes can only be made in the evening.</div>';
  h += `<div class="dim">Credits: <span class="gold">${money(me.cash)}</span></div>`;
  if (adminTab === 'ins') {
    h += INSURANCE.map(I => `<div class="upg"><span>${I.name}${me.insurance === I.id ? ' <span class="good">ACTIVE</span>' : ''}</span>
      <button class="btn sm" data-a="insure" data-lv="${I.id}" ${!eve || me.insurance === I.id ? 'disabled' : ''}>SELECT</button><div class="d">${esc(I.desc)}</div></div>`).join('');
    return h;
  }
  for (const u of UPGRADES.filter(u => (adminTab === 'staff') === !!u.staff)) {
    const lv = me.up[u.id], max = u.cost.length, cost = u.cost[lv];
    h += `<div class="upg"><span>${u.name} <span class="lv">${Array.from({ length: max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</span>${u.staff ? ` <span class="dim">${money(u.wage)}/sol each</span>` : ''}</span>
      <span><button class="btn sm" data-a="upgrade" data-id="${u.id}" ${!eve || lv >= max || me.cash < cost ? 'disabled' : ''}>${lv >= max ? 'MAX' : (u.staff ? 'HIRE ' : 'BUY ') + money(cost)}</button>
      <button class="btn sm warn" data-a="downgrade" data-id="${u.id}" ${!eve || !lv ? 'disabled' : ''}>${u.staff ? 'LET GO' : 'SELL'}</button></span>
      <div class="d">${esc(u.desc)}</div></div>`;
  }
  return h;
}

let hackLog = '';
function rNet(v) {
  const I = v.intel || { files: {}, hacksLeft: 0 };
  const open = v.phase === 'noon' || v.phase === 'evening';
  const rivals = v.players.filter(p => p.pid !== app.pid && !p.bankrupt);
  let h = `<div class="kv"><span>Uplink</span><span class="${open ? 'good' : 'bad'}">${open ? 'ONLINE' : 'OFFLINE (shop is open)'}</span><span>Breaches left</span><span>${I.hacksLeft} this sol</span><span>Cost</span><span>${COST.hack} CR per attempt</span></div>
    <div class="dim">Rival Security upgrades make breaches harder. Traced breaches are fined and the target learns your name.</div>
    <div class="hacklog">${esc(hackLog)}</div>`;
  if (!rivals.length) return h + '<div class="empty">No rival shops on the network.</div>';
  for (const p of rivals) {
    const f = I.files[p.pid] || {};
    const dis = !open || I.hacksLeft <= 0 || hackBusy ? 'disabled' : '';
    h += `<div class="target"><h4><span class="sw" style="background:${p.color}"></span>${esc(p.name)}${p.ai ? ' <span class="dim">AI</span>' : ''} <span class="dim">SEC ${p.up.security}</span></h4>
      <div class="offer"><button class="btn sm" data-a="hack" data-t="${p.pid}" data-kind="books" ${dis}>BREACH BOOKS</button>
      <button class="btn sm" data-a="hack" data-t="${p.pid}" data-kind="guild" ${dis || (I.guildOpen ? '' : 'disabled')}>INTERCEPT GUILD VOTE</button></div>`;
    if (f.books) {
      const b = f.books;
      h += `<div class="file">BOOKS (sol ${b.day}): <span class="gold">${money(b.cash)}</span>, ${b.n} items, ${b.loans} loans out, insurance ${INSURANCE[b.insurance].name}
        <div class="mini">${b.inv.map(i => `<span title="${esc(ITEMS[i.id].n)}: paid ${money(i.paid)}, shelf ${i.price == null ? 'held' : money(i.price)}${i.fake ? ', FAKE' : ''}">${img(i.id, 2)}</span>`).join('')}</div>
        <div class="dim">${b.inv.map(i => `${esc(ITEMS[i.id].n)}: paid ${money(i.paid)}, shelf ${i.price == null ? 'held' : money(i.price)}${i.fake ? ' <span class="bad">FAKE</span>' : ''}`).join('<br>')}</div>
        <div class="dim">Upgrades: ${UPGRADES.filter(u => b.up[u.id]).map(u => `${u.name} ${b.up[u.id]}`).join(', ') || 'none'}</div></div>`;
    }
    if (f.guild) h += `<div class="file">GUILD (sol ${f.guild.day}, ${esc(f.guild.title)}): ${f.guild.answer == null ? 'no sealed answer yet' : `sealed answer: <span class="amb">${esc(f.guild.answer)}</span>`}</div>`;
    h += '</div>';
  }
  return h;
}

function guildPending() { const g = app.view?.guild; return !!(g && g.myTurn && !app.view.me.bankrupt); }
function rGuild(v) {
  const g = v.guild;
  if (!g || v.phase !== 'evening') return '<div class="empty">No Guild notices. The Pawn Guild posts every 5 sols when two or more shops are open.</div>';
  const secs = g.left ? Math.ceil(remain(g.left) / 1000) : 0;
  let h = `<div class="sec">PAWN GUILD NOTICE${secs ? `<span class="timer">${secs}s</span>` : ''}</div><div class="who-n">${esc(g.title.toUpperCase())}</div><p class="g-text">${esc(g.text)}</p>`;
  if (g.offer) h += `<div class="amb">The leading shop keeps ${money(g.offer.keep)}. Every other shop gets ${money(g.offer.each)}.</div>`;
  if (g.stage !== 'reveal') {
    if (g.myTurn) {
      const inp = g.input;
      if (g.id === 'gift' && g.stage === 'choose') h += '<div class="amb">You lead the colony. You decide the split.</div>';
      if (inp.kind === 'number') {
        const money_ = g.id !== 'supply';
        h += `<div class="offer"><span>${esc(inp.label)} ${money_ && g.id !== 'gift' ? `(you have ${money(inp.max)})` : `(0-${inp.max})`}</span></div>
          <div class="offer"><input class="field" type="number" min="0" max="${inp.max}" data-k="g-${g.id}-${g.stage}" id="g-in" value="${Math.min(inp.max, inp.suggest || 0)}"><button class="btn pri" data-a="guildNum">SEAL ANSWER</button></div>`;
      } else if (inp.kind === 'choice') h += `<div class="g-opts">${inp.options.map(([k, l]) => `<button class="btn" data-a="guild" data-v="${k}">${esc(l)}</button>`).join('')}</div>`;
      else if (inp.kind === 'target') h += `<div class="dim">Report which shop?</div><div class="g-opts">${(g.targets || []).map(t => `<button class="btn" data-a="guild" data-v="${t.pid}">${esc(t.name)}</button>`).join('')}<button class="btn" data-a="guild" data-v="none">Nobody</button></div>`;
    } else h += `<div class="dim">${g.chosen || g.isProposer ? 'Your answer is sealed. ' : ''}Waiting on ${g.waiting} shop${g.waiting === 1 ? '' : 's'}...</div>`;
    h += '<div class="hint">Tip: NETLINK can intercept a rival\'s sealed answer before the reveal.</div>';
  } else {
    const R = g.result;
    h += `<div class="sec">SEALED ANSWERS</div>${R.reveal.map((t, i) => `<div class="g-card" style="--i:${i}">${esc(t)}</div>`).join('')}
      <div class="sec">OUTCOME</div>${R.pub.map(t => `<div class="g-pub">${esc(t)}</div>`).join('')}${R.mine.map(t => `<div class="g-mine">${esc(t)}</div>`).join('')}`;
  }
  return h;
}

function rReport(v) {
  const s = v.me.summary;
  if (v.phase !== 'evening' || !s) return '<div class="empty">The nightly report is filed when the shop closes.</div>';
  const line = (l, x, cls = '') => `<span>${l}</span><span class="${cls}">${x}</span>`;
  const list = (arr, f) => arr.map(f).join('<br>');
  const net = s.cash - s.startCash;
  let h = `<div class="sec">SOL ${v.day} CLOSING</div><div class="kv">
    ${line('Opened with', money(s.startCash))}${line('Closing cash', money(s.cash), 'gold')}${line('Net today', (net >= 0 ? '+' : '') + money(net), net >= 0 ? 'good' : 'bad')}
    ${line('Dome rent', '-' + money(s.rent), 'bad')}${s.wages ? line('Staff wages', '-' + money(s.wages), 'bad') : ''}${s.premium ? line('Insurance', '-' + money(s.premium), 'bad') : ''}
    ${line('Walk-in shoppers', `${s.browsers} browsed, ${s.walkins.length} bought`)}</div>`;
  if (s.bought.length) h += `<div class="sec">BOUGHT</div>${list(s.bought, b => `${esc(ITEMS[b.id].n)} for ${money(b.price)}`)}`;
  const sold = [...s.sold, ...s.walkins];
  if (sold.length) h += `<div class="sec">SOLD</div>${list(sold, b => `${esc(ITEMS[b.id].n)} for ${money(b.price)} <span class="${b.price >= b.paid ? 'good' : 'bad'}">(${b.price >= b.paid ? '+' : ''}${money(b.price - b.paid)})</span>`)}`;
  if (s.dumped.length) h += `<div class="sec">WHOLESALE</div>${list(s.dumped, b => `${esc(ITEMS[b.id].n)} for ${money(b.price)}`)}`;
  const ev = [];
  for (const l of s.loans) ev.push(l.kind === 'repaid' ? `<span class="good">Loan repaid: +${money(l.back)} (${esc(ITEMS[l.id].n)})</span>` : `<span class="amb">Loan forfeited: ${esc(ITEMS[l.id].n)} is yours.</span>`);
  if (s.stolen != null) ev.push(`<span class="bad">Break-in: ${esc(ITEMS[s.stolen].n)} was stolen.</span>`);
  if (s.damaged) ev.push(`<span class="bad">Accident: ${esc(ITEMS[s.damaged.id].n)} damaged to ${COND[s.damaged.cond].n}.</span>`);
  for (const c of s.claims) ev.push(`<span class="good">Insurance paid ${money(c.pay)} for ${c.kind}.</span>`);
  for (const r of s.restored) ev.push(`<span class="cy">Restored ${esc(ITEMS[r.id].n)} to ${COND[r.cond].n}.</span>`);
  for (const f of s.forced) ev.push(`<span class="bad">Repo: ${esc(ITEMS[f.id].n)} liquidated for ${money(f.price)}.</span>`);
  if (s.pactFine) ev.push(`<span class="bad">Guild inspectors fined you ${money(s.pactFine)}.</span>`);
  if (ev.length) h += `<div class="sec">OVERNIGHT</div>${ev.join('<br>')}`;
  if (v.me.bankrupt) h += '<div class="sec bad">BANKRUPT</div><div>Your shop is closed. You can keep watching.</div>';
  const gp = guildPending();
  const secs = v.left ? Math.ceil(remain(v.left) / 1000) : 0;
  h += `<div class="row"><button class="btn" data-open="admin">ADMIN</button><button class="btn" data-open="net">NETLINK</button>${v.guild ? '<button class="btn" data-open="guild">GUILD</button>' : ''}
    <button class="btn pri" data-a="ready" ${v.me.ready || gp || v.me.bankrupt ? 'disabled' : ''}>${v.me.ready ? 'WAITING FOR OTHERS' : gp ? 'ANSWER THE GUILD FIRST' : '&gt; END SOL'}</button>${secs ? `<span class="amb">${secs}s</span>` : ''}</div>`;
  return h;
}

function renderTray() {
  const v = app.view;
  $('#t-sol').textContent = `SOL ${v.day}${v.maxDays ? '/' + v.maxDays : ''}`;
  $('#t-phase').textContent = phaseName(v);
  const c = $('#t-cash'), txt = money(v.me.cash);
  if (c.textContent !== txt) { if (c.textContent) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); } c.textContent = txt; }
  $('#t-event').textContent = v.event ? `${v.event.cat.toUpperCase()} ${v.event.mod > 1 ? 'HOT' : 'COLD'}` : '';
  $('#t-mute').textContent = isMuted() ? 'SND OFF' : 'SND ON';
}
$('#t-mute').addEventListener('click', () => { setMuted(!isMuted()); renderTray(); });

/* ===================================================== CLICK DELEGATION === */
const inWin = (el, sel) => el.closest('.desk-win')?.querySelector(sel);
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]');
  if (!b || b.disabled) return;
  const a = b.dataset.a, v = app.view;
  sfx('click');
  switch (a) {
    case 'offer': { const n = +inWin(b, '#offer-in')?.value; run(`offer ${n}`); break; }
    case 'take': run('take'); break;
    case 'pass': run('pass'); break;
    case 'scan': run('scan'); break;
    case 'dossier': run('dossier'); break;
    case 'pitch': { const inp = inWin(b, `[data-pitch="${b.dataset.uid}"]`); run(`pitch ${slotOf(b.dataset.uid)} ${+inp.value}`); break; }
    case 'takeCounter': run('accept'); break;
    case 'ready': run(v.phase === 'noon' ? 'open' : 'end'); break;
    case 'autoall': run('price all auto'); break;
    case 'markdown': run('markdown 10'); break;
    case 'hold': { const i = v.me.inv.find(x => x.uid === b.dataset.uid); run(`price ${slotOf(b.dataset.uid)} ${i?.price == null ? 'auto' : 'hold'}`); break; }
    case 'scanInv': run(`scan ${slotOf(b.dataset.uid)}`); break;
    case 'dump': stockSel = b.dataset.uid; run(`dump ${slotOf(b.dataset.uid)}`); break;
    case 'tab': adminTab = b.dataset.tab; break;
    case 'insure': run(`insure ${['none', 'basic', 'full'][+b.dataset.lv]}`); break;
    case 'upgrade': run(`upgrade ${b.dataset.id}`); break;
    case 'downgrade': run(`fire ${b.dataset.id}`); break;
    case 'hack': hackRun(b.dataset.t, b.dataset.kind); break;
    case 'guild': run(`guild ${b.dataset.v}`); break;
    case 'guildNum': run(`guild ${+inWin(b, '#g-in').value}`); break;
  }
  renderAll();
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !e.target.matches('input[data-k]')) return;
  const t = e.target;
  if (t.id === 'offer-in') { e.preventDefault(); run(`offer ${+t.value}`); }
  else if (t.dataset.pitch) { e.preventDefault(); run(`pitch ${slotOf(t.dataset.pitch)} ${+t.value}`); }
  else if (t.dataset.price) { e.preventDefault(); t.dataset.touched = ''; run(`price ${slotOf(t.dataset.price)} ${t.value === '' ? 'hold' : +t.value}`); }
  else if (t.id === 'g-in') { e.preventDefault(); run(`guild ${+t.value}`); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset?.price) { t.dataset.touched = ''; run(`price ${slotOf(t.dataset.price)} ${t.value === '' ? 'hold' : +t.value}`, true); }
});
const slotOf = uid => app.view.me.inv.findIndex(i => i.uid === uid) + 1;

let hackBusy = false;
async function hackRun(target, kind) {
  const p = app.view.players.find(x => x.pid === target);
  if (!p || hackBusy) return;
  hackBusy = true;
  const steps = [`> ssh ${p.name.toLowerCase().replace(/\s+/g, '')}@shopnet.tharsis`, '> probing ports ... 22 443 9001', kind === 'guild' ? '> sniffing guild relay ...' : '> dumping ledger tables ...', '> covering tracks ...'];
  hackLog = '';
  for (const s of steps) { hackLog += s + '\n'; renderAll(); sfx('tick'); await new Promise(r => setTimeout(r, 330)); }
  hackBusy = false;
  shell(`$ hack ${p.name} ${kind}`, 'd');
  act({ type: 'hack', target, kind });
  openWin('net');
}

/* ================================================================ SHELL === */
let shellOut = null;
const hist = []; let hi = 0;
function buildShell(w) {
  w.body.classList.add('shell');
  w.body.innerHTML = '<div class="shell-out"></div><div class="shell-in"><span>$</span><input spellcheck="false" autocomplete="off" aria-label="Command"></div>';
  const out = w.body.querySelector('.shell-out'), inp = w.body.querySelector('input');
  if (shellOut) out.innerHTML = shellOut.innerHTML;
  shellOut = out; out.scrollTop = out.scrollHeight;
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { const t = inp.value.trim(); inp.value = ''; if (t) { hist.push(t); hi = hist.length; run(t, false, true); } }
    else if (e.key === 'ArrowUp') { hi = Math.max(0, hi - 1); inp.value = hist[hi] || ''; e.preventDefault(); }
    else if (e.key === 'ArrowDown') { hi = Math.min(hist.length, hi + 1); inp.value = hist[hi] || ''; e.preventDefault(); }
  });
  w.body.addEventListener('mouseup', () => { if (!getSelection().toString()) inp.focus(); });
}
function shell(text, cls = '') {
  if (!shellOut) { shellOut = document.createElement('div'); }
  const d = document.createElement('div'); if (cls) d.className = cls; d.textContent = text;
  shellOut.appendChild(d);
  while (shellOut.children.length > 300) shellOut.firstChild.remove();
  shellOut.scrollTop = shellOut.scrollHeight;
}
const HELP = [
  ['offer N', 'offer N credits to the seller'], ['take', 'pay the asking price / lend'], ['pass', 'pass on this customer'],
  ['scan [#]', 'scan counter item, or stock slot #'], ['dossier', "pull the customer's colony record"],
  ['pitch # N', 'pitch stock slot # to the buyer at N'], ['accept', "accept the buyer's counter-offer"],
  ['price # N|hold|auto', "set slot #'s shelf price ('all' for every slot)"], ['markdown P', 'cut all shelf prices by P%'],
  ['dump #', 'sell slot # to the wholesaler'], ['inv', 'list stock'], ['open', 'open the doors after midday pricing'],
  ['end', 'end the sol (evening)'], ['upgrade ID', 'buy upgrade/hire (ids: ' + UPGRADES.map(u => u.id).join(' ') + ')'], ['fire ID', 'let staff go / sell back upgrade'],
  ['insure none|basic|full', 'set insurance'], ['hack NAME books|guild', 'breach a rival (midday/evening)'], ['guild VALUE', 'answer the Guild notice'],
  ['win NAME', 'open a window: ' + Object.keys(APPS).join(' ')], ['clear', 'clear the shell'],
];
function run(line, quiet = false, typed = false) {
  const v = app.view; if (!v) return;
  if (!quiet) shell('$ ' + line, typed ? '' : 'd');
  const [cmd, ...args] = line.trim().split(/\s+/);
  const c = (cmd || '').toLowerCase();
  const slot = s => { const n = parseInt(s, 10); const i = v.me.inv[n - 1]; if (!i) shell(`No item in slot ${s}.`, 'e'); return i; };
  const err = t => shell(t, 'e');
  switch (c) {
    case 'help': case '?': HELP.forEach(([k, d]) => shell(`  ${k.padEnd(24)} ${d}`, 'c')); return;
    case 'clear': if (shellOut) shellOut.innerHTML = ''; return;
    case 'offer': { const n = parseInt(args[0], 10); if (!(n > 0)) return err('usage: offer N'); return act({ type: 'offer', amt: n }); }
    case 'take': case 'pay': case 'lend': return act({ type: 'take' });
    case 'pass': return act({ type: 'pass' });
    case 'scan': {
      if (args[0]) { const i = slot(args[0]); if (i) { lastScan = i.uid; act({ type: 'scan', uid: i.uid }); } return; }
      if (v.seller) lastScan = v.seller.uid;
      return act({ type: 'scan' });
    }
    case 'dossier': case 'records': return act({ type: 'dossier' });
    case 'pitch': { const i = slot(args[0]); const n = parseInt(args[1], 10); if (!i) return; if (!(n > 0)) return err('usage: pitch # N'); return act({ type: 'pitch', uid: i.uid, price: n }); }
    case 'accept': return act({ type: 'takeCounter' });
    case 'price': {
      const val = (args[1] || '').toLowerCase();
      const pv = val === 'hold' ? null : val === 'auto' ? 'auto' : parseInt(val, 10);
      if (pv !== null && pv !== 'auto' && !(pv > 0)) return err('usage: price # N|hold|auto');
      const items = args[0] === 'all' ? v.me.inv : [slot(args[0])].filter(Boolean);
      items.forEach(i => act({ type: 'price', uid: i.uid, price: pv }));
      if (!quiet && items.length) shell(`Updated ${items.length} shelf price${items.length > 1 ? 's' : ''}.`, 'g');
      return;
    }
    case 'markdown': {
      const p = Math.max(1, Math.min(90, parseInt(args[0], 10) || 10));
      let n = 0;
      for (const i of v.me.inv) if (i.price != null) { act({ type: 'price', uid: i.uid, price: Math.max(1, Math.round(i.price * (1 - p / 100))) }); n++; }
      return shell(`Marked down ${n} item${n === 1 ? '' : 's'} by ${p}%.`, 'g');
    }
    case 'dump': { const i = slot(args[0]); if (i) act({ type: 'dump', uid: i.uid }); return; }
    case 'inv': case 'ls':
      if (!v.me.inv.length) return shell('(empty)', 'd');
      v.me.inv.forEach((i, n) => shell(`${String(n + 1).padStart(2)}  ${ITEMS[i.id].n.padEnd(30).slice(0, 30)} ${COND[i.cond].n.padEnd(7)} paid ${money(i.paid).padEnd(9)} shelf ${i.price == null ? 'held' : money(i.price)}`));
      return;
    case 'open': if (v.phase !== 'noon') return err('Doors are only opened at midday.'); return act({ type: 'ready' });
    case 'end': case 'sleep':
      if (v.phase !== 'evening') return err('You can only end the sol in the evening.');
      if (guildPending()) { flashWin('guild'); return err('Answer the Pawn Guild notice first.'); }
      return act({ type: 'ready' });
    case 'upgrade': case 'buy': case 'hire': { const u = UPGRADES.find(x => x.id === (args[0] || '').toLowerCase()); if (!u) return err('Unknown upgrade. ids: ' + UPGRADES.map(x => x.id).join(' ')); return act({ type: 'upgrade', id: u.id }); }
    case 'fire': case 'sell': { const u = UPGRADES.find(x => x.id === (args[0] || '').toLowerCase()); if (!u) return err('Unknown upgrade.'); return act({ type: 'downgrade', id: u.id }); }
    case 'insure': { const l = ['none', 'basic', 'full'].indexOf((args[0] || '').toLowerCase()); if (l < 0) return err('usage: insure none|basic|full'); return act({ type: 'insure', level: l }); }
    case 'hack': {
      const name = (args.slice(0, -1).join(' ') || args[0] || '').toLowerCase(), kind = (args[args.length - 1] || '').toLowerCase();
      const p = v.players.find(x => x.pid !== app.pid && x.name.toLowerCase().startsWith(name));
      if (!p || !['books', 'guild'].includes(kind)) return err('usage: hack NAME books|guild');
      return hackRun(p.pid, kind);
    }
    case 'guild': {
      const g = v.guild; if (!g || !g.myTurn) return err('No Guild notice waiting on you.');
      let val = args.join(' ');
      if (g.input.kind === 'number') val = parseInt(val, 10) || 0;
      else if (g.input.kind === 'target' && val !== 'none') { const p = (g.targets || []).find(t => t.pid === val || t.name.toLowerCase().startsWith(val.toLowerCase())); val = p ? p.pid : 'none'; }
      return act({ type: 'guild', value: val });
    }
    case 'win': case 'open-win': { const id = (args[0] || '').toLowerCase(); if (!APPS[id]) return err('Windows: ' + Object.keys(APPS).join(' ')); openWin(id); return; }
    case 'who': {
      const c2 = v.seller || v.buyer; if (!c2) return shell('Nobody at the counter.', 'd');
      shell(`${PROFILES[c2.prof].name}: ${PROFILES[c2.prof].tell}`, 'c'); return;
    }
    default: err(`unknown command: ${cmd}. Type 'help'.`);
  }
}

/* ============================================================ EVENTS === */
function note(text, kind = 'info') {
  const n = document.createElement('div'); n.className = 'note ' + kind; n.textContent = text;
  $('#notes').prepend(n);
  while ($('#notes').children.length > 5) $('#notes').lastChild.remove();
  setTimeout(() => n.remove(), 4800);
}
function splash(t, s, ms = 1800) {
  const el = $('#splash'); el.querySelector('.sp-t').textContent = t; el.querySelector('.sp-s').textContent = s || ''; el.hidden = false;
  clearTimeout(splash.t); splash.t = setTimeout(() => (el.hidden = true), ms);
}
const nameOf = pid => app.view?.players.find(p => p.pid === pid)?.name || 'A rival';
function onFx(e) {
  const me = e.pid === app.pid;
  switch (e.type) {
    case 'toast': note(e.text, e.kind); shell(e.text, e.kind === 'err' || e.kind === 'bad' ? 'e' : e.kind === 'good' ? 'g' : 'c'); if (e.kind === 'err') sfx('err'); break;
    case 'buy': if (me) { sfx('buy'); shell(`Deal: paid ${money(e.price)} for ${ITEMS[e.itemId].n}.`, 'g'); } else { note(`${nameOf(e.pid)} closed the deal for ${money(e.price)}.`, 'bad'); sfx('lose'); } break;
    case 'sell': if (me) { sfx('sell'); shell(`Sold ${ITEMS[e.itemId].n} for ${money(e.price)} (${e.profit >= 0 ? '+' : ''}${money(e.profit)}).`, 'g'); note(`Sold for ${money(e.price)}.`, 'good'); } else { note(`${nameOf(e.pid)} made the sale.`, 'bad'); sfx('lose'); } break;
    case 'walkin': if (me) { sfx('sell'); note(`Walk-in bought ${ITEMS[e.itemId].n} for ${money(e.price)}.`, 'good'); shell(`Walk-in bought ${ITEMS[e.itemId].n} for ${money(e.price)}.`, 'g'); } break;
    case 'coins': if (me) sfx('sell'); break;
    case 'haggle': if (me) { sfx('haggle'); shakeSay(); } break;
    case 'strike': if (me) { sfx('strike'); shakeSay(); } break;
    case 'upgrade': if (me) sfx('upgrade'); break;
    case 'intel':
      if (!me) break;
      if (e.kind === 'scan') { lastScan = e.uid; sfx('open'); flashWin('intel'); shell('Scan complete. See INTEL.EXE.', 'c'); }
      if (e.kind === 'dossier') { sfx('open'); flashWin('intel'); shell('Dossier retrieved. See INTEL.EXE.', 'c'); }
      if (e.kind === 'hack') { sfx('upgrade'); hackLog += '> ACCESS GRANTED\n'; shell('Breach successful. File saved to NETLINK.', 'g'); }
      if (e.kind === 'hackfail') { sfx('strike'); hackLog += '> CONNECTION REFUSED\n'; }
      break;
    case 'guild': sfx('open'); note('Pawn Guild notice received.', 'info'); setTimeout(() => { if (guildPending()) flashWin('guild'); }, 600); break;
    case 'guildReveal': sfx('day'); flashWin('guild'); break;
    case 'phase': if (e.phase === 'dawn' || e.phase === 'noon') sfx('day'); break;
  }
}
function shakeSay() { document.querySelectorAll('[data-say]').forEach(el => { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }); }
function onPhase(ph, old) {
  drawWall();
  const v = app.view;
  if (ph === 'dawn') {
    hackLog = '';
    const ev = v.event ? `${v.event.cat} ${v.event.mod > 1 ? 'in demand' : 'out of favor'} today` : 'Quiet market today';
    splash(`SOL ${v.day}`, ev, 2400);
    shell(`--- SOL ${v.day} --- ${ev}.`, 'a');
  }
  if (ph === 'buy') { shell('Airlock open. Sellers arriving.', 'a'); openWin('counter'); }
  if (ph === 'noon') { splash('MIDDAY', 'Set shelf prices in STOCK.DB, then open the doors', 2000); shell("Midday. Set prices, then type 'open'.", 'a'); flashWin('stock'); }
  if (ph === 'sell') { splash('AFTERNOON', 'Buyers and walk-in shoppers', 1600); shell('Doors open. Buyers arriving.', 'a'); openWin('counter'); }
  if (ph === 'evening') {
    splash('CLOSING TIME', 'Nightly report filed', 1600);
    shell("Shop closed. Type 'end' when you're done.", 'a');
    setTimeout(() => { flashWin('report'); if (guildPending()) flashWin('guild'); }, 900);
  }
  if (ph === 'over') { clearInterval(simTimer); setTimeout(showResults, old ? 1200 : 0); }
  if (old === 'evening') for (const id of ['report', 'admin', 'net', 'guild']) if (wins[id]) closeWin(id);
  dirty = true;
}
function showResults() {
  const v = app.view, R = v.results || [];
  const mine = R.findIndex(r => r.pid === app.pid);
  $('#over-title').textContent = mine === 0 ? 'TOP SHOP IN THE COLONY' : R.length > 1 ? `YOU FINISHED #${mine + 1}` : 'CONTRACT COMPLETE';
  $('#results').innerHTML = R.map(r => `<li><span class="sw" style="background:${r.color}"></span> <b>${esc(r.name)}</b>${r.ai ? ' <span class="dim">AI</span>' : ''}${r.bankrupt ? ' <span class="bad">BANKRUPT</span>' : ''}
    <div class="kv"><span>Net worth</span><span class="gold">${money(r.worth)}</span><span>Cash / stock</span><span>${money(r.cash)} / ${money(r.invVal)}</span>
    <span>Deals</span><span>${r.stats.bought} bought, ${r.stats.sold} sold</span>${r.stats.bestFlip ? `<span>Best flip</span><span>${esc(ITEMS[r.stats.bestFlip.id].n)} +${money(r.stats.bestFlip.profit)}</span>` : ''}</div></li>`).join('');
  setScreen('over'); paintIcons();
}
