/**
 * guild.js - Pawn Guild events: small social dilemmas that hit every shop at once.
 *
 * Every 5 sols, in the evening, the Pawn Guild posts one notice, drawn from a
 * shuffled deck so all seven happen before any repeats. Every shop (humans and AI)
 * decides in secret; choices are revealed anonymously, then the outcome lands.
 *
 *   tribute   pay the Guild; if the total falls short every shop is raided,
 *             otherwise only the lowest payer is raided and the top payer is rewarded
 *   pricefix  sign a 5-sol price pact; secretly undercutting pays, unless you're caught
 *   blackout  fund grid repairs; free riders still get the benefit
 *   informant anonymously report a rival for fakes; a false report costs you
 *   gift      the leader proposes how to split a Guild gift; the rest can veto it
 *   favor     all-pay auction: everyone pays their bid, only the highest wins
 *   supply    claim crates from a supply ship; overclaim and the ship is impounded
 */
import { ITEMS, BY_TIER } from './items.js';
import { nice, trueValue, capOf } from './sim.js';
import { cr } from './profiles.js';

export const GUILD_EVERY = 5;
const STAGE_MS = 45000;          // multiplayer decision timer per stage
const AI_DELAY = [1200, 3500];

const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const worthOf = p => p.cash + p.inv.reduce((s, i) => s + (i.paid || 0), 0);

export const EVENTS = {
  tribute: {
    title: 'Guild Tribute',
    text: g => `The Pawn Guild demands ${cr(g.demand)} in total from the shops of this colony. Pledge in secret. If the total falls short, every shop is raided. If it's met, the shop that pledged least is raided anyway, and the most generous shop earns a Guild favor.`,
    input: g => ({ kind: 'number', label: 'Your pledge', max: 'cash', suggest: Math.round(g.demand / g.n) }),
  },
  pricefix: {
    title: 'Price Pact',
    text: () => 'The Guild proposes a pact: for the next 5 sols, every shop keeps prices high. If every shop honors it, buyers pay 20% more everywhere. A shop that signs but secretly undercuts gets the bigger bonus, but honest shops get less, and Guild inspectors may catch and fine cheaters.',
    input: () => ({ kind: 'choice', options: [['keep', 'Sign and honor it'], ['cheat', 'Sign, then secretly undercut']] }),
  },
  blackout: {
    title: 'Grid Failure',
    text: g => `The dome power grid is failing. Repairs cost ${cr(g.target)}. Chip in what you like. If the total covers it, every shop gets a traffic boost for 3 sols. If not, there's a blackout and nobody gets walk-in shoppers next sol. Shops that pay nothing still get the boost.`,
    input: g => ({ kind: 'number', label: 'Your contribution', max: 'cash', suggest: Math.round(g.target / g.n) }),
  },
  informant: {
    title: 'The Informant',
    text: () => 'Guild inspectors are cracking down on fakes and pay for anonymous tips. Report one rival shop, or nobody. If inspectors find fakes there, they confiscate them, fine that shop, and pay you. If the shop is clean, you pay the fine instead.',
    input: () => ({ kind: 'target' }),
  },
  gift: {
    title: "The Guild's Gift",
    text: g => `The Guild gives ${cr(g.pot)} to the colony's leading shop to share. The leader decides how much to keep; the rest is split evenly among the other shops. If most of the other shops reject the split, nobody gets anything.`,
    input: g => (g.stage === 'choose'
      ? { kind: 'number', label: 'Amount you keep', max: g.pot, suggest: Math.round(g.pot / g.n), who: 'proposer' }
      : { kind: 'choice', options: [['accept', 'Accept the split'], ['reject', 'Reject it']], who: 'others' }),
  },
  favor: {
    title: 'Auction of Favor',
    text: g => `The Guild auctions a favor: a Rare item from its vault (${ITEMS[g.prize].n}). Bid in secret. The highest bid wins it, but every shop pays what it bid, win or lose.`,
    input: () => ({ kind: 'number', label: 'Your bid', max: 'cash', suggest: 0 }),
  },
  supply: {
    title: 'Supply Ship',
    text: g => `A supply ship has ${g.crates} unclaimed crates of goods. Each shop claims a number of crates in secret. If the claims add up to ${g.crates} or fewer, everyone gets what they claimed. If they add up to more, the Guild impounds the ship and nobody gets anything.`,
    input: g => ({ kind: 'number', label: 'Crates you claim', max: g.crates, suggest: Math.floor(g.crates / g.n) }),
  },
};
export const EVENT_IDS = Object.keys(EVENTS);

