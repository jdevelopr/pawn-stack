/**
 * sim.js - the authoritative game simulation (Red Planet Pawn). Pure logic, no DOM.
 *
 * Solo: runs locally. Multiplayer: runs only on the host; joiners send actions
 * and receive per-player views from viewFor(pid). State is plain JSON so it can
 * be saved to localStorage and sent over the wire.
 *
 * Day loop:  dawn (title card) -> buy (sellers at counter) -> noon (card)
 *            -> sell (buyers at counter) -> evening (summary + upgrades) -> next day
 */
import { ITEMS, BY_TIER, CATS } from './items.js';
import { PROFILES, pickProfile, say, cr } from './profiles.js';

export const COND = [
  { n: 'Broken', m: 0.3 }, { n: 'Worn', m: 0.65 }, { n: 'Good', m: 1 }, { n: 'Mint', m: 1.45 },
];
const COND_W = [14, 34, 38, 14];

export const UPGRADES = [
  { id: 'appraise', name: 'Appraiser', staff: true, wage: 15, cost: [150, 400, 900, 1800, 3500],
    desc: 'Tighter value estimates. Reveals rarity, then spots fakes from level 2.' },
  { id: 'ads', name: 'Advertising', cost: [120, 300, 700, 1500, 3000],
    desc: 'More sellers come for your ad, carrying less junk. They see you first.' },
  { id: 'sign', name: 'Storefront', cost: [150, 350, 800, 1600, 3200],
    desc: 'More buyers come to you first, with slightly bigger budgets.' },
  { id: 'storage', name: 'Storage', cost: [100, 250, 600, 1200, 2400],
    desc: '+4 inventory slots per level.' },
  { id: 'haggler', name: 'Haggler', staff: true, wage: 20, cost: [300, 900, 2200],
    desc: 'Sellers drop their ask faster, tolerate lowballs, and you read their bottom line.' },
  { id: 'sales', name: 'Salesclerk', staff: true, wage: 20, cost: [300, 900, 2200],
    desc: 'Buyers pay more, wholesalers pay more, and you read buyer budgets.' },
  { id: 'restore', name: 'Restorer', staff: true, wage: 25, cost: [400, 1100, 2600],
    desc: 'Repairs one item per level overnight, raising its condition.' },
  { id: 'security', name: 'Security', cost: [200, 500, 1100],
    desc: 'Cameras and a guard cut overnight theft.' },
];
export const UP = Object.fromEntries(UPGRADES.map(u => [u.id, u]));

const APPR_W = [0.9, 0.62, 0.42, 0.28, 0.16, 0.07];
const APPR_DET = [0, 0, 0.45, 0.7, 0.9, 1];
export const START_CASH = 750;
const SELLER_MS = 16000, BUYER_MS = 15000, WALK_MS = 1600, GAP_MS = 1100, EXCL_MS = 4000;
const HARD_TIMES_CASH = 200, DOWNGRADE_REFUND = 0.3;
const DAWN_MS = 4200, NOON_MS = 3200, EVENING_MP_MS = 90000;
export const PLAYER_COLORS = ['#e8554e', '#3fa7d6', '#f4c542', '#7bc96f'];

export function nice(n) {
  n = Math.max(1, n);
  if (n < 20) return Math.round(n);
  if (n < 200) return Math.round(n / 5) * 5;
  if (n < 2000) return Math.round(n / 10) * 10;
  return Math.round(n / 50) * 50;
}
export function hash01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function wpick(w) {
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return i; }
  return w.length - 1;
}

export const genuineValue = i => Math.max(1, Math.round(ITEMS[i.id].v * COND[i.cond].m * i.vm));
export const trueValue = i => (i.fake ? Math.max(1, Math.round(genuineValue(i) * 0.06)) : genuineValue(i));
export const capOf = p => 8 + 4 * p.up.storage;

export class Sim {
  constructor(cfg = {}) {
    this.s = {
      cfg: { maxDays: cfg.maxDays ?? 20, mode: cfg.mode || 'solo' },
      day: 0, phase: 'lobby', phaseEnd: 0,
      players: {}, order: [],
      seller: null, sellers: [], buyer: null, buyers: [], nextAt: 0,
      log: [], fx: [], fxId: 0, uid: 1, event: null, results: null,
    };
    this.dirty = true;
  }
  static load(json) {
    const sim = new Sim(json.cfg); sim.s = json;
    for (const p of Object.values(json.players)) { p.loans ||= []; p.memory ||= {}; }   // older saves
    return sim;
  }
  serialize() { return JSON.parse(JSON.stringify(this.s)); }

