/**
 * profiles.js - the customer types who walk into a Mars pawn shop in 2149.
 *
 * Each profile changes how a customer haggles, not just how they look.
 *   sw / bw      spawn weight as a seller / as a buyer
 *   cats         categories they tend to bring in or ask for
 *   sell.floor   their hidden bottom line, as a fraction of the item's value
 *   sell.ask     opening ask, as a multiple of their bottom line
 *   sell.time    patience timer multiplier
 *   sell.strikes extra (or fewer) lowballs tolerated
 *   sell.fake    chance an Uncommon+ item they bring is a fake (default 13%)
 *   sell.tier    shifts the item quality they bring (like advertising levels)
 *   sell.give    extra speed at which they drop their ask while haggling
 *   buy.mult     what they will pay, as a multiple of real value
 *   buy.bonus    per-category multipliers on top of mult
 *   buy.detect   chance they spot a fake you try to sell them (default 55%)
 *   buy.junk     multiplier applied to Junk-tier items
 *   loan         chance a customer asks for a pawn loan instead of selling
 *   repay        chance they come back and repay a loan (otherwise you keep the item)
 *   voice        speech lines; {p} is a price, {c} a category
 */

export const PROFILES = {
  colonist: {
    loan: 0.25, repay: 0.8,
    name: 'Colonist', kind: 'human', sw: 18, bw: 16,
    tell: 'A regular dome-dweller. No surprises.',
    sell: { floor: [0.32, 1.05], ask: [1.35, 1.9] },
    buy: { mult: [0.82, 1.3] },
    voice: {},
  },
  miner: {
    loan: 0.3, repay: 0.85,
    name: 'Dome Miner', kind: 'miner', sw: 12, bw: 10, cats: ['Tools', 'Minerals'],
    tell: 'On a short shift break. Sells cheap and fast, but has little patience.',
    sell: { floor: [0.25, 0.7], ask: [1.3, 1.6], time: 0.6 },
    buy: { mult: [0.9, 1.25], time: 0.6 },
    voice: {
      loanAsk: ['Need {p} till payday. Hold this.'],
      ask: ['{p}. Make it quick.', '{p}, my shift starts soon.'],
      counter: ['{p}. Clock is ticking.', 'Fine, {p}. Hurry up.'],
      insult: ["I've met rocks smarter than that offer.", 'Not a chance.'],
      walk: ['No time for this.'],
      want: ['Need {c}. Fast.'],
      buyer: ['{p}. Take it or leave it, shift starts.'],
    },
  },
  tourist: {
    loan: 0.05, repay: 0.9,
    name: 'Earth Tourist', kind: 'tourist', sw: 3, bw: 10, cats: ['Xeno Artifacts', 'Art', 'Minerals'],
    tell: 'Fresh off the shuttle from Earth. Overpays and rarely spots a fake.',
    sell: { floor: [0.5, 1.2], ask: [1.3, 1.8] },
    buy: { mult: [1.05, 1.6], detect: 0.2 },
    voice: {
      ask: ['Is {p} fair? It is, right?'],
      counter: ['Ooh, {p}?', 'My guidebook says {p}.'],
      insult: ['Wow. Rude.', 'Is that how Martians haggle?'],
      want: ['Any real Martian {c}?', 'Got souvenirs? {c} maybe?'],
      buyer: ['{p}! Wait till they see this back home!'],
      deal: ['Amazing! Mars is the best!'],
    },
  },
  collector: {
    loan: 0.1, repay: 0.95,
    name: 'Relic Collector', kind: 'collector', sw: 7, bw: 7, cats: ['Earth Relics', 'Music', 'Art'],
    tell: 'Knows exactly what old Earth things are worth. Pays extra for Earth Relics and spots fakes.',
    sell: { floor: [0.8, 1.05], ask: [1.15, 1.4], strikes: -1 },
    buy: { mult: [0.85, 1.1], bonus: { 'Earth Relics': 1.35 }, detect: 0.95 },
    voice: {
      ask: ['{p}. I know its worth.'],
      counter: ['I could accept {p}.', '{p}, and not a credit less.'],
      insult: ['I know exactly what this is worth.', 'Please. Be serious.'],
      want: ['Any genuine {c}?', 'Seeking authentic {c}.'],
      buyer: ['A fair price is {p}.'],
      fake: ['A forgery. How dare you.'],
    },
  },
  smuggler: {
    loan: 0.25, repay: 0.45,
    name: 'Smuggler', kind: 'smuggler', sw: 7, bw: 5,
    tell: 'Suspiciously cheap. Brings lots of fakes. Buys anything, never checks, pays little.',
    sell: { floor: [0.15, 0.45], ask: [1.4, 2.0], fake: 0.4, time: 0.8 },
    buy: { mult: [0.6, 0.9], detect: 0 },
    voice: {
      loanAsk: ['{p}. Hold this for me. No questions.'],
      ask: ['{p}. No questions.'],
      counter: ['{p}. Final. Keep it down.'],
      insult: ['Keep your voice down.'],
      walk: ['Forget you saw me.'],
      want: ['Got any {c}? Quietly.'],
      buyer: ['{p}, cash, now.'],
    },
  },
  spacer: {
    loan: 0.2, repay: 0.75,
    name: 'Freighter Spacer', kind: 'astro', sw: 9, bw: 11, cats: ['Ship Parts', 'Gear', 'Tech'],
    tell: 'Nine months of back pay to burn. Free-spending buyer.',
    sell: { floor: [0.35, 0.9], ask: [1.3, 1.8] },
    buy: { mult: [1.1, 1.5] },
    voice: {
      loanAsk: ['Spot me {p} till my ship pays out?'],
      ask: ['{p}, spacer price.'],
      counter: ['{p} and I buy you a drink.'],
      want: ['Any good {c}? Credits to burn!'],
      buyer: ['{p}! Back pay, baby!'],
      deal: ['Clear skies, friend.'],
    },
  },
  prospector: {
    loan: 0.15, repay: 0.85,
    name: 'Belt Prospector', kind: 'prospector', sw: 8, bw: 6, cats: ['Minerals', 'Tools', 'Ship Parts'],
    tell: 'Hauls rare finds in from the asteroid belt. Better goods, harder bargains. Pays extra for Tools.',
    sell: { floor: [0.6, 1.0], ask: [1.25, 1.6], tier: 2 },
    buy: { mult: [0.85, 1.15], bonus: { Tools: 1.2 } },
    voice: {
      ask: ['{p}. Hauled it myself.'],
      counter: ['{p}. Belt prices.'],
      insult: ['Out in the belt, that gets you spaced.'],
      want: ['Need {c}. Good stuff only.'],
    },
  },
  grey: {
    loan: 0.15, repay: 0.9,
    name: 'Grey Broker', kind: 'grey', sw: 7, bw: 7, cats: ['Xeno Artifacts', 'Tech'],
    tell: 'A shrewd alien trader. Lowballs offend it, but it drops its ask quickly. Spots fakes.',
    sell: { floor: [0.6, 0.95], ask: [1.2, 1.5], strikes: -1, give: 0.12 },
    buy: { mult: [0.95, 1.25], detect: 0.85 },
    voice: {
      loanAsk: ['Requesting short-term credit: {p}. Collateral attached.'],
      ask: ['Proposed value: {p}.'],
      counter: ['Counter-proposal: {p}.', 'Acceptable range begins at {p}.'],
      insult: ['Your species amuses me.', 'Offer noted. Negatively.'],
      walk: ['Negotiation terminated.'],
      deal: ['Transaction logged.'],
      buyer: ['I will remit {p}.'],
      high: ['Illogical price.'],
      want: ['Seeking: {c}.'],
      fake: ['Counterfeit detected. Disappointing.'],
    },
  },
  glorp: {
    loan: 0.25, repay: 0.6,
    name: 'Glorp', kind: 'glorp', sw: 7, bw: 7,
    tell: 'A friendly blob with no idea what anything is worth. Prices are a total gamble.',
    sell: { floor: [0.05, 1.6], ask: [1.1, 3.0], strikes: 2 },
    buy: { mult: [0.4, 2.2], detect: 0.1, strikes: 2 },
    voice: {
      loanAsk: ['Glorp borrow {p}? Glorp come back. Probably.'],
      ask: ['Blorp! {p}?', 'Glorp want {p} shinies.'],
      counter: ['Blorp... {p}?', '{p}! Glorp is happy-ish.'],
      insult: ['Glorp is sad now.', 'Blorp! Mean!'],
      walk: ['Glorp leaves. Blorp.'],
      deal: ['Blorp blorp! Friend!'],
      buyer: ['Glorp give {p}!'],
      high: ['Glorp no have that many.'],
      want: ['Glorp want {c}! Shiny?'],
      fake: ['Glorp smells fake.'],
    },
  },
  zix: {
    loan: 0.15, repay: 0.8,
    name: 'Zix Swarmling', kind: 'zix', sw: 6, bw: 7, cats: ['Minerals', 'Gear', 'Earth Relics'],
    tell: 'Loves shiny things and pays extra for Minerals. Hates junk. Brings good stuff.',
    sell: { floor: [0.4, 0.95], ask: [1.3, 1.8], tier: 1 },
    buy: { mult: [0.9, 1.3], bonus: { Minerals: 1.4 }, junk: 0.3 },
    voice: {
      ask: ['Click-click. {p}, yes?'],
      counter: ['Click. {p}. Shiny deal.'],
      insult: ['Hssss!', 'The hive is offended.'],
      walk: ['The swarm departs. Click.'],
      deal: ['Click-click! Good trade.'],
      buyer: ['Hive pays {p}.'],
      high: ['Too much. Click.'],
      want: ['Shiny {c}? Click?'],
      junk: ['Junk! Hssss!'],
    },
  },
};