/* --------------------------------------------------------------- start --- */

/** Called when the evening begins. Starts an event on every 5th sol if there are rivals. */
export function maybeStartGuild(sim, now) {
  const S = sim.s;
  const live = sim.live();
  if (S.day % GUILD_EVERY !== 0 || live.length < 2) return;
  if (!S.guildDeck || !S.guildDeck.length) S.guildDeck = shuffle([...EVENT_IDS]);
  const id = S.guildDeck.shift();
  const n = live.length;
  const g = { id, n, stage: 'choose', choices: {}, due: {}, endsAt: S.cfg.mode === 'mp' ? now + STAGE_MS : 0, result: null, pids: live.map(p => p.pid) };
  if (id === 'tribute') g.demand = nice((80 + 20 * S.day) * n);
  if (id === 'blackout') g.target = nice((80 + 15 * S.day) * n);
  if (id === 'gift') {
    g.pot = nice(500 + 60 * S.day);
    g.proposer = [...live].sort((a, b) => worthOf(b) - worthOf(a))[0].pid;
  }
  if (id === 'favor') g.prize = pick(BY_TIER[3]);
  if (id === 'supply') g.crates = 3 * n;
  for (const p of live) if (p.ai) g.due[p.pid] = now + rand(...AI_DELAY);
  S.guild = g;
  sim.fx({ type: 'guild', id });
  sim.log(`Pawn Guild notice: ${EVENTS[id].title}`);
}

/** Who still has to answer in the current stage. */
function waitingOn(sim, g) {
  const live = g.pids.map(id => sim.s.players[id]).filter(p => p && !p.bankrupt);
  let need = live;
  if (g.id === 'gift') need = g.stage === 'choose' ? live.filter(p => p.pid === g.proposer) : live.filter(p => p.pid !== g.proposer);
  return need.filter(p => !(p.pid in g.choices));
}

/* -------------------------------------------------------------- actions --- */

export function guildAct(sim, p, value, now) {
  const g = sim.s.guild;
  if (!g || g.stage === 'reveal') return;
  if (!waitingOn(sim, g).some(x => x.pid === p.pid)) return;
  g.choices[p.pid] = clean(sim, g, p, value);
  sim.dirty = true;
  if (!waitingOn(sim, g).length) advance(sim, now);
}

function clean(sim, g, p, v) {
  const spec = EVENTS[g.id].input(g);
  if (spec.kind === 'number') {
    const max = spec.max === 'cash' ? Math.max(0, p.cash) : spec.max;
    return Math.max(0, Math.min(max, Math.floor(+v) || 0));
  }
  if (spec.kind === 'choice') return spec.options.some(o => o[0] === v) ? v : spec.options[0][0];
  if (spec.kind === 'target') return v && v !== p.pid && sim.s.players[v] ? v : 'none';
  return v;
}

/** Default answers for anyone who timed out. */
function fillDefaults(sim, g) {
  for (const p of waitingOn(sim, g)) {
    const spec = EVENTS[g.id].input(g);
    g.choices[p.pid] = spec.kind === 'number' ? 0 : spec.kind === 'target' ? 'none' : spec.options[0][0];
  }
}

export function guildTick(sim, now) {
  const g = sim.s.guild;
  if (!g || g.stage === 'reveal') return;
  // AI decisions arrive after a short think
  for (const p of waitingOn(sim, g)) {
    if (p.ai && now >= (g.due[p.pid] || 0)) {
      g.choices[p.pid] = clean(sim, g, p, aiChoice(sim, g, p));
      sim.dirty = true;
    }
  }
  if (g.endsAt && now >= g.endsAt) fillDefaults(sim, g);
  if (!waitingOn(sim, g).length) advance(sim, now);
}

function advance(sim, now) {
  const g = sim.s.guild;
  if (g.id === 'gift' && g.stage === 'choose') {
    g.keep = g.choices[g.proposer] ?? Math.round(g.pot / g.n);
    g.stage = 'vote';
    g.choices = { [g.proposer]: g.keep };
    g.endsAt = sim.s.cfg.mode === 'mp' ? now + STAGE_MS : 0;
    for (const id of g.pids) if (sim.s.players[id]?.ai) g.due[id] = now + rand(...AI_DELAY);
    sim.dirty = true;
    return;
  }
  resolve(sim, now);
}