  get solo() { return this.s.order.length === 1; }
  live() { return this.s.order.map(id => this.s.players[id]).filter(p => !p.bankrupt); }

  addPlayer(pid, name) {
    const S = this.s;
    if (S.players[pid]) { S.players[pid].connected = true; if (name) S.players[pid].name = name; this.dirty = true; return S.players[pid]; }
    const p = {
      pid, name: (name || 'Player').slice(0, 14), color: PLAYER_COLORS[S.order.length % 4],
      cash: START_CASH, inv: [], connected: true, ready: false, bankrupt: false,
      up: Object.fromEntries(UPGRADES.map(u => [u.id, 0])),
      stats: { bought: 0, sold: 0, spent: 0, earned: 0, bestFlip: null, interest: 0 },
      loans: [], memory: {},
      today: null, summary: null,
    };
    S.players[pid] = p; S.order.push(pid); this.dirty = true;
    return p;
  }
  removePlayer(pid) {
    const S = this.s;
    delete S.players[pid]; S.order = S.order.filter(x => x !== pid);
    S.order.forEach((id, i) => (S.players[id].color = PLAYER_COLORS[i % 4]));
    this.dirty = true;
  }
  setConnected(pid, v) { const p = this.s.players[pid]; if (p) { p.connected = v; this.dirty = true; } }

  log(text) { this.s.log.push(text); if (this.s.log.length > 30) this.s.log.shift(); this.dirty = true; }
  fx(e) { e.id = ++this.s.fxId; this.s.fx.push(e); if (this.s.fx.length > 30) this.s.fx.shift(); this.dirty = true; }
  toast(pid, text, kind = 'info') { this.fx({ type: 'toast', pid, text, kind }); }

  start(now) { this.s.day = 0; this.nextDay(now); }

  /* ---------------------------------------------------------- day flow --- */

  nextDay(now) {
    const S = this.s;
    S.day++;
    if (S.cfg.maxDays && S.day > S.cfg.maxDays) return this.finish();
    for (const p of Object.values(S.players)) {
      p.ready = false; p.summary = null;
      p.today = { bought: [], sold: [], dumped: [], lent: [], startCash: p.cash };
    }
    S.event = Math.random() < 0.6
      ? { cat: pick(CATS), mod: Math.random() < 0.65 ? 1.35 : 0.75 }
      : null;
    S.sellers = this.genSellers();
    S.buyers = this.genBuyerSlots();
    S.seller = null; S.buyer = null;
    S.phase = 'dawn'; S.phaseEnd = now + DAWN_MS;
    this.fx({ type: 'phase', phase: 'dawn', day: S.day });
    this.dirty = true;
  }

  genSellers() {
    const live = this.live();
    const slots = [];
    const walk = 3 + live.length;
    for (let i = 0; i < walk; i++) slots.push(null);
    for (const p of live) {
      const n = Math.round(2 + p.up.ads * 1.3);
      for (let i = 0; i < n; i++) slots.push(p.pid);
    }
    // Hard times: a struggling shop attracts desperate sellers with cheap, sellable goods.
    for (const p of live) {
      if (p.cash < HARD_TIMES_CASH) for (let i = 0; i < 2; i++) slots.push({ hard: p.pid });
    }
    slots.sort(() => Math.random() - 0.5);
    return slots.map(slot => {
      if (slot && slot.hard) return this.makeHardSeller(slot.hard);
      const forPid = slot;
      const prof = pickProfile('sell'), P0 = PROFILES[prof], ps = P0.sell;
      const L = (forPid ? this.s.players[forPid].up.ads : 0) + (ps.tier || 0);
      const tier = wpick([Math.max(4, 40 - 7 * L), 35, 17 + 2.5 * L, 6 + 1.8 * L, 1.2 + 0.8 * L]);
      let pool = BY_TIER[tier];
      if (P0.cats && Math.random() < 0.6) {
        const sub = pool.filter(i => P0.cats.includes(ITEMS[i].cat));
        if (sub.length) pool = sub;
      }
      const id = pick(pool);
      const inst = {
        uid: 'i' + this.s.uid++, id, cond: wpick(COND_W), vm: +rand(0.85, 1.15).toFixed(3),
        fake: tier >= 2 && Math.random() < (ps.fake ?? 0.13),
      };
      const P = genuineValue(inst);
      const base = { id: 's' + this.s.uid++, prof, inst, for: forPid, look: Math.floor(Math.random() * 1e9), per: {}, feed: [] };
      // Pawn loan: they want credits now and plan to come back for the item.
      if (tier >= 1 && Math.random() < (P0.loan ?? 0.2)) {
        const F = Math.max(2, Math.round(P * rand(0.15, 0.3)));       // least they'll accept
        const ask = Math.max(F + 1, nice(P * rand(0.35, 0.6)));       // what they ask to borrow
        return { ...base, F, ask, startAsk: ask, loan: { rate: pick([0.2, 0.25, 0.3]), days: pick([2, 3]) } };
      }
      // Sellers of fakes know what they have; everyone else guesses (some guess wildly).
      const F = Math.max(1, Math.round(P * (inst.fake ? rand(0.2, 0.55) : rand(...ps.floor))));
      const ask = Math.max(F + 1, nice(F * rand(...ps.ask)));
      return { ...base, F, ask, startAsk: ask };
    });
  }

