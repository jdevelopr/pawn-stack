/**
 * ai.js - AI rival shopkeepers for solo games.
 *
 * AI players are ordinary players in the Sim (they have cash, stock, upgrades and a
 * spot in the standings). They act through sim.act() exactly like a human would, so
 * they can't cheat: same sellers, same buyers, same rules, same appraisal noise.
 * Each has a personality that shapes how it haggles, prices and behaves in Pawn
 * Guild events.
 */
import { capOf, nice, UP } from './sim.js';
import { ITEMS } from './items.js';

export const AI_ROSTER = [
  { name: 'Kara Voss', persona: 'greedy' },
  { name: 'Dr. Ozzo', persona: 'fair' },
  { name: 'Brakk', persona: 'paranoid' },
];

/** How each personality trades. Multipliers are on the AI's own appraisal midpoint. */
export const PERSONA = {
  greedy:   { buyAt: 0.62, sellAt: 1.35, minCounter: 1.2, shelf: 1.3, react: [1700, 3800], reserve: 150, upgradeAbove: 250 },
  fair:     { buyAt: 0.7, sellAt: 1.18, minCounter: 1.08, shelf: 1.1, react: [1900, 4200], reserve: 200, upgradeAbove: 350 },
  paranoid: { buyAt: 0.64, sellAt: 1.2, minCounter: 1.1, shelf: 1.15, react: [2100, 4400], reserve: 300, upgradeAbove: 450 },
};
const UPGRADE_ORDER = {
  greedy: ['ads', 'storage', 'sign', 'haggler', 'ads', 'storage', 'appraise'],
  fair: ['appraise', 'sign', 'storage', 'ads', 'sales', 'appraise'],
  paranoid: ['appraise', 'security', 'appraise', 'storage', 'sign', 'security'],
};

const rand = (a, b) => a + Math.random() * (b - a);
const midOf = e => (e.lo + e.hi) / 2;

export function makeAI(slot) {
  const r = AI_ROSTER[slot % AI_ROSTER.length];
  return { persona: r.persona, name: r.name, next: 0, cid: null, wait: 0, tries: 0 };
}

/** Called from Sim.tick for every AI player. */
export function aiTick(sim, p, now) {
  const ai = p.ai;
  if (!ai || p.bankrupt || now < ai.next) return;
  ai.next = now + rand(300, 700);
  const S = sim.s, P = PERSONA[ai.persona];
  switch (S.phase) {
    case 'buy': return aiBuy(sim, p, P, now);
    case 'sell': return aiSell(sim, p, P, now);
    case 'noon': return aiPrice(sim, p, P, now);
    case 'evening': return aiEvening(sim, p, P, now);
  }
}

function newCustomer(ai, c, P, now) {
  if (ai.cid === c.id) return false;
  ai.cid = c.id; ai.tries = 0;
  ai.wait = Math.max(now, c.openAt) + rand(...P.react) + (c.excl || 0);
  return true;
}

function aiBuy(sim, p, P, now) {
  const S = sim.s, ai = p.ai, c = S.seller;
  if (!c || c.done || now < c.openAt) return;
  newCustomer(ai, c, P, now);
  if (now < ai.wait) return;
  if (sim.gate(c, p, now)) return;                       // not allowed to deal yet (or refused)
  const st = sim.per(c, p.pid);
  if (st.out) return;
  const e = sim.estimate(p, c.inst);
  const mid = midOf(e);
  const reserve = Math.min(P.reserve + 20 + 3 * S.day, Math.max(0, p.cash) * 0.4);   // never freeze up when cash is tight
  const budget = Math.min(p.cash - reserve, p.cash * 0.45);
  const pass = () => { sim.act(p.pid, { type: 'pass' }, now); };
  if (e.fake) return pass();
  if (ai.persona === 'paranoid' && e.tier < 0 && e.hi > e.lo * 2.6 && Math.random() < 0.4) return pass();
  if (!c.loan && p.inv.length >= capOf(p)) return pass();
  const target = mid * (c.loan ? P.buyAt * 0.8 : P.buyAt);
  if (target < 2 || budget < 5) return pass();
  if (c.ask <= target && c.ask <= budget) { sim.act(p.pid, { type: 'take' }, now); return; }
  if (ai.tries >= 3) return pass();
  const offer = Math.max(1, Math.round(Math.min(target, budget) * [0.72, 0.86, 1][ai.tries]));
  ai.tries++;
  ai.wait = now + rand(1600, 3400);
  sim.act(p.pid, { type: 'offer', amt: offer }, now);
}

