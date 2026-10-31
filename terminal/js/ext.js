/**
 * ext.js - terminal-edition mechanics layered on the shared Sim.
 *
 *   scan     spectro-scan the item at the counter (or one of yours): reads fakes and
 *            tightens the value range. Costs credits and, at the counter, the seller's patience.
 *   dossier  pull the current customer's colony record: bottom line / budget, fraud flags,
 *            loan reliability, how sharp their eye is. Costs credits and a little patience.
 *   hack     at noon or in the evening, breach a rival's books or intercept their sealed
 *            Pawn Guild answer. Can fail; a traced breach costs a fine and names you to the target.
 *
 * Everything runs inside the authoritative sim, so it works the same in solo and multiplayer.
 */
import { Sim, nice, hash01, genuineValue, trueValue, COND, UPGRADES } from './sim.js';
import { ITEMS } from './items.js';
import { PROFILES, cr } from './profiles.js';
import { EVENTS } from './guild.js';

export const COST = { scan: 25, dossier: 15, hack: 40 };
export const HACKS_PER_SOL = 2;
const SCAN_PATIENCE = 3000, DOSSIER_PATIENCE = 2000;

const FIRST = ['Ada', 'Bex', 'Cato', 'Dara', 'Emre', 'Fen', 'Gia', 'Hollis', 'Ivo', 'Juno', 'Kel', 'Lio', 'Mara', 'Nox', 'Oren', 'Pia', 'Quill', 'Rhea', 'Sol', 'Tavi', 'Uma', 'Vesh', 'Wren', 'Yara', 'Zeb'];
const LAST = ['Okafor', 'Lindqvist', 'Tanaka', 'Moreau', 'Rao', 'Kessler', 'Ibarra', 'Novak', 'Achebe', 'Halloran', 'Sato', 'Petrov', 'Delacroix', 'Mbeki', 'Varga', 'Quinn'];
const ALIEN = { grey: ['Broker 7-Ul', 'Broker Seh-4', 'Envoy Tal-9'], glorp: ['Glorp (unregistered)', 'Blib of Glorp', 'Gloop-Gloop'], zix: ['Zix hive unit 33', 'Zix swarmling 108', 'Zix node K'] };

export function citizen(prof, seed) {
  const s = Math.abs(seed | 0);
  const kind = PROFILES[prof]?.kind;
  const name = ALIEN[kind] ? ALIEN[kind][s % 3] : `${FIRST[s % FIRST.length]} ${LAST[(s >> 5) % LAST.length]}`;
  const id = 'MC-' + String(100000 + (s % 899999)).slice(0, 6) + '-' + 'ABCDEFGHJK'[(s >> 9) % 10];
  return { name, id };
}

export class TermSim extends Sim {
  static load(json) {
    const base = Sim.load(json);
    const sim = new TermSim(json.cfg); sim.s = base.s;
    return sim;
  }
  nextDay(now) {
    for (const p of Object.values(this.s.players)) if (p.intel) p.intel.dossiers = {};
    return super.nextDay(now);
  }
  intel(p) { return (p.intel ||= { scans: {}, dossiers: {}, files: {}, hacks: { day: 0, n: 0 } }); }

  act(pid, a, now) {
    const p = this.s.players[pid];
    if (!p || !a) return;
    if (a.type === 'scan') return this.scan(p, a, now);
    if (a.type === 'dossier') return this.dossier(p, now);
    if (a.type === 'hack') return this.hack(p, a, now);
    return super.act(pid, a, now);
  }

  pay(p, amt) {
    if (p.bankrupt) { this.toast(p.pid, 'You are bankrupt.', 'err'); return false; }
    if (p.cash < amt) { this.toast(p.pid, `Need ${cr(amt)} for that.`, 'err'); return false; }
    p.cash -= amt; p.stats.spent += amt; this.dirty = true; return true;
  }