  makeHardSeller(pid) {
    const prof = pickProfile('sell');
    const tier = wpick([0, 60, 35, 5, 0]);
    const inst = { uid: 'i' + this.s.uid++, id: pick(BY_TIER[tier]), cond: wpick([5, 35, 45, 15]), vm: +rand(0.9, 1.1).toFixed(3), fake: false };
    const P = genuineValue(inst);
    const F = Math.max(1, Math.round(P * rand(0.15, 0.35)));
    const ask = Math.max(F + 1, nice(F * rand(1.2, 1.5)));
    return { id: 's' + this.s.uid++, prof, inst, F, ask, startAsk: ask, for: pid, hard: true, look: Math.floor(Math.random() * 1e9), per: {}, feed: [] };
  }

  genBuyerSlots() {
    const live = this.live();
    const slots = [];
    for (let i = 0; i < 3 + live.length; i++) slots.push(null);
    for (const p of live) {
      const n = Math.round(2 + p.up.sign * 1.3);
      for (let i = 0; i < n; i++) slots.push(p.pid);
    }
    return slots.sort(() => Math.random() - 0.5);
  }

  makeBuyer(forPid) {
    const S = this.s;
    const prof = pickProfile('buy'), P0 = PROFILES[prof];
    const pool = forPid ? [S.players[forPid]] : this.live();
    const cats = pool.flatMap(p => p.inv.map(i => ITEMS[i.id].cat));
    const fav = P0.cats ? cats.filter(c => P0.cats.includes(c)) : [];
    let cat;
    if (Math.random() < 0.12) cat = 'any';
    else if (fav.length && Math.random() < 0.7) cat = pick(fav);
    else if (cats.length && Math.random() < 0.85) cat = pick(cats);
    else if (S.event && S.event.mod > 1 && Math.random() < 0.5) cat = S.event.cat;
    else cat = pick(CATS);
    return { id: 'b' + S.uid++, prof, cat, mult: +rand(...P0.buy.mult).toFixed(3), for: forPid, look: Math.floor(Math.random() * 1e9), per: {}, feed: [] };
  }

  tick(now) {
    const S = this.s;
    switch (S.phase) {
      case 'dawn':
        if (now >= S.phaseEnd) { S.phase = 'buy'; S.nextAt = now; this.dirty = true; }
        break;
      case 'buy': {
        const c = S.seller;
        if (c && !c.done && now >= c.until) this.customerLeave(c, now, say(c.prof, 'walk'));
        if ((!c || c.done) && now >= S.nextAt) {
          if (S.sellers.length) {
            const n = S.sellers.shift();
            n.openAt = now + WALK_MS; n.until = n.openAt + Math.round(SELLER_MS * (PROFILES[n.prof].sell.time || 1)); n.done = false;
            S.seller = n; this.dirty = true;
          } else {
            S.seller = null; S.phase = 'noon'; S.phaseEnd = now + NOON_MS;
            this.fx({ type: 'phase', phase: 'noon', day: S.day });
          }
        }
        break;
      }
      case 'noon':
        if (now >= S.phaseEnd) { S.phase = 'sell'; S.nextAt = now; this.dirty = true; }
        break;
      case 'sell': {
        const b = S.buyer;
        if (b && !b.done) {
          if (now >= b.until) this.customerLeave(b, now, 'Got bored and left.');
          else if (now >= b.openAt + 2500 && !this.live().some(p => this.eligible(p, b).length)) this.customerLeave(b, now, 'Nothing here for me.');
        }
        if ((!b || b.done) && now >= S.nextAt) {
          if (S.buyers.length) {
            const n = this.makeBuyer(S.buyers.shift());
            n.openAt = now + WALK_MS; n.until = n.openAt + Math.round(BUYER_MS * (PROFILES[n.prof].buy.time || 1)); n.done = false;
            S.buyer = n; this.dirty = true;
          } else {
            S.buyer = null; this.enterEvening(now);
          }
        }
        break;
      }
      case 'evening':
        if (!this.solo && S.phaseEnd && now >= S.phaseEnd) this.nextDay(now);
        break;
    }
  }

