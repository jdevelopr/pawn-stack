/**
 * net.js — host-authoritative PeerJS networking (star topology).
 *
 * Adapted from the PeerJS party-game template for a desktop game where the host
 * is also a player: the host's browser runs the Sim, plays locally, and relays
 * per-player views to every joiner. Joiners send actions only.
 *
 * Identity is a persistent clientId in localStorage, so a dropped player who
 * reopens the join link gets their shop back with cash and inventory intact.
 */

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0, I/1/L
const HELLO_TIMEOUT_MS = 10000;

export function makeRoomCode(n = 4) {
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(bytes, b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

export function clientId() {
  let id = null;
  try { id = localStorage.getItem('pawn-cid'); } catch {}
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2);
    try { localStorage.setItem('pawn-cid', id); } catch {}
  }
  return id;
}

export function joinUrl(code) {
  const u = new URL(window.location.href);
  u.search = ''; u.hash = '';
  u.searchParams.set('room', code);
  return u.toString();
}

export function roomFromUrl() {
  const r = new URLSearchParams(location.search).get('room');
  return r ? r.trim().toUpperCase() : null;
}

const peerIdFor = (slug, code) => `${slug}-${code.toUpperCase()}`;

function emitter() {
  const l = {};
  return {
    on(ev, fn) { (l[ev] ||= []).push(fn); },
    emit(ev, ...a) { (l[ev] || []).forEach(fn => fn(...a)); },
  };
}

function safeSend(conn, msg) {
  try { if (conn?.open) conn.send(msg); } catch (e) { console.warn('send failed', e); }
}

/* ------------------------------------------------------------------ host --- */
/**
 * Events: open(code), join(cid, name, returning), leave(cid), msg(cid, msg), error(err)
 * accept(cid) -> return string reason to reject, or null to admit.
 */
export function createHost({ slug, accept = () => null, peerOptions = {} } = {}) {
  const E = emitter();
  const conns = new Map(); // cid -> conn
  let peer = null, code = null, attempts = 0;

  function open() {
    code = makeRoomCode();
    peer = new Peer(peerIdFor(slug, code), peerOptions);
    peer.on('open', () => E.emit('open', code));
    peer.on('connection', wire);
    peer.on('disconnected', () => { try { peer.reconnect(); } catch {} });
    peer.on('error', err => {
      if (err.type === 'unavailable-id' && attempts++ < 5) {
        try { peer.destroy(); } catch {}
        return open();
      }
      E.emit('error', err);
    });
  }

  function wire(conn) {
    let cid = null;
    const helloTimer = setTimeout(() => { if (!cid) conn.close(); }, HELLO_TIMEOUT_MS);
    conn.on('data', msg => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.t === 'hello') {
        clearTimeout(helloTimer);
        const id = String(msg.clientId || '');
        const reason = id ? accept(id) : 'Bad handshake';
        if (reason) {
          safeSend(conn, { t: 'rejected', reason });
          setTimeout(() => conn.close(), 150);
          return;
        }
        cid = id;
        const old = conns.get(cid);
        if (old && old !== conn) { try { old.close(); } catch {} }
        conns.set(cid, conn);
        safeSend(conn, { t: 'welcome', pid: cid });
        E.emit('join', cid, String(msg.name || 'Player').slice(0, 14));
        return;
      }
      if (cid) E.emit('msg', cid, msg);
    });
    const drop = () => {
      clearTimeout(helloTimer);
      if (cid && conns.get(cid) === conn) { conns.delete(cid); E.emit('leave', cid); }
    };
    conn.on('close', drop);
    conn.on('error', drop);
  }

  return {
    on: E.on, open,
    get code() { return code; },
    sendTo(cid, msg) { safeSend(conns.get(cid), msg); },
    broadcast(msg) { for (const c of conns.values()) safeSend(c, msg); },
    connected: cid => conns.has(cid),
    destroy() { try { peer?.destroy(); } catch {} },
  };
}

/* ---------------------------------------------------------------- client --- */
/** Events: welcome(pid), msg(msg), rejected(reason), disconnected(), error(err) */
export function createClient({ slug, code, name, peerOptions = {} } = {}) {
  const E = emitter();
  let peer = null, conn = null, timer = null, closedByUs = false;
  const queue = [];

  function connect() {
    peer = new Peer(undefined, peerOptions);
    peer.on('open', () => {
      conn = peer.connect(peerIdFor(slug, code), { reliable: true });
      timer = setTimeout(() => {
        if (!conn?.open) E.emit('error', new Error('Could not reach that room. Check the code, or the host may have closed it.'));
      }, HELLO_TIMEOUT_MS);
      conn.on('open', () => {
        clearTimeout(timer);
        safeSend(conn, { t: 'hello', clientId: clientId(), name });
        while (queue.length) safeSend(conn, queue.shift());
      });
      conn.on('data', msg => {
        if (!msg || typeof msg !== 'object') return;
        if (msg.t === 'welcome') E.emit('welcome', msg.pid);
        else if (msg.t === 'rejected') { closedByUs = true; E.emit('rejected', msg.reason); }
        else E.emit('msg', msg);
      });
      conn.on('close', () => { if (!closedByUs) E.emit('disconnected'); });
      conn.on('error', err => E.emit('error', err));
    });
    peer.on('disconnected', () => { try { peer.reconnect(); } catch {} });
    peer.on('error', err => {
      if (err.type === 'peer-unavailable') E.emit('error', new Error('No room with that code. Check it and try again.'));
      else E.emit('error', err);
    });
  }

  function send(msg) {
    if (conn?.open) safeSend(conn, msg);
    else queue.push(msg);
  }

  return {
    on: E.on, connect, send,
    destroy() { closedByUs = true; clearTimeout(timer); try { peer?.destroy(); } catch {} },
  };
}