const DEFAULT_VOICE = {
  loanAsk: ['Can I borrow {p}? This is my collateral.', 'Need a loan of {p}. I will be back for it.'],
  loanCounter: ['I need at least {p}.', 'Make it {p}. I will pay it back.'],
  loanDeal: ['Thanks. Keep it safe, I will be back.'],
  ask: ['{p}?', 'Thinking {p}.'],
  want: ['Got any {c}?', 'Looking for {c}.'],
  counter: ['How about {p}?', 'I could do {p}.', 'Meet me at {p}.'],
  insult: ['Is that a joke?', 'No way. Not even close.', 'You are insulting me.'],
  walk: ['Forget it. Not selling to you.'],
  deal: ['Pleasure doing business.'],
  pass: ['Suit yourself.'],
  buyer: ["I'd pay {p} for it.", '{p}, and we have a deal.'],
  high: ['Way too rich for me.', 'Ha! No.'],
  done: ['I am done here.'],
  fake: ['This is a fake! Get out of here.'],
  junk: ['That is junk.'],
  sold: ['Sold! Thank you.'],
};

export const cr = n => `${Math.round(n).toLocaleString('en-US')} CR`;

export function pickProfile(role) {
  const ids = Object.keys(PROFILES);
  const w = ids.map(id => (role === 'sell' ? PROFILES[id].sw : PROFILES[id].bw));
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < ids.length; i++) { r -= w[i]; if (r <= 0) return ids[i]; }
  return ids[0];
}

/** A voice line. Pass seed for a stable pick (so a bubble doesn't flicker). */
export function say(profId, key, vars = {}, seed = null) {
  const v = PROFILES[profId]?.voice?.[key] || DEFAULT_VOICE[key] || [''];
  const i = seed == null ? Math.floor(Math.random() * v.length) : Math.abs(seed) % v.length;
  return v[i].replace('{p}', vars.p != null ? cr(vars.p) : '').replace('{c}', vars.c || '');
}