  customerLeave(c, now, text) {
    c.done = true; c.outcome = { type: 'left', text };
    this.s.nextAt = now + GAP_MS; this.dirty = true;
  }

  per(c, pid) { return (c.per[pid] ||= { strikes: 0, out: false, msg: '', counter: null, pitches: 0 }); }

  gate(c, p, now) {
    if (!c || c.done) return 'No one is at the counter.';
    if (now < c.openAt) return 'They are still walking in.';
    if (p.bankrupt) return 'You are bankrupt.';
    if (this.per(c, p.pid).out) return 'They will not deal with you.';
    if (c.for && c.for !== p.pid && now < c.openAt + EXCL_MS && this.live().length > 1) {
      return `They came for ${this.s.players[c.for]?.name}'s shop. Wait a moment.`;
    }
    return null;
  }

  checkAllOut(c, now) {
    const live = this.live().filter(p => p.connected);
    if (live.every(p => this.per(c, p.pid).out)) this.customerLeave(c, now, 'Walked out.');
  }

  feed(c, text) { c.feed.push(text); if (c.feed.length > 4) c.feed.shift(); }

  /* ----------------------------------------------------------- actions --- */

  act(pid, a, now) {
    const S = this.s, p = S.players[pid];
    if (!p || !a) return;
    const err = msg => this.toast(pid, msg, 'err');
    switch (a.type) {
      case 'offer': case 'take': {
        if (S.phase !== 'buy') return;
        const c = S.seller, g = this.gate(c, p, now);
        if (g) return err(g);
        const amt = a.type === 'take' ? c.ask : Math.floor(+a.amt);
        if (!(amt > 0)) return err('Enter an offer.');
        if (amt > p.cash) return err('Not enough cash.');
        if (!c.loan && p.inv.length >= capOf(p)) return err('Storage is full. Dump something or upgrade.');
        const st = this.per(c, pid);
        if (amt >= c.ask) return this.buy(p, c, c.ask, now);
        if (amt >= c.F) {
          if (Math.random() < 0.12) return this.buy(p, c, amt, now);
          const k = 0.45 + 0.1 * p.up.haggler + (PROFILES[c.prof].sell.give || 0);
          const na = nice(c.ask - (c.ask - amt) * k);
          if (na <= amt * 1.04 || na >= c.ask) return this.buy(p, c, amt, now);
          c.ask = na;
          st.msg = say(c.prof, c.loan ? 'loanCounter' : 'counter', { p: na });
          c.until = Math.min(c.until + 2500, c.openAt + SELLER_MS + 8000);
          if (!this.solo) this.feed(c, `${p.name} haggled the ${c.loan ? 'loan' : 'ask'} to ${cr(na)}`);
          this.fx({ type: 'haggle', pid });
        } else {
          st.strikes += amt < c.F * 0.5 ? 2 : 1;
          if (st.strikes >= this.sellerLimit(p, c)) {
            st.out = true; st.msg = say(c.prof, 'walk');
            if (!this.solo) this.feed(c, `${p.name} insulted the seller`);
            this.checkAllOut(c, now);
          } else {
            st.msg = say(c.prof, 'insult');
          }
          this.fx({ type: 'strike', pid });
        }
        this.dirty = true;
        return;
      }
      case 'pass': {
        const c = S.phase === 'buy' ? S.seller : S.buyer;
        if (!c || c.done) return;
        const st = this.per(c, pid); st.out = true; st.msg = say(c.prof, 'pass');
        this.checkAllOut(c, now); this.dirty = true;
        return;
      }
      case 'pitch': {
        if (S.phase !== 'sell') return;
        const b = S.buyer, g = this.gate(b, p, now);
        if (g) return err(g);
        const inst = p.inv.find(i => i.uid === a.uid);
        if (!inst || !this.matches(b, inst)) return err('Pick an item they want.');
        const price = Math.floor(+a.price);
        if (!(price > 0)) return err('Enter a price.');
        const st = this.per(b, pid);
        st.pitches++;
        const BP = PROFILES[b.prof].buy;
        if (inst.fake && hash01(b.id + ':' + inst.uid) < (BP.detect ?? 0.55)) {
          st.out = true; st.msg = say(b.prof, 'fake');
          this.fx({ type: 'strike', pid });
          if (!this.solo) this.feed(b, `${p.name} tried to sell a fake`);
          this.checkAllOut(b, now); this.dirty = true;
          return;
        }
        const W = this.willing(b, p, inst);
        if (price <= W * 0.9) return this.sell(p, b, inst, price, now);
        if (price <= W * 1.22) {
          const counter = nice(W * rand(0.8, 0.94) * (1 - 0.03 * (st.pitches - 1)));
          if (counter >= price) return this.sell(p, b, inst, price, now);
          st.counter = { uid: inst.uid, price: counter };
          st.msg = say(b.prof, 'buyer', { p: counter });
          if (!this.solo) this.feed(b, `${p.name} pitched ${ITEMS[inst.id].n}`);
          this.fx({ type: 'haggle', pid });
        } else {
          st.strikes++;
          if (st.strikes >= 3 + (BP.strikes || 0) || st.pitches >= 5) { st.out = true; st.msg = say(b.prof, 'done'); this.checkAllOut(b, now); }
          else st.msg = BP.junk && ITEMS[inst.id].t === 0 ? say(b.prof, 'junk') : say(b.prof, 'high');
          this.fx({ type: 'strike', pid });
        }
        if (st.pitches >= 5 && !st.out) { st.out = true; st.msg = say(b.prof, 'done'); this.checkAllOut(b, now); }
        this.dirty = true;
        return;
      }
      case 'takeCounter': {
        if (S.phase !== 'sell') return;
        const b = S.buyer, g = this.gate(b, p, now);
        if (g) return err(g);
        const st = this.per(b, pid);
        const inst = st.counter && p.inv.find(i => i.uid === st.counter.uid);
        if (!inst) return err('No counter-offer to accept.');
        return this.sell(p, b, inst, st.counter.price, now);
      }
      case 'dump': {
        if (!['buy', 'sell', 'evening', 'noon', 'dawn'].includes(S.phase)) return;
        const idx = p.inv.findIndex(i => i.uid === a.uid);
        if (idx < 0) return;
        const inst = p.inv[idx];
        const price = nice(trueValue(inst) * (0.45 + 0.04 * p.up.sales));
        p.inv.splice(idx, 1);
        p.cash += price; p.stats.earned += price;
        p.today?.dumped.push({ id: inst.id, price, paid: inst.paid });
        this.remember(p, inst.id, 'dump', price, inst.cond);
        this.toast(pid, `Wholesaler paid ${cr(price)} for ${ITEMS[inst.id].n}${inst.fake ? ' (it was a fake)' : ''}.`, price >= inst.paid ? 'good' : 'bad');
        this.fx({ type: 'coins', pid, amt: price });
        this.dirty = true;
        return;
      }
      case 'upgrade': {
        if (S.phase !== 'evening') return err('Upgrades are bought in the evening.');
        const u = UP[a.id]; if (!u) return;
        const lvl = p.up[u.id];
        if (lvl >= u.cost.length) return err('Already maxed.');
        const cost = u.cost[lvl];
        if (p.cash < cost) return err('Not enough cash.');
        p.cash -= cost; p.up[u.id]++;
        this.toast(pid, `${u.name} upgraded to level ${p.up[u.id]}.`, 'good');
        this.fx({ type: 'upgrade', pid, id: u.id });
        if (!this.solo) this.log(`${p.name} bought ${u.name} ${p.up[u.id]}`);
        this.dirty = true;
        return;
      }
      case 'downgrade': {
        if (S.phase !== 'evening') return err('Staff and upgrades are changed in the evening.');
        const u = UP[a.id]; if (!u) return;
        const lvl = p.up[u.id];
        if (lvl <= 0) return;
        if (u.id === 'storage' && p.inv.length > 8 + 4 * (lvl - 1)) return err('Too much stock to shrink storage. Sell or dump items first.');
        const refund = u.staff ? 0 : nice(u.cost[lvl - 1] * DOWNGRADE_REFUND);
        p.up[u.id]--; p.cash += refund;
        this.toast(pid, u.staff ? `Let one ${u.name} go. Wages drop by ${cr(u.wage)} per sol.` : `${u.name} sold back for ${cr(refund)}.`, 'info');
        this.fx({ type: 'upgrade', pid, id: u.id });
        this.dirty = true;
        return;
      }
      case 'ready': {
        if (S.phase !== 'evening') return;
        p.ready = a.v !== false; this.dirty = true;
        const live = this.live().filter(x => x.connected);
        if (live.length && live.every(x => x.ready)) this.nextDay(now);
        return;
      }
    }
  }