/* -------------------------------------------------------------- resolve --- */

function raid(sim, p) {
  if (p.inv.length) {
    const it = [...p.inv].sort((a, b) => trueValue(b) - trueValue(a))[0];
    p.inv = p.inv.filter(i => i !== it);
    return `Guild enforcers raided your shop and took your ${ITEMS[it.id].n}.`;
  }
  const take = Math.max(40, Math.round(Math.max(0, p.cash) * 0.15));
  p.cash -= take;
  return `Guild enforcers raided your shop and took ${cr(take)}.`;
}

function giveItem(sim, p, id, paid = 0) {
  const inst = { uid: 'i' + sim.s.uid++, id, cond: 2, vm: 1, fake: false, paid, day: sim.s.day };
  inst.price = sim.suggestPrice(p, inst);
  p.inv.push(inst);
  return inst;
}

function resolve(sim, now) {
  const S = sim.s, g = S.guild;
  const players = g.pids.map(id => S.players[id]).filter(Boolean);
  const C = g.choices;
  const pub = [], mine = {}, reveal = [];
  const say = (p, t) => (mine[p.pid] ||= []).push(t);

  switch (g.id) {
    case 'tribute': {
      let total = 0;
      for (const p of players) { const v = C[p.pid] || 0; p.cash -= v; total += v; reveal.push(`A shop pledged ${cr(v)}`); say(p, `You pledged ${cr(v)}.`); }
      pub.push(`Pledged ${cr(total)} of the ${cr(g.demand)} demanded.`);
      if (total < g.demand) {
        pub.push('The demand was not met. Every shop was raided.');
        for (const p of players) say(p, raid(sim, p));
      } else {
        const vals = players.map(p => C[p.pid] || 0);
        const lo = Math.min(...vals), hi = Math.max(...vals);
        pub.push('The demand was met. The lowest pledge was raided; the highest earned a favor.');
        const low = players.filter(p => (C[p.pid] || 0) === lo);
        const top = players.filter(p => (C[p.pid] || 0) === hi);
        if (lo === hi) { pub.push('Every pledge was equal, so the Guild let it slide.'); break; }
        for (const p of low) say(p, raid(sim, p));
        const winner = pick(top);
        const inst = giveItem(sim, winner, pick(BY_TIER[2]));
        say(winner, `Your generosity was noted. The Guild sent you a ${ITEMS[inst.id].n}.`);
      }
      break;
    }
    case 'pricefix': {
      const cheaters = players.filter(p => C[p.pid] === 'cheat').map(p => p.pid);
      for (const p of players) reveal.push(C[p.pid] === 'cheat' ? 'A shop signed... with its fingers crossed' : 'A shop signed and meant it');
      const mult = {};
      for (const p of players) mult[p.pid] = cheaters.length === 0 ? 1.2 : cheaters.includes(p.pid) ? (cheaters.length === 1 ? 1.4 : 1.1) : 1.05;
      S.mods.pact = { until: S.day + 5, mult, cheaters };
      if (!cheaters.length) pub.push('Every shop honors the pact. Buyers pay 20% more everywhere for 5 sols.');
      else pub.push(`${cheaters.length === 1 ? 'One shop is' : `${cheaters.length} shops are`} secretly undercutting. Honest shops get only +5%. Inspectors will be watching.`);
      for (const p of players) say(p, `Your price bonus for the next 5 sols: +${Math.round((mult[p.pid] - 1) * 100)}%.`);
      break;
    }
    case 'blackout': {
      let total = 0;
      for (const p of players) { const v = C[p.pid] || 0; p.cash -= v; total += v; reveal.push(`A shop chipped in ${cr(v)}`); say(p, `You chipped in ${cr(v)}.`); }
      pub.push(`Raised ${cr(total)} of ${cr(g.target)}.`);
      if (total >= g.target) { S.mods.boost = { until: S.day + 3 }; pub.push('The grid is fixed. Every shop gets more walk-in shoppers for 3 sols.'); }
      else { S.mods.blackout = { day: S.day + 1 }; pub.push('Not enough. There will be a blackout: no walk-in shoppers next sol.'); }
      break;
    }
    case 'informant': {
      let hits = 0, misses = 0;
      for (const p of players) {
        const t = C[p.pid];
        if (!t || t === 'none') { reveal.push('A shop kept quiet'); continue; }
        reveal.push('A shop filed a report');
        const target = S.players[t];
        if (!target) continue;
        const fakes = target.inv.filter(i => i.fake);
        if (fakes.length) {
          hits++;
          target.inv = target.inv.filter(i => !i.fake);
          const fine = Math.max(50, Math.round(target.cash * 0.1));
          target.cash -= fine;
          const reward = 100 + 50 * fakes.length;
          p.cash += reward;
          say(p, `Your tip on ${target.name} was right. Inspectors found ${fakes.length} fake${fakes.length > 1 ? 's' : ''}. You were paid ${cr(reward)}.`);
          say(target, `Someone reported you. Inspectors confiscated ${fakes.length} fake${fakes.length > 1 ? 's' : ''} and fined you ${cr(fine)}.`);
        } else {
          misses++;
          p.cash -= 150;
          say(p, `Your tip on ${target.name} was wrong. Their shop was clean. You paid a ${cr(150)} fine.`);
          say(target, 'Someone reported you, but inspectors found nothing.');
        }
      }
      pub.push(hits + misses ? `${hits + misses} report${hits + misses > 1 ? 's' : ''} filed: ${hits} found fakes, ${misses} came up clean.` : 'Nobody filed a report.');
      break;
    }
    case 'gift': {
      const others = players.filter(p => p.pid !== g.proposer);
      const keep = Math.max(0, Math.min(g.pot, g.keep ?? 0));
      const each = others.length ? Math.floor((g.pot - keep) / others.length) : 0;
      const rejects = others.filter(p => C[p.pid] === 'reject').length;
      pub.push(`The leader kept ${cr(keep)} and offered ${cr(each)} to each other shop.`);
      for (const p of others) reveal.push(C[p.pid] === 'reject' ? 'A shop rejected it' : 'A shop accepted it');
      if (rejects * 2 >= others.length && others.length) {
        pub.push('Most shops rejected the split. The Guild took its gift back. Nobody gets anything.');
      } else {
        pub.push('The split was accepted.');
        S.players[g.proposer].cash += keep;
        for (const p of others) p.cash += each;
        say(S.players[g.proposer], `You kept ${cr(keep)}.`);
        for (const p of others) say(p, `You received ${cr(each)}.`);
      }
      break;
    }
    case 'favor': {
      const bids = players.map(p => ({ p, v: C[p.pid] || 0 }));
      for (const b of bids) { b.p.cash -= b.v; reveal.push(`A shop bid ${cr(b.v)}`); }
      const hi = Math.max(...bids.map(b => b.v));
      if (hi <= 0) { pub.push('Nobody bid. The Guild keeps its favor.'); break; }
      const win = pick(bids.filter(b => b.v === hi));
      giveItem(sim, win.p, g.prize, hi);
      pub.push(`The winning bid was ${cr(hi)}. Every shop paid what it bid.`);
      say(win.p, `You won the ${ITEMS[g.prize].n}.`);
      for (const b of bids) if (b !== win && b.v > 0) say(b.p, `You lost the auction and paid ${cr(b.v)} for nothing.`);
      break;
    }
    case 'supply': {
      let total = 0;
      for (const p of players) { const v = C[p.pid] || 0; total += v; reveal.push(`A shop claimed ${v} crate${v === 1 ? '' : 's'}`); }
      pub.push(`${total} crates claimed out of ${g.crates}.`);
      if (total > g.crates) { pub.push('Too many claims. The Guild impounded the ship. Nobody gets anything.'); break; }
      pub.push('Claims honored. Every shop gets what it asked for.');
      for (const p of players) {
        const n = C[p.pid] || 0;
        let got = 0;
        for (let i = 0; i < n && p.inv.length < capOf(p); i++) { giveItem(sim, p, pick(BY_TIER[Math.random() < 0.7 ? 1 : 2])); got++; }
        if (n) say(p, `You unloaded ${got} crate${got === 1 ? '' : 's'} onto your shelves${got < n ? ` (${n - got} didn't fit in storage)` : ''}.`);
      }
      break;
    }
  }
  shuffle(reveal);
  g.stage = 'reveal';
  g.result = { pub, mine, reveal };
  g.endsAt = 0;
  for (const p of players) if (p.cash < 0 && !p.inv.length) { p.bankrupt = true; p.ready = true; }
  sim.log(`Pawn Guild: ${pub[pub.length - 1]}`);
  sim.fx({ type: 'guildReveal', id: g.id });
  if (S.phaseEnd) S.phaseEnd = Math.max(S.phaseEnd, now + 30000);
  sim.dirty = true;
}

/* ------------------------------------------------------------------ AI --- */

function aiChoice(sim, g, p) {
  const per = p.ai?.persona || 'fair';
  const n = g.n, cash = Math.max(0, p.cash);
  const others = g.pids.filter(id => id !== p.pid && sim.s.players[id] && !sim.s.players[id].bankrupt);
  switch (g.id) {
    case 'tribute': {
      const share = g.demand / n;
      const k = per === 'greedy' ? rand(0.55, 0.9) : per === 'fair' ? rand(0.95, 1.15) : rand(1.15, 1.5);
      return Math.min(cash * 0.3, Math.round(share * k));
    }
    case 'pricefix': return Math.random() < (per === 'greedy' ? 0.7 : per === 'fair' ? 0.1 : 0.45) ? 'cheat' : 'keep';
    case 'blackout': {
      const share = g.target / n;
      const k = per === 'greedy' ? rand(0, 0.4) : per === 'fair' ? rand(0.9, 1.1) : rand(0.4, 0.9);
      return Math.min(cash * 0.25, Math.round(share * k));
    }
    case 'informant': {
      const chance = per === 'greedy' ? 0.5 : per === 'fair' ? 0.1 : 0.45;
      if (!others.length || Math.random() > chance) return 'none';
      if (per === 'greedy') return [...others].sort((a, b) => worthOf(sim.s.players[b]) - worthOf(sim.s.players[a]))[0];
      return pick(others);
    }
    case 'gift': {
      if (g.stage === 'choose') return Math.round(g.pot * (per === 'greedy' ? 0.85 : per === 'fair' ? 1 / n : 0.6));
      const each = (g.pot - (g.keep || 0)) / Math.max(1, n - 1), fair = g.pot / n;
      if (per === 'greedy') return each > 0 ? 'accept' : 'reject';
      if (per === 'fair') return each >= fair * 0.6 ? 'accept' : 'reject';
      return each >= fair * 0.3 ? 'accept' : 'reject';
    }
    case 'favor': {
      const k = per === 'greedy' ? rand(0.05, 0.15) : per === 'fair' ? rand(0.03, 0.1) : rand(0.08, 0.15);
      return Math.round(cash * k);
    }
    case 'supply': {
      const fair = g.crates / n;
      const k = per === 'greedy' ? rand(1.2, 1.8) : per === 'fair' ? 1 : rand(0.6, 0.9);
      return Math.max(0, Math.round(fair * k));
    }
  }
  return 0;
}

/* ---------------------------------------------------------------- view --- */

export function guildView(sim, pid, now) {
  const S = sim.s, g = S.guild;
  if (!g) return null;
  const p = S.players[pid];
  const E = EVENTS[g.id];
  const spec = g.stage === 'reveal' ? null : E.input(g);
  const myTurn = g.stage !== 'reveal' && waitingOn(sim, g).some(x => x.pid === pid);
  const v = {
    id: g.id, stage: g.stage, title: E.title, text: E.text(g),
    left: g.endsAt ? Math.max(0, g.endsAt - now) : 0,
    myTurn, chosen: pid in g.choices, waiting: g.stage === 'reveal' ? 0 : waitingOn(sim, g).length,
    input: spec && { ...spec, max: spec.max === 'cash' ? Math.max(0, p?.cash || 0) : spec.max },
    targets: g.id === 'informant' ? g.pids.filter(id => id !== pid && S.players[id]).map(id => ({ pid: id, name: S.players[id].name })) : null,
    isProposer: g.proposer === pid,
    offer: g.id === 'gift' && g.stage !== 'choose' ? { keep: g.keep, each: Math.floor((g.pot - g.keep) / Math.max(1, g.n - 1)) } : null,
    result: g.result ? { pub: g.result.pub, reveal: g.result.reveal, mine: g.result.mine[pid] || [] } : null,
  };
  return v;
}