  /* ------------------------------------------------------------- scan --- */
  scan(p, a, now) {
    const S = this.s, I = this.intel(p);
    let inst, atCounter = false;
    if (a.uid) inst = p.inv.find(i => i.uid === a.uid);
    else {
      if (S.phase !== 'buy') return this.toast(p.pid, 'Nothing on the counter to scan.', 'err');
      const c = S.seller, g = this.gate(c, p, now);
      if (g) return this.toast(p.pid, g, 'err');
      inst = c.inst; atCounter = true;
    }
    if (!inst) return;
    if (I.scans[inst.uid]) return this.toast(p.pid, 'Already scanned. See the scanner readout.', 'info');
    if (!this.pay(p, COST.scan)) return;
    if (atCounter) {
      const c = S.seller;
      c.until = Math.max(now + 1500, c.until - SCAN_PATIENCE);
      if (this.multi) this.feed(c, `${p.name} ran a scan on the item`);
    }
    const acc = 0.8 + 0.04 * p.up.appraise;
    const r = hash01(p.pid + 'scan' + inst.uid);
    const readsFake = inst.fake ? r < acc : r < (1 - acc) / 3;
    const base = readsFake ? Math.max(1, Math.round(genuineValue(inst) * 0.06)) : genuineValue(inst);
    const n = hash01(p.pid + 'sv' + inst.uid) * 2 - 1;
    const c0 = base * (1 + n * 0.05);
    const it = ITEMS[inst.id];
    const sig = Array.from({ length: 12 }, (_, k) => Math.round(2 + 6 * hash01(inst.uid + 'sp' + k)));
    I.scans[inst.uid] = {
      itemId: inst.id, cond: inst.cond, day: S.day,
      verdict: readsFake ? 'COUNTERFEIT' : 'AUTHENTIC', conf: Math.round(acc * 100),
      lo: nice(c0 * 0.92), hi: nice(c0 * 1.08), tier: it.t, sig,
      notes: [
        `Material match: ${readsFake ? 'FAIL' : 'PASS'} (${it.cat})`,
        `Wear profile: ${COND[inst.cond].n}`,
        readsFake ? 'Serial does not resolve in colony registry.' : 'Serial resolves in colony registry.',
      ],
    };
    this.fx({ type: 'intel', pid: p.pid, kind: 'scan', uid: inst.uid });
    this.dirty = true;
  }

  /* ---------------------------------------------------------- dossier --- */
  dossier(p, now) {
    const S = this.s, I = this.intel(p);
    const c = S.phase === 'buy' ? S.seller : S.phase === 'sell' ? S.buyer : null;
    const g = this.gate(c, p, now);
    if (g) return this.toast(p.pid, g, 'err');
    if (I.dossiers[c.id]) return this.toast(p.pid, 'Dossier already on file.', 'info');
    if (!this.pay(p, COST.dossier)) return;
    c.until = Math.max(now + 1500, c.until - DOSSIER_PATIENCE);
    const P = PROFILES[c.prof], who = citizen(c.prof, c.look);
    const h = k => hash01(p.pid + k + c.id);
    const lines = [];
    let bottom = null, budget = null;
    if (c.inst) {
      bottom = nice(c.F * (1 + (h('f') - 0.5) * 0.24));
      lines.push(c.loan ? `Lowest loan they will take: about ${cr(bottom)}.` : `Bottom line: about ${cr(bottom)}.`);
      const flagged = c.inst.fake ? h('x') < 0.75 : h('x') < 0.08;
      lines.push(flagged ? 'FLAG: prior counterfeit complaints on file.' : 'No fraud complaints on file.');
      if (c.loan) lines.push(`Loan history: repays ${Math.round((P.repay ?? 0.75) * 100)}% of the time.`);
      if (c.hard) lines.push('Benefits office: account overdrawn. Motivated seller.');
      lines.push(`Patience: ${(P.sell.time || 1) < 0.8 ? 'short' : (P.sell.time || 1) > 1.2 ? 'long' : 'average'}. Tolerates ${3 + (P.sell.strikes || 0)} lowballs.`);
    } else {
      const m = c.mult * (1 + 0.06 * p.up.sales + 0.025 * p.up.sign);
      budget = Math.round(m * 100 * (1 + (h('b') - 0.5) * 0.12) / 5) * 5;
      lines.push(`Spending pattern: pays about ${budget}% of real value.`);
      const det = P.buy.detect ?? 0.55;
      lines.push(`Eye for fakes: ${det > 0.7 ? 'sharp' : det < 0.35 ? 'easily fooled' : 'average'}.`);
      const bonus = Object.keys(P.buy.bonus || {});
      if (bonus.length) lines.push(`Overpays for: ${bonus.join(', ')}.`);
      if (P.buy.junk) lines.push('Dislikes junk.');
    }
    I.dossiers[c.id] = { custId: c.id, prof: c.prof, look: c.look, name: who.name, cid: who.id, kind: P.name, tell: P.tell, bottom, budget, lines, day: S.day };
    if (this.multi) this.feed(c, `${p.name} pulled a records check`);
    this.fx({ type: 'intel', pid: p.pid, kind: 'dossier', id: c.id });
    this.dirty = true;
  }