  matches(b, inst) { return b.cat === 'any' || ITEMS[inst.id].cat === b.cat; }
  eligible(p, b) { return p.inv.filter(i => this.matches(b, i)); }

  catMod(cat) { const e = this.s.event; return e && e.cat === cat ? e.mod : 1; }

  willing(b, p, inst) {
    const BP = PROFILES[b.prof].buy, it = ITEMS[inst.id];
    const prof = (BP.bonus?.[it.cat] || 1) * (BP.junk && it.t === 0 ? BP.junk : 1);
    return genuineValue(inst) * b.mult * prof * (1 + 0.06 * p.up.sales + 0.025 * p.up.sign) * this.catMod(it.cat);
  }

  sellerLimit(p, c) {
    return Math.max(1, 3 + Math.floor(p.up.haggler / 2) + (p.up.haggler >= 3 ? 1 : 0) + (PROFILES[c.prof].sell.strikes || 0));
  }

  buy(p, c, price, now) {
    if (c.loan) return this.lend(p, c, price, now);
    const line = say(c.prof, 'deal');
    p.cash -= price; p.stats.bought++; p.stats.spent += price;
    this.remember(p, c.inst.id, 'paid', price, c.inst.cond);
    const inst = { ...c.inst, paid: price, day: this.s.day };
    p.inv.push(inst);
    p.today.bought.push({ id: inst.id, price });
    this.per(c, p.pid).msg = line;
    c.done = true; c.outcome = { type: 'bought', pid: p.pid, price, text: line };
    this.s.nextAt = now + GAP_MS;
    this.log(`${p.name} bought ${ITEMS[inst.id].n} for ${cr(price)}`);
    this.fx({ type: 'buy', pid: p.pid, price, itemId: inst.id });
    this.dirty = true;
  }