function aiSell(sim, p, P, now) {
  const S = sim.s, ai = p.ai, b = S.buyer;
  if (!b || b.done || now < b.openAt) return;
  newCustomer(ai, b, P, now);
  if (now < ai.wait) return;
  if (sim.gate(b, p, now)) return;
  const st = sim.per(b, p.pid);
  if (st.out) return;
  const el = sim.eligible(p, b);
  if (!el.length) { sim.act(p.pid, { type: 'pass' }, now); return; }
  if (st.counter) {
    const inst = p.inv.find(i => i.uid === st.counter.uid);
    if (inst && st.counter.price >= inst.paid * (p.cash < 150 ? 0.95 : P.minCounter)) { sim.act(p.pid, { type: 'takeCounter' }, now); return; }
  }
  if (ai.tries >= 3) { sim.act(p.pid, { type: 'pass' }, now); return; }
  // pitch the item with the best expected margin
  const scored = el.map(i => ({ i, mid: midOf(sim.estimate(p, i)) })).sort((a, b) => (b.mid - b.i.paid) - (a.mid - a.i.paid));
  const { i, mid } = scored[0];
  const k = (p.cash < 150 ? 1.02 : P.sellAt) - 0.12 * ai.tries;   // short on cash: sell faster
  const price = Math.max(p.cash < 150 ? Math.round(i.paid * 0.9) : Math.round(i.paid * 1.02) + 1, nice(mid * k));
  ai.tries++;
  ai.wait = now + rand(1500, 3000);
  sim.act(p.pid, { type: 'pitch', uid: i.uid, price }, now);
}

function aiPrice(sim, p, P, now) {
  if (p.ready) return;
  for (const i of p.inv) {
    const mid = midOf(sim.estimate(p, i));
    sim.act(p.pid, { type: 'price', uid: i.uid, price: Math.max(Math.round(i.paid * 1.05) + 1, nice(mid * (p.cash < 150 ? 0.95 : P.shelf))) }, now);
  }
  sim.act(p.pid, { type: 'ready', v: true }, now);
}

function staffWages(p) {
  return Object.keys(p.up).reduce((s, id) => s + (UP[id] && UP[id].wage ? UP[id].wage * p.up[id] : 0), 0);
}
/** First step of the plan the shop hasn't reached yet (the plan lists ids; repeats mean higher levels). */
function nextUpgrade(p, persona) {
  const seen = {};
  for (const id of UPGRADE_ORDER[persona]) {
    seen[id] = (seen[id] || 0) + 1;
    if (p.up[id] < seen[id] && p.up[id] < UP[id].cost.length) return id;
  }
  return null;
}

function aiEvening(sim, p, P, now) {
  const S = sim.s, ai = p.ai;
  if (S.guild && S.guild.stage !== 'reveal') return;     // guild business is handled in guild.js
  if (p.ready) return;
  // upgrades: at most one per evening, following the personality's plan, and only
  // when the purchase still leaves a cushion of several days of running costs
  const next = nextUpgrade(p, ai.persona);
  if (next) {
    const u = UP[next], cost = u.cost[p.up[next]];
    const upkeep = 20 + 3 * S.day + (u.wage || 0) + staffWages(p);
    const cushion = P.upgradeAbove + 6 * upkeep;
    if (p.cash - cost >= cushion) sim.act(p.pid, { type: 'upgrade', id: next }, now);
  }
  if (ai.persona === 'paranoid' && !p.insurance && p.inv.length >= 4) sim.act(p.pid, { type: 'insure', level: 1 }, now);
  // clear out junk when cash is tight
  if (p.cash < 120 && p.inv.length) {
    const worst = [...p.inv].sort((a, b) => ITEMS[a.id].t - ITEMS[b.id].t)[0];
    sim.act(p.pid, { type: 'dump', uid: worst.uid }, now);
  }
  sim.act(p.pid, { type: 'ready', v: true }, now);
}