  /* ------------------------------------------------------------- hack --- */
  hack(p, a, now) {
    const S = this.s, I = this.intel(p);
    if (S.phase !== 'evening' && S.phase !== 'noon') return this.toast(p.pid, 'NETLINK only works while the shop is closed (midday or evening).', 'err');
    const t = S.players[a.target];
    if (!t || t === p || t.bankrupt) return this.toast(p.pid, 'No such target.', 'err');
    if (I.hacks.day !== S.day) I.hacks = { day: S.day, n: 0 };
    if (I.hacks.n >= HACKS_PER_SOL) return this.toast(p.pid, 'Your uplink is burned for this sol.', 'err');
    const kind = a.kind === 'guild' ? 'guild' : 'books';
    if (kind === 'guild' && (!S.guild || S.guild.stage === 'reveal')) return this.toast(p.pid, 'No Guild vote in progress.', 'err');
    if (!this.pay(p, COST.hack)) return;
    I.hacks.n++;
    const chance = Math.max(0.25, 0.7 - 0.13 * t.up.security);
    if (Math.random() >= chance) {
      if (Math.random() < 0.5) {
        const fine = 60 + Math.round(Math.max(0, p.cash) * 0.1);
        p.cash -= fine;
        this.toast(p.pid, `Breach traced. Colony security fined you ${cr(fine)}, and ${t.name} knows it was you.`, 'bad');
        this.toast(t.pid, `Intrusion blocked. Trace points to ${p.name}.`, 'bad');
        this.log(`Colony security fined ${p.name} for a network intrusion.`);
      } else {
        this.toast(p.pid, `Firewall held at ${t.name}'s shop. No trace.`, 'bad');
      }
      this.fx({ type: 'intel', pid: p.pid, kind: 'hackfail' });
      this.dirty = true;
      return;
    }
    const f = (I.files[t.pid] ||= { name: t.name });
    if (kind === 'books') {
      f.books = {
        day: S.day, cash: t.cash, n: t.inv.length,
        inv: [...t.inv].sort((x, y) => (y.paid || 0) - (x.paid || 0)).slice(0, 6)
          .map(i => ({ id: i.id, cond: i.cond, paid: i.paid, price: i.price ?? null, fake: i.fake && hash01(p.pid + 'hk' + i.uid) < 0.5 })),
        up: { ...t.up }, insurance: t.insurance || 0, loans: t.loans.length,
      };
    } else {
      const g = S.guild;
      const has = t.pid in g.choices;
      let v = has ? g.choices[t.pid] : null;
      if (has && g.id === 'informant') v = v === 'none' ? 'nobody' : (S.players[v]?.name || v);
      if (has && g.id === 'pricefix') v = v === 'cheat' ? 'will secretly undercut' : 'will honor the pact';
      if (has && g.id === 'gift') v = g.stage === 'choose' ? `keeps ${cr(v)}` : v;
      f.guild = { day: S.day, title: EVENTS[g.id].title, stage: g.stage, answer: has ? String(v) : null };
    }
    if (Math.random() < 0.15) this.toast(t.pid, 'Network anomaly detected. Someone may have been in your systems.', 'info');
    this.fx({ type: 'intel', pid: p.pid, kind: 'hack', target: t.pid });
    this.dirty = true;
  }

  viewFor(pid, now) {
    const v = super.viewFor(pid, now);
    if (!v) return v;
    const p = this.s.players[pid], I = this.intel(p);
    const keep = new Set(p.inv.map(i => i.uid));
    if (this.s.seller) keep.add(this.s.seller.inst.uid);
    for (const l of p.loans) keep.add(l.inst.uid);
    const scans = {};
    for (const [uid, s] of Object.entries(I.scans)) if (keep.has(uid)) scans[uid] = s;
    const c = this.s.phase === 'buy' ? this.s.seller : this.s.phase === 'sell' ? this.s.buyer : null;
    if (v.seller) v.seller.uid = this.s.seller.inst.uid;
    v.intel = {
      scans, dossier: c ? I.dossiers[c.id] || null : null, files: I.files,
      hacksLeft: I.hacks.day === this.s.day ? HACKS_PER_SOL - I.hacks.n : HACKS_PER_SOL,
      guildOpen: !!(this.s.guild && this.s.guild.stage !== 'reveal'),
    };
    return v;
  }
}
export { UPGRADES };