  lend(p, c, amount, now) {
    const line = say(c.prof, 'loanDeal');
    const back = Math.round(amount * (1 + c.loan.rate));
    p.cash -= amount;
    p.loans.push({ id: c.id, inst: { ...c.inst }, amount, back, rate: c.loan.rate, due: this.s.day + c.loan.days, prof: c.prof });
    p.today.lent.push({ id: c.inst.id, amount, back });
    this.per(c, p.pid).msg = line;
    c.done = true; c.outcome = { type: 'lent', pid: p.pid, price: amount, text: line };
    this.s.nextAt = now + GAP_MS;
    this.log(`${p.name} lent ${cr(amount)} against ${ITEMS[c.inst.id].n}`);
    this.fx({ type: 'buy', pid: p.pid, price: amount, itemId: c.inst.id });
    this.dirty = true;
  }

  /** Price memory: every player learns market sale prices; your own buys and dumps stay private. */
  remember(p, itemId, kind, price, cond) {
    (p.memory[itemId] ||= {})[kind] = { price, cond, day: this.s.day };
  }

  sell(p, b, inst, price, now) {
    for (const x of Object.values(this.s.players)) this.remember(x, inst.id, 'sale', price, inst.cond);
    p.inv = p.inv.filter(i => i !== inst);
    p.cash += price; p.stats.sold++; p.stats.earned += price;
    const profit = price - inst.paid;
    p.today.sold.push({ id: inst.id, price, paid: inst.paid });
    if (!p.stats.bestFlip || profit > p.stats.bestFlip.profit) p.stats.bestFlip = { id: inst.id, profit, paid: inst.paid, price };
    const line = say(b.prof, 'deal');
    this.per(b, p.pid).msg = line;
    b.done = true; b.outcome = { type: 'sold', pid: p.pid, price, itemId: inst.id, profit, text: line };
    this.s.nextAt = now + GAP_MS;
    this.log(`${p.name} sold ${ITEMS[inst.id].n} for ${cr(price)}`);
    this.fx({ type: 'sell', pid: p.pid, price, profit, itemId: inst.id });
    this.dirty = true;
  }

  enterEvening(now) {
    const S = this.s;
    S.phase = 'evening';
    S.phaseEnd = this.solo ? 0 : now + EVENING_MP_MS;
    for (const p of this.live()) {
      const loans = [];
      for (const L of p.loans.filter(l => l.due <= S.day)) {
        const repayP = PROFILES[L.prof]?.repay ?? 0.75;
        if (!L.inst.fake && Math.random() < repayP) {
          p.cash += L.back; p.stats.interest += L.back - L.amount;
          loans.push({ id: L.inst.id, amount: L.amount, back: L.back, kind: 'repaid' });
        } else {
          // forfeited: the collateral is yours, at the price of the loan
          p.inv.push({ ...L.inst, paid: L.amount, day: S.day });
          loans.push({ id: L.inst.id, amount: L.amount, kind: 'forfeit' });
        }
      }
      p.loans = p.loans.filter(l => l.due > S.day);
      const rent = 20 + 3 * S.day;
      const wages = UPGRADES.filter(u => u.staff).reduce((s, u) => s + p.up[u.id] * u.wage, 0);
      p.cash -= rent + wages;
      const restored = [];
      for (let i = 0; i < p.up.restore; i++) {
        const cand = p.inv.filter(x => x.cond < 3 && !restored.includes(x.uid));
        if (!cand.length) break;
        const it = cand.sort((a, b) => genuineValue(b) - genuineValue(a))[0];
        it.cond++; restored.push(it.uid);
      }
      let stolen = null;
      if (p.inv.length && Math.random() < Math.max(0.01, 0.14 - 0.045 * p.up.security)) {
        const it = pick(p.inv); p.inv = p.inv.filter(x => x !== it); stolen = it.id;
      }
      const forced = [];
      while (p.cash < 0 && p.inv.length) {
        const it = p.inv.sort((a, b) => trueValue(a) - trueValue(b)).shift();
        const price = nice(trueValue(it) * 0.4);
        p.cash += price; forced.push({ id: it.id, price });
      }
      if (p.cash < 0) { p.bankrupt = true; p.ready = true; }
      p.summary = {
        ...p.today, rent, wages, stolen, forced, loans, cash: p.cash,
        restored: restored.map(uid => p.inv.find(i => i.uid === uid)).filter(Boolean).map(i => ({ id: i.id, cond: i.cond })),
      };
    }
    this.fx({ type: 'phase', phase: 'evening', day: S.day });
    if (!this.live().length) return this.finish();
    this.dirty = true;
  }

  finish() {
    const S = this.s;
    S.phase = 'over';
    S.results = S.order.map(id => {
      const p = S.players[id];
      const invVal = p.inv.reduce((s, i) => s + trueValue(i), 0) + p.loans.reduce((s, l) => s + l.amount, 0);
      return { pid: id, name: p.name, color: p.color, cash: p.cash, invVal, worth: p.cash + invVal, items: p.inv.length, stats: p.stats, bankrupt: p.bankrupt, days: S.day - 1 };
    }).sort((a, b) => b.worth - a.worth);
    this.fx({ type: 'phase', phase: 'over' });
    this.dirty = true;
  }

  /* -------------------------------------------------------------- views --- */

  estimate(p, inst) {
    const L = p.up.appraise, w = APPR_W[L];
    const det = inst.fake && hash01(p.pid + 'f' + inst.uid) < APPR_DET[L];
    const base = det || !inst.fake ? trueValue(inst) : genuineValue(inst);
    const n = hash01(p.pid + 'n' + inst.uid) * 2 - 1;
    const c = base * (1 + n * w * 0.4);
    return { lo: nice(c * (1 - w / 2)), hi: nice(c * (1 + w / 2)), fake: det, tier: L >= 1 ? ITEMS[inst.id].t : -1 };
  }

  viewFor(pid, now) {
    const S = this.s, p = S.players[pid];
    if (!p) return null;
    const v = {
      day: S.day, maxDays: S.cfg.maxDays, phase: S.phase, mode: S.cfg.mode,
      left: S.phaseEnd ? Math.max(0, S.phaseEnd - now) : 0,
      event: S.event,
      me: {
        pid, name: p.name, color: p.color, cash: p.cash, cap: capOf(p), up: p.up,
        ready: p.ready, bankrupt: p.bankrupt, summary: p.summary, stats: p.stats,
        inv: p.inv.map(i => ({ uid: i.uid, id: i.id, cond: i.cond, paid: i.paid, day: i.day, est: this.estimate(p, i), mem: p.memory[i.id] || null })),
        loans: p.loans.map(l => ({ id: l.id, itemId: l.inst.id, cond: l.inst.cond, amount: l.amount, back: l.back, rate: l.rate, due: l.due, est: this.estimate(p, l.inst) })),
      },
      players: S.order.map(id => {
        const x = S.players[id];
        return { pid: id, name: x.name, color: x.color, cash: x.cash, n: x.inv.length, connected: x.connected, ready: x.ready, bankrupt: x.bankrupt, up: x.up };
      }),
      queue: S.phase === 'buy' ? S.sellers.length : S.phase === 'sell' ? S.buyers.length : 0,
      log: S.log.slice(-6),
      fx: S.fx.filter(e => !e.pid || e.pid === pid || e.type === 'buy' || e.type === 'sell' || e.type === 'phase'),
      results: S.results,
      seller: null, buyer: null,
    };
    const c = S.seller;
    if (c && S.phase === 'buy') {
      const st = this.per(c, pid);
      v.seller = {
        id: c.id, prof: c.prof, lim: this.sellerLimit(p, c), itemId: c.inst.id, cond: c.inst.cond, ask: c.ask, startAsk: c.startAsk,
        openIn: Math.max(0, c.openAt - now), left: Math.max(0, c.until - now), done: !!c.done, outcome: c.outcome || null,
        forMe: c.for === pid, forName: c.for ? S.players[c.for]?.name : null,
        excl: c.for && c.for !== pid && this.live().length > 1 ? Math.max(0, c.openAt + EXCL_MS - now) : 0,
        st: { strikes: st.strikes, out: st.out, msg: st.msg }, feed: c.feed, look: c.look,
        est: this.estimate(p, c.inst), hint: this.sellerHint(p, c),
        loan: c.loan || null, hard: !!c.hard, mem: p.memory[c.inst.id] || null,
      };
    }
    const b = S.buyer;
    if (b && S.phase === 'sell') {
      const st = this.per(b, pid);
      v.buyer = {
        id: b.id, prof: b.prof, lim: 3 + (PROFILES[b.prof].buy.strikes || 0), cat: b.cat, openIn: Math.max(0, b.openAt - now), left: Math.max(0, b.until - now),
        done: !!b.done, outcome: b.outcome || null,
        forMe: b.for === pid, forName: b.for ? S.players[b.for]?.name : null,
        excl: b.for && b.for !== pid && this.live().length > 1 ? Math.max(0, b.openAt + EXCL_MS - now) : 0,
        st: { strikes: st.strikes, out: st.out, msg: st.msg, counter: st.counter, pitches: st.pitches },
        feed: b.feed, look: b.look, eligible: this.eligible(p, b).map(i => i.uid), hint: this.buyerHint(p, b),
      };
    }
    return v;
  }

  sellerHint(p, c) {
    const L = p.up.haggler;
    if (!L) return null;
    const r = c.ask / c.F;
    let mood = r > 1.6 ? 'Asking way over their bottom line.' : r > 1.25 ? 'Some wiggle room left.' : 'Close to their bottom line.';
    if (L >= 2) {
      const spread = 0.5 / L;
      const guess = nice(c.F * (1 + (hash01(p.pid + 'h' + c.id) - 0.5) * spread));
      mood += c.loan ? ` Would settle for a loan of about ${cr(guess)}.` : ` Would probably take about ${cr(guess)}.`;
    }
    return mood;
  }

  buyerHint(p, b) {
    const L = p.up.sales;
    if (!L) return null;
    const m = b.mult * (1 + 0.06 * L + 0.025 * p.up.sign);
    let t = m > 1.2 ? 'Deep pockets.' : m < 0.95 ? 'Bargain hunter.' : 'Average budget.';
    if (L >= 2) {
      const pct = Math.round(m * 100 * (1 + (hash01(p.pid + 'b' + b.id) - 0.5) * (0.3 / L)) / 5) * 5;
      t += ` Pays around ${pct}% of real value.`;
    }
    return t;
  }
}
