/**
 * items.js - the 250 unique items (Mars, 2149), their pixel sprites, and palettes.
 * Earth Relics are antiques from roughly 1950-2060 Earth.
 *
 * Each item line: name | sprite | base value | tier | colorA | colorB
 * Tiers: 0 Junk, 1 Common, 2 Uncommon, 3 Rare, 4 Legendary.
 * Sprites are small char grids:  . empty  o outline  a/A primary/shade
 *                                c/C secondary/shade  w light  g metal  k dark
 */

export const TIERS = [
  { n: 'Junk', col: '#8a8174' },
  { n: 'Common', col: '#d8d2c4' },
  { n: 'Uncommon', col: '#6fcf6a' },
  { n: 'Rare', col: '#4fa8ff' },
  { n: 'Legendary', col: '#ffb43c' },
];

export const COLORS = {
  gold: '#f2c14e', silver: '#c9d1dc', brass: '#d9a441', bronze: '#b8733a', copper: '#c96f3b',
  wood: '#9a5f34', darkwood: '#6b3d22', red: '#d6453d', blue: '#3f7fd6', navy: '#2d4a8a',
  green: '#4caf50', jade: '#55c08a', teal: '#2fb5b0', purple: '#8c56c9', pink: '#f07fb0',
  black: '#3b3646', white: '#ece6da', cream: '#efe0b8', tan: '#c9a26b', orange: '#ec8a2f',
  yellow: '#f5d94a', gray: '#8f949e', plastic: '#e85fa0', lime: '#a6d84a', sky: '#7cc6f2',
  ruby: '#e0234e', emerald: '#1fb26b', sapphire: '#2f5fe0', diamond: '#d8f4ff', pearl: '#f4efe6',
  amethyst: '#a463e0', turq: '#3fd0c4', rust: '#9c5a37', leather: '#7a4a2a', denim: '#4d6ea8',
  olive: '#7f8a3a', crimson: '#a3202f', rose: '#d4787f',
};

export const CATS = [
  'Earth Relics', 'Tech', 'Ship Parts', 'Xeno Artifacts', 'Minerals',
  'Tools', 'Music', 'Art', 'Gear', 'Toys',
];

export const SPRITES = {
  ring: `
.....wc.....
....cccC....
.....CC.....
....aaaa....
...aA..Aa...
..aA....Aa..
..a......a..
..a......a..
..Aa....aA..
...Aa..aA...
....AAAA....`,
  necklace: `
.a........a.
.a........a.
..a......a..
..a......a..
...a....a...
...a....a...
....a..a....
.....aa.....
....owco....
....occC....
.....oo.....`,
  watch: `
....kkkk....
....kkkk....
....kkkk....
...oaaaao...
..oawwwwao..
..oawkwwao..
..oawwkwao..
..oawwwwao..
...oaaaao...
....kkkk....
....kkkk....
....kkkk....`,
  gem: `
............
............
...oooooo...
..owwcccCo..
.oooooooooo.
.owccccCCCo.
..occcCCCo..
...occCCo...
....ocCo....
.....oo.....`,
  crown: `
............
............
..c..c..c...
..a..a..a...
..aa.aa.aa..
..aaaaaaaa..
..acaawaca..
..aaaaaaaa..
..AAAAAAAA..
..oooooooo..`,
  earring: `
...g....g...
...g....g...
..aaa..aaa..
..a.a..a.a..
..aaa..aaa..
...c....c...
..cwc..cwc..
..ccc..ccc..
...C....C...`,
  phone: `
...oooooo...
...oaaaao...
...occcco...
...ocwcco...
...occcco...
...occcco...
...occcco...
...occCCo...
...oaaaao...
...oakaao...
...oooooo...`,
  laptop: `
..oooooooo..
..oggggggo..
..ogccccgo..
..ogcwccgo..
..ogccccgo..
..ogccccgo..
..oggggggo..
.oooooooooo.
oaaaaaaaaaao
okakakakakao
oaaaakkaaaao
.oooooooooo.`,
  tv: `
....o..o....
.....oo.....
.oooooooooo.
.oaaaaaaaao.
.oaccccwcao.
.oaccccccao.
.oacccCccao.
.oaccCCCcao.
.oaaaaaakao.
.oooooooooo.
..o......o..`,
  camera: `
............
...ooo......
.oooooooooo.
.oaaaaaawao.
.oaaokkoaao.
.oaokcckoao.
.oaokwckoao.
.oaaokkoaao.
.oAAAAAAAAo.
.oooooooooo.`,
  console: `
............
............
..oooooooo..
.oaaaaaaaao.
oaakaaaacaao
oakkkaacacao
oaakaaaacaao
oaaaaooaaaao
.oaao..oaao.
..oo....oo..`,
  headphones: `
...oooooo...
..oaaaaaao..
.oa......ao.
.oa......ao.
.o........o.
oaa......aao
occ......cco
occ......cco
oaa......aao
.oo......oo.`,
  radio: `
.........k..
........k...
.oooooooooo.
.oaaaaaaaao.
.okkkkoccao.
.okwkkocwao.
.okkkkoccao.
.okkkkoaaao.
.oaaaaaaaao.
.oooooooooo.`,
  guitar: `
..........oo
.........oko
........oko.
.......oko..
...ooo.ko...
..oaaaok....
.oaaakaao...
.oaakkaao...
..oaaaaao...
.oaaacaaao..
.oaacccaao..
..oaaaaao...
...ooooo....`,
  violin: `
.....oo.....
.....ok.....
.....ok.....
....oook....
....okoo....
...oaaao....
..oaaaaao...
..oaakaao...
...oakao....
..oaakaao...
.oaaakaaao..
.oaaaaaaao..
..oaaaaao...
...ooooo....`,
  trumpet: `
.............o
....o.o.o...oo
...ooooooo.oao
oooaaaaaaaoaao
oaaaawwaaaaaao
oooaaaaaaaoaao
...ooooooo.oao
............oo
.............o`,
  record: `
...oooooo...
..okkkkkko..
.okkgkkkkko.
okkgkkkkkkko
okkkkccckkko
okkkkcwckkko
okkkkccckkko
okkkkkkkkgko
.okkkkkkgko.
..okkkkkko..
...oooooo...`,
  drum: `
.w........w.
..w......w..
...oooooo...
..owwwwwwo..
..oaaaaaao..
..oacacaco..
..oaacacao..
..oacacaco..
..oaaaaaao..
...oooooo...`,
  keyboard: `
............
.oooooooooo.
.oaaccaaaao.
.oooooooooo.
.owkwkwwkwo.
.owkwkwwkwo.
.owwwwwwwwo.
.oooooooooo.
..o......o..`,
  mic: `
....oooo....
...oggggo...
...okgkgo...
...ogkgko...
...oggggo...
....oaao....
....oaao....
....oaao....
....oaao....
....oaao....
....oAAo....
.....oo.....`,
  card: `
..oooooooo..
..owwwwwwo..
..owccccwo..
..owcaacwo..
..owcaacwo..
..owccccwo..
..owwwwwwo..
..owkkkkwo..
..owwwwwwo..
..oooooooo..`,
  coin: `
...oooooo...
..oaaaaaAo..
.oawAAAAaAo.
.oawaaaaAAo.
.oaAaccaaAo.
.oaAaccaaAo.
.oaAaaaaaAo.
.oaaAAAAaAo.
..oaaaaaAo..
...oooooo...`,
  comic: `
.oooooooooo.
.occcccccco.
.ocwwwwwwco.
.ocaaaaaaco.
.ocaawwaaco.
.ocawkkwaco.
.ocaawwaaco.
.ocaaaaaaco.
.ockkkkkkco.
.occcccccco.
.oooooooooo.`,
  figurine: `
....ooo.....
...owwwo....
...owkwo....
....ooo.....
...oaaao....
..oaaaaao...
..oaacaao...
...oaaao....
...oa.ao....
...oa.ao....
..occcccoo..
..oooooooo..`,
  trophy: `
.oooooooooo.
.oaaaaaaaao.
ooawaaaaaaoo
o.oawaaaao.o
o.oaaaaaao.o
.oooaaaaooo.
....oaao....
.....oo.....
....oaao....
...occcco...
...oooooo...`,
  fossil: `
............
...oooooo...
..oaaaaaao..
.oaakkkkaao.
.oakaaaakao.
.oakakkakao.
.oakakaakao.
.oakaakakao.
.oaakkkkaao.
..oaaaaaao..
...oooooo...`,
  stamp: `
.o.o.o.o.o..
o.wwwwwwww.o
.wccccccccw.
owcaaaaaacwo
.wcawwaaacw.
owcaaaaaacwo
.wcaaaaaacw.
owccccccccwo
.wwwwwwwwww.
o.o.o.o.o.o.`,
  painting: `
............
oooooooooooo
oaaaaaaaaaao
oacccccccwao
oaccwccccCao
oacccccCCCao
oaccCCCCCCao
oaCCCCCkkCao
oaaaaaaaaaao
oooooooooooo`,
  statue: `
....oooo....
...oaaaao...
..oaaaaaao..
..oakaakao..
..oaawaaao..
...oaaaao...
....oaao....
..ooaaaaoo..
.oaaaaaaaao.
.oooooooooo.
...occcco...
..occccccoo..
..oooooooo..`,
  vase: `
...oooooo...
...oaaaao...
....oaao....
...oaaaao...
..oaacaaao..
.oacccaaaao.
.oaacaawaao.
.oaaaaawaao.
..oaaaaaao..
...oaaaao...
....oooo....`,
  scroll: `
.oooooooooo.
oaaaaaaaaaao
oAAAAAAAAAAo
.owwwwwwwwo.
.owkkkkwwwo.
.owwwwwwwwo.
.owkkkkkkwo.
.owwwwwwwwo.
.owkkkwwwwo.
.owwwwwwwwo.
oaaaaaaaaaao
oAAAAAAAAAAo
.oooooooooo.`,
  map: `
.oooooooooo.
oaaaaaaaaaao
oAAAAAAAAAAo
.owwccwwwwo.
.owccccwwwo.
.owwcccwkwo.
.owwwwwwwwo.
.owwwwcccwo.
.owkwwcccwo.
.owwwwwccwo.
oaaaaaaaaaao
oAAAAAAAAAAo
.oooooooooo.`,
  clock: `
....oooo....
..ooaaaaoo..
.oaawwwwaao.
.oawwwkwwao.
oawwwwkwwwao
oawwwwkkkwao
oawwwwwwwwao
.oawwwwwwao.
.oaawwwwaao.
..ooaaaaoo..
..oo....oo..`,
  lamp: `
....oooo....
...occcco...
..occcccco..
.occccwccco.
.oooooooooo.
.....oo.....
.....oa.....
.....oa.....
....oaao....
...oaaaao...
..oooooooo..`,
  teapot: `
.....oo.......
....oaao......
...oooooo.....
.ooaaaaaaoo...
o.oawaaaaaoo.o
o.oawaaacao.o.
o.oaaaaccaoo..
.ooaaaaaaao...
..oaaaaaaao...
...ooooooo....`,
  globe: `
....oooo.....
..ooccacoo...
.occaaaccco..
.ocaaacccco.g
oocccaaccoog.
o.ccaaaaco.g.
.occcaacoo.g.
..ooccccoo.g.
....oooo..g..
.......ggg...
.....ggggg...`,
  typewriter: `
............
..oooooooo..
..owwwwwwo..
.oooooooooo.
.oaaaaaaaao.
.oakwkwkwao.
.oawkwkwkao.
.oakwkwkwao.
.oaaakkaaao.
.oooooooooo.`,
  book: `
.oooooooooo.
oAaaaaaaaaao
oAaaaaaaaaao
oAaccccccaao
oAacwccccaao
oAaccccccaao
oAaaaaaaaaao
oAaaaaaaaaao
oAaaaaaaaaao
oAowwwwwwwwo
.ooooooooooo`,
  drill: `
..............
..oooooooo....
.oaaaaaaaaoggg
.oaaawaaaaogkg
.oaaaaaaaaoggg
..ooooaaoo....
.....oaao.....
.....oaao.....
....occCco....
....oCCCCo....
....oooooo....`,
  hammer: `
............
.oooooo.....
oggggggo....
okggggggo...
.ooooaaoo...
....oao.....
....oao.....
....oao.....
....oao.....
....oao.....
....oao.....
....ooo.....`,
  wrench: `
..oo..oo....
.oao..oao...
.oaaooaao...
..oaaaao....
...oaao.....
...oaao.....
...oaao.....
...oaao.....
...oaao.....
..oaaaao....
.oaa..aao...
.oo....oo...`,
  toolbox: `
....oooo....
....o..o....
.oooooooooo.
.oaaaaaaaao.
.oaaaaaaaao.
.oooookoooo.
.oaaakkaaao.
.oaaaaaaaao.
.oaaaaaaaao.
.oooooooooo.`,
  saw: `
..............
..............
.ooooo........
oaaaaaooooooo.
oaoooaogggggwo
oaaaaaoggggggo
oaoooaogggggo.
oaaaaaoggggo..
.oooooooooo...
.....okokok...`,
  chainsaw: `
..............
..ooooo.......
.oaaaaao......
oaakkaaooooooo
oaaaaaaogggggo
oaaaaaaokkkkko
.oaaaaaogggggo
..oooooooooooo`,
  bat: `
..........oo
.........oao
........oaao
.......oaao.
......oaao..
.....oaao...
....oaao....
...oaao.....
..ocao......
.occo.......
.ooo........`,
  ball: `
....oooo....
..ooaaaaoo..
.oawwaaaaao.
.oawaaaaaao.
oaaaaacaaaao
oaaaacaaaaao
oaaacaaaaaao
.oaaaaaaaao.
.oaaaaaaaAo.
..ooaaaaoo..
....oooo....`,
  helmet: `
....oooooo..
..ooaaaaaao.
.oaawaaaaaao
.oawaaaaaaao
oaaaaaaaaaao
oaaaaaaaocco
oaaaaaaao.co
oaaaaaaaocco
.ooooooooo..`,
  bike: `
............
.......oo...
...ooooaao..
..oaaaaoo...
..o.a..a....
.kkkka.akkk.
k...k.a.k..k
k..okoook..k
k...k...k..k
.kkk.....kkk`,
  skateboard: `
............
............
............
oo........oo
oaaaaaaaaaao
.occcccccco.
..oooooooo..
...gg..gg...
..okko.okko.
...oo...oo..`,
  golfclub: `
.........oo.
........oko.
........ok..
.......ok...
.......ga...
......ga....
.....ga.....
....ga......
...ga.......
.ooga.......
oggggo......
.oooo.......`,
  glove: `
...o.o.o....
..oaoaoao...
..oaoaoaoo..
..oaaaaaoao.
..oaaaaaaao.
.ooaaaaaaao.
oaoaaaaaao..
oaaaaaaaao..
.oaaaaaao...
..occccco...
..ooooooo...`,
  teddy: `
.oo....oo...
oaao..oaao..
oaaooooaao..
.oaaaaaaao..
.oakaaakao..
.oaaacaaao..
..oaaaaao...
.oaaaaaaao..
oaaacccaaao.
oaacccccaao.
.oaaaaaaao..
..oo...oo...`,
  robot: `
.....o......
....oco.....
..oooooooo..
..oggggggo..
..ogcggcgo..
..oggggggo..
..okkkkkko..
.oooooooooo.
oaoaaaaaaoao
oaoaacaaaoao
..oaaaaaao..
..oao..oao..
..ooo..ooo..`,
  cartridge: `
.oooooooooo.
.oaaaaaaaao.
.oacccccwao.
.oacwccccao.
.oacccccCao.
.oaaaaaaaao.
.oaaaaaaaao.
.oakakakaao.
.oooooooooo.`,
  car: `
....oooooo....
...oacccccao..
..oacwcccccao.
.ooaaaaaaaaaoo
oaaaaaaaaaaaao
ocaaaaaaaaaaco
oaooooaaooooao
.ookkoooookkoo
..okgko.okgko.
...ooo...ooo..`,
  board: `
oooooooooooo
owkwkwkwkwko
okwcwkwkwkwo
owkwkwkwkwko
okwkwkwkwkwo
owkwkwkwkcko
okwkwkwkwkwo
oooooooooooo
oaaaaaaaaaao
oooooooooooo`,
  doll: `
...oooo.....
..occcco....
.occwwcco...
.ocwkwkwco..
.ocwwwwwco..
..ocwccwo...
...oaaao....
..oaaaaao...
.owaaaaawo..
..oaaaaao...
..oaaaaao...
...ow.wo....
...oo.oo....`,
  plane: `
.............
.....oo......
.....oao.....
oo...oaao....
oaooooaaaooo.
oaaaaaaaawaao
oooooaaaaooo.
.....oaao....
.....oao.....
.....oo......`,
  sneaker: `
............
............
...oooo.....
..oaaaao....
..oawwaoo...
..oaaaaaaoo.
.oaaaaaaaaao
oaccaaaaaaao
owwwwwwwwwwo
.oooooooooo.`,
  handbag: `
....oooo....
...o....o...
..o......o..
.oooooooooo.
.oaaaaaaaao.
.oaaacaaaao.
.ooooccoooo.
.oaaaaaaaao.
.oaaaaaaaao.
.oAAAAAAAAo.
.oooooooooo.`,
  hat: `
............
...oooooo...
..oaaaaaao..
..oaaaaaao..
..oaaaaaao..
..occcccco..
.oaaaaaaaaao
oaaaaaaaaaaao
.ooooooooooo.`,
  jacket: `
..oooooooo...
.oaaaowaaao..
oaaaaowaaaao.
oaaaaowaaaao.
oaoaaowaaoao.
oaoaacwaaoao.
oaoaaowaaoao.
oaoaacwaaoao.
oco.aowaa.oco
...oaowaao...
...oooooo....`,
  sunglasses: `
.............
.............
.............
oooooooooooo.
okkkko.okkkko
okwkko.okwkko
okkkko.okkkko
.oooo...oooo.`,
  belt: `
..............
..............
..............
oooooooooooooo
oaaaoccccccoao
oaaaocoooocoao
oaaaoccccccoao
oooooooooooooo`,
  chip: `
...o.o.o....
..ooooooo...
.oaaaaaaao..
ooakkkkkaoo.
.oakccckao..
ooakcwckaoo.
.oakccckao..
ooakkkkkaoo.
.oaaaaaaao..
..ooooooo...
...o.o.o....`,
  tablet: `
.oooooooooo.
.oaaaaaaaao.
.oaccccccao.
.oacwccccao.
.oacccccCao.
.oaccccCCao.
.oacccCCCao.
.oaaaaaaaao.
.oaaaokaaao.
.oooooooooo.`,
  drone: `
ggggg..ggggg
....o..o....
..oooooooo..
.oaaaaaaaao.
oawaaaaaaaao
oaaaookoaaao
oaaaokckoaao
.oaaaookaao.
..oooooooo..
...o....o...
..oo....oo..`,
  canister: `
....oooo....
...oggggo...
..oooooooo..
..oaaaaaao..
..oawaaaao..
..occcccco..
..occcccco..
..oawaaaao..
..oaaaaaao..
..oAAAAAAo..
..oooooooo..`,
  orb: `
....oooo....
..ooccccoo..
.occwwccCCo.
.ocwwccccCo.
occcccccCCCo
occcccccCCCo
occcccCCCCCo
.oCcCCCCCCo.
..ooCCCCoo..
...oaaaao...
..oaaaaaao..
..oooooooo..`,
  plate: `
oooooooooooo
oaaaaaaaaaao
oagaaaaaagao
oaacccccccao
oaacaaaaacao
oaacaaaaacao
oaacccccccao
oagaaaaaagao
oaaaaaaaaaao
oooooooooooo`,
  thruster: `
...oooooo...
...oggggo...
..oaaaaaao..
..oawaaaao..
..oaaaaaao..
.oaaaaaaaao.
.okkkkkkkko.
okkkkkkkkkko
oooooooooooo
..cc.cc.cc..
...c..c..c..`,
  idol: `
...oooooo...
..oaaaaaao..
..oakaakao..
..oacaacao..
..oaaaaaao..
...oaaaao...
.ooaaaaaaoo.
oaaoaccaoaao
...oaccao...
...oaaaao...
..occcccco..
..oooooooo..`,
  skull: `
...oooooo...
..oaaaaaao..
.oaaaaaaaao.
oaaaaaaaaaao
oakkkaakkkao
oakckaakckao
.oakkaakkao.
..oaaaaaao..
...oaooao...
....oooo....`,
  egg: `
....oooo....
...oaaaao...
..oawaaaao..
..oawaacao..
.oaaaacccao.
.oaaaaacaao.
.oacaaaaaao.
.occcaaaaao.
..ocaaaaAo..
...oAAAAo...
....oooo....`,
  crystal: `
.....oo.....
....ocwo....
...occwco...
...occwco...
..occcwccco.
..occcwccco.
..oCccwccCo.
..oCCcccCCo.
...oCCcCCo..
....oCCCo...
.....ooo....`,
  rock: `
............
....ooooo...
..ooaaaaaoo.
.oaaawaaaaao
.oaaaaaacaao
oaacaaaaaaao
oaaaaaaacaao
oaAaaacaaaAo
.oAAaaaaAAo.
..ooAAAAoo..
....oooo....`,
  bar: `
..............
..............
..............
...oooooooo...
..owaaaaaaao..
.owaaaaaaaaao.
oAAAAAAAAAAAAo
oAAAAAAAAAAAAo
oooooooooooooo`,
  raygun: `
.............
....ooooo....
..ooaaaaaoooo
.oaaawaaaacco
.oaaaaaaaoooo
..ooooaaao...
....oaao.....
....oaao.....
...okkko.....
...oooo......`,
  spacehelmet: `
...oooooo...
..oaaaaaao..
.oaaaaaaaao.
oaaoooooooao
oaockcccwoao
oaocccccwoao
oaoccccccoao
oaaoooooooao
.oaaaaaaaao.
.ogggggggggo
.ooooooooooo`,
  suit: `
...oooooo...
..oaaaaaao..
..oaoccoao..
.ooaaaaaaoo.
oaaaccccaaao
oaoaaakaaoao
oaoaaaaaaoao
ogo.aaaa.ogo
...oaaoaao..
...oaaoaao..
...oggoggo..
...ooooooo..`,
  jetpack: `
..oo....oo..
.oaao..oaao.
.oaaoooooao.
.oawoccoawo.
.oaaoccoaao.
.oaaoooooao.
.oaao..oaao.
.oggo..oggo.
..oo....oo..
..cc....cc..
...c.....c..`,
  rocket: `
.....oo.....
....oaao....
...oaaaao...
...oacwao...
...oaccao...
...oaaaao...
...oaaaao...
..ooaaaaoo..
.ocoaaaaoco.
.occoooocco.
..o.cccc.o..
.....cc.....`,
  ufo: `
....oooo....
...owwcco...
..owcccCco..
.oooooooooo.
oaaaaaaaaaao
oakaakaakaao
.oaaaaaaaao.
..oooooooo..
...c.c..c...
..c..c...c..`,
  key: `
..............
..oooo........
.oaaaao.......
oaaooaao......
oao..oaooooooo
oaaooaaaaaaaao
.oaaaaooaooaoo
..oooo.oo.oo..`,
};

// name | sprite | value | tier | colorA | colorB      (25 per category, in CATS order)
const RAW = {
'Earth Relics': `
Cracked 2030s Smartwatch|watch|6|0|black|gray
Bottle Cap Collection|coin|2|0|red|gray
Unlabeled USB Stick|chip|1|0|gray|blue
Faded Paper Receipt|card|1|0|white|gray
Dead Wireless Earbuds|headphones|3|0|white|white
Souvenir Keychain Charms|earring|2|0|silver|red
2026 Smartphone|phone|80|1|black|sky
Paper Paperback Novel|book|45|1|cream|red
Plastic Credit Card|card|35|1|gold|blue
Earth Baseball Cap|hat|40|1|navy|white
Copper Penny Roll|coin|30|1|copper|bronze
Combustion-Car Key Fob|key|50|1|black|red
Printed Photo Album|book|60|1|leather|white
Vinyl LP (2020s Pop)|record|55|1|black|pink
Mint 2020s Game Console|console|600|2|white|black
Gold Wedding Ring (2031)|ring|420|2|gold|gold
Signed Paper Comic|comic|500|2|red|yellow
Spark Plug Set (Gas Engine)|toolbox|300|2|gray|red
Original Earth Sneakers (2024)|sneaker|700|2|white|red
Analog Wristwatch (2019)|watch|650|2|silver|navy
Sealed 2026 Flagship Phone|phone|2400|3|silver|purple
Last Paper Newspaper (2044)|scroll|1900|3|cream|black
Graded 1990s Trading Card|card|2200|3|gold|red
Apollo Mission Patch (1969)|stamp|12000|4|navy|gold
First Mars Landing Flag (2041)|map|14000|4|red|white`,
'Tech': `
Glitchy Holo-Pad|tablet|6|0|gray|sky
Burnt-Out Neural Jack|chip|3|0|black|red
Off-Brand Translator Earpiece|headphones|5|0|plastic|white
Cracked Drone Shell|drone|8|0|gray|orange
Expired Med-Scanner|phone|4|0|white|red
Dead Power Cell|canister|2|0|gray|lime
Holo-Pad Mini|tablet|70|1|black|teal
Universal Translator|headphones|90|1|silver|purple
Pocket Drone|drone|110|1|teal|black
Smart Visor|sunglasses|60|1|black|sky
Med-Scanner|phone|85|1|white|green
Fusion Power Cell|canister|50|1|yellow|black
Holo-Projector|lamp|95|1|silver|sky
Personal Comms Band|watch|65|1|black|lime
Neural Link Headset|headphones|650|2|silver|pink
Military Recon Drone|drone|800|2|olive|red
Quantum Holo-Pad|tablet|500|2|navy|sky
AI Companion Core|orb|700|2|white|sky
Cloaking Field Emitter|chip|900|2|black|purple
Gravity Stabilizer|canister|450|2|silver|blue
Prototype Teleport Pad|tablet|2600|3|white|teal
Sentient AI Chip (Dormant)|chip|2200|3|gold|lime
Antimatter Battery|canister|2800|3|black|pink
First Warp-Theory Processor|chip|14000|4|gold|sky
Self-Aware Android Head|robot|11000|4|silver|sky`,
'Ship Parts': `
Bag of Hull Rivets|coin|2|0|gray|gray
Scorched Heat Tile|plate|4|0|black|orange
Leaky O2 Canister|canister|5|0|white|red
Frayed Tether Cable|belt|2|0|yellow|gray
Cracked Viewport Glass|plate|6|0|gray|sky
Dented Fuel Nozzle|thruster|8|0|gray|black
Maneuvering Thruster|thruster|120|1|silver|orange
Nav Computer|laptop|90|1|gray|green
Hull Plate|plate|60|1|gray|silver
Docking Clamp|wrench|70|1|yellow|black
O2 Scrubber|canister|85|1|white|teal
Radiation Shield Panel|plate|110|1|yellow|black
Pilot Control Yoke|console|65|1|black|red
Landing Strut|bat|50|1|silver|gray
Ion Drive Coil|thruster|750|2|blue|sky
Freighter Black Box|toolbox|600|2|orange|black
Gravity Plating|plate|500|2|purple|silver
Warp Field Capacitor|canister|900|2|navy|pink
Rocket Nozzle (2060s)|thruster|450|2|bronze|black
Quantum Nav Core|orb|800|2|silver|lime
Shuttle Cockpit Panel|laptop|2400|3|white|orange
Racing Ship Afterburner|thruster|2600|3|red|yellow
Colony Ship Bell|trophy|1800|3|brass|brass
Ares-I Ignition Key|key|13000|4|gold|red
Hyperdrive Prototype Core|orb|15000|4|white|pink`,
'Xeno Artifacts': `
Glowing Pebble (Not Glowing)|rock|1|0|gray|lime
Alien Tourist Trinket|orb|3|0|plastic|lime
Shed Glorp Membrane|egg|2|0|lime|green
Grey Fortune Shell|egg|1|0|tan|cream
Rubber Alien Mask|skull|4|0|lime|black
Zix Wing Clipping|crystal|3|0|sky|white
Xeno Resonance Chime|crystal|80|1|teal|white
Grey Etiquette Tablet|tablet|60|1|gray|lime
Spore Lantern|lamp|70|1|lime|purple
Zix Hive Comb|plate|55|1|yellow|orange
Tentacle Handshake Glove|glove|45|1|lime|green
Alien Coin (Unknown Mint)|coin|90|1|purple|teal
Star Map Shard|map|100|1|navy|sky
Glorp Mood Gel|canister|40|1|pink|lime
Ancient Xeno Idol|idol|800|2|teal|gold
Singing Crystal Skull|skull|700|2|sky|pink
Grey Diplomatic Seal|coin|500|2|silver|purple
Fossilized Alien Egg|egg|650|2|tan|purple
Psionic Focus Orb|orb|900|2|purple|pink
Zix Queen's Feather|crystal|450|2|gold|sky
Precursor Data Obelisk|idol|2600|3|black|lime
Living Star Chart|orb|2400|3|navy|gold
First Contact Gift Box (2097)|toolbox|2200|3|silver|teal
Precursor Gate Keystone|idol|15000|4|gold|teal
Sleeping Void Egg|egg|12000|4|black|pink`,
'Minerals': `
Jar of Mars Dust|canister|1|0|rust|rust
Common Basalt Chunk|rock|2|0|gray|black
Fake Martian Ruby|gem|3|0|red|pink
Melted Ice Core Sample|canister|1|0|sky|white
Pumice Paperweight|rock|2|0|tan|gray
Polished Gravel|gem|2|0|gray|white
Martian Opal|gem|90|1|orange|sky
Hematite Nodule|rock|40|1|black|silver
Olivine Cluster|crystal|60|1|lime|green
Phobos Fragment|rock|80|1|gray|tan
Silica Geode|rock|70|1|tan|purple
Polar Ice Crystal|crystal|50|1|sky|white
Copper Ore Ingot|bar|65|1|copper|bronze
Rough Jasper Pendant|necklace|45|1|silver|rust
Iridium Ingot|bar|700|2|silver|white
Deimos Meteorite|rock|500|2|black|orange
Valles Marineris Diamond|gem|900|2|diamond|white
Platinum Asteroid Nugget|rock|650|2|silver|silver
Olympus Mons Obsidian|crystal|400|2|black|purple
Belt-Mined Sapphire Ring|ring|600|2|silver|sapphire
Helium-3 Crystal Lattice|crystal|2400|3|sky|yellow
Neutron Star Sliver (Contained)|canister|2800|3|white|purple
Gold Asteroid Bar|bar|2200|3|gold|gold
The Red Heart (Giant Ruby)|gem|14000|4|ruby|crimson
Comet Core Diamond|gem|11000|4|diamond|sky`,
'Tools': `
Bent Space Wrench|wrench|2|0|rust|rust
Dull Plasma Cutter|raygun|5|0|gray|orange
Rusty Rock Hammer|hammer|2|0|rust|wood
Empty Tool Pod|toolbox|4|0|orange|gray
Busted Laser Level|drill|4|0|yellow|red
Vintage Duct Tape Roll|coin|1|0|gray|gray
Plasma Cutter|raygun|90|1|orange|sky
Mag-Drill|drill|80|1|yellow|black
Rock Hammer|hammer|30|1|darkwood|silver
Mechanic's Tool Pod|toolbox|140|1|red|black
Sonic Spanner|wrench|60|1|silver|teal
Core Sampler|drill|110|1|orange|white
Laser Saw|saw|70|1|black|red
Grav-Lifter Gloves|glove|55|1|yellow|black
Industrial Plasma Torch|raygun|600|2|red|yellow
Exo-Loader Servo|toolbox|800|2|yellow|black
Diamond Mining Drill|drill|700|2|silver|diamond
Nano-Repair Kit|canister|450|2|white|lime
Monomolecular Saw|saw|500|2|black|sky
Terraforming Seed Spreader|thruster|350|2|green|tan
First Colony Shovel (2041)|hammer|2200|3|darkwood|silver
Matter Fabricator Head|toolbox|2600|3|silver|purple
Gravity Wrench|wrench|1800|3|navy|pink
Terraformer Prime Control Rod|bat|13000|4|gold|lime
Ancestral Earth Toolbox (1950s)|toolbox|9000|4|red|silver`,
'Music': `
Scratched Holo-Disc|record|2|0|silver|pink
Zero-G Kazoo|trumpet|1|0|plastic|plastic
Static Radio Receiver|radio|5|0|gray|black
Broken Theremin|mic|6|0|black|silver
Karaoke Drone|drone|7|0|pink|yellow
Bootleg Space Opera Chip|chip|3|0|black|pink
Zero-G Acoustic Guitar|guitar|80|1|tan|darkwood
Holo-Record (Dome Jazz)|record|50|1|black|teal
Plasma Synth|keyboard|120|1|navy|pink
Low-Gravity Drum|drum|85|1|red|silver
Theremin|mic|90|1|black|silver
Stadium Holo-Mic|mic|55|1|black|lime
Brass Spacer Bugle|trumpet|100|1|brass|brass
Retro Boombox (2020s)|radio|65|1|black|orange
Earth Vinyl Collection (2010s)|record|500|2|black|gold
Electric Guitar (Earth, 2030)|guitar|900|2|red|cream
Grey Choir Harp|violin|650|2|silver|lime
Martian Opera Crystal|crystal|400|2|pink|white
Antique Saxophone (2006)|trumpet|700|2|gold|gold
Studio Synth Rack|keyboard|800|2|black|orange
First Song on Mars (Master Tape)|record|2500|3|black|red
Concert Holo-Guitar|guitar|2200|3|purple|sky
Master-Pattern Violin (2088)|violin|2000|3|copper|black
Original 1700s Earth Violin|violin|15000|4|copper|black
Golden Record Replica|record|12000|4|gold|gold`,
'Art': `
Dome Gift Shop Print|painting|5|0|tan|orange
Plastic Rover Figurine|car|3|0|white|gray
Dust Art Jar|vase|2|0|rust|orange
Velvet Saturn Painting|painting|6|0|black|yellow
AI Paint-by-Numbers|painting|4|0|wood|pink
Souvenir Astronaut Bust|statue|4|0|white|gray
Red Canyon Landscape|painting|90|1|wood|orange
Sandstone Rover Sculpture|statue|60|1|rust|tan
Glass Dome Terrarium|vase|70|1|sky|green
Framed Earth Postcard (2030s)|painting|100|1|black|blue
Holo-Portrait|tablet|80|1|silver|pink
Iron Dust Vase|vase|45|1|rust|black
Zero-G Ink Scroll|scroll|75|1|navy|teal
Earthrise Watercolor|painting|110|1|cream|blue
Neon Nebula Canvas|painting|850|2|navy|pink
Bronze First-Steps Statue|statue|700|2|bronze|darkwood
Grey Light Sculpture|orb|500|2|white|lime
Earth Pop Art Print (2020s)|painting|900|2|yellow|pink
Jade Colonist Figure|statue|520|2|jade|darkwood
Crystal Garden Vase|vase|450|2|purple|sky
Lost Martian Impressionist Oil|painting|2800|3|gold|orange
Xeno Living Sculpture|idol|2400|3|teal|pink
Pre-Exodus Gallery Sketch|scroll|2000|3|gold|black
Recovered Renaissance Portrait|painting|15000|4|gold|darkwood
Ancient Greek Bust (Shipped)|statue|12000|4|white|black`,
'Gear': `
Scuffed EVA Helmet|spacehelmet|6|0|white|gray
Patched Jumpsuit|suit|4|0|orange|gray
Single Mag-Boot|sneaker|3|0|gray|black
Fogged Sun Visor|sunglasses|2|0|black|orange
Frayed Utility Belt|belt|2|0|olive|gray
Novelty Antenna Headband|hat|1|0|lime|pink
Colonist Jumpsuit|suit|60|1|orange|white
Standard EVA Helmet|spacehelmet|110|1|white|sky
Mag-Boots|sneaker|70|1|silver|black
Dust Goggles|sunglasses|40|1|brass|orange
Thermal Poncho|jacket|50|1|red|cream
Utility Belt|belt|45|1|leather|silver
Spacer Bomber Jacket|jacket|85|1|navy|orange
Rebreather Mask|spacehelmet|75|1|black|lime
Personal Jetpack|jetpack|900|2|silver|orange
Pro EVA Suit|suit|800|2|white|blue
Designer Dome Handbag|handbag|600|2|pink|gold
Smart Fabric Coat|jacket|500|2|purple|sky
Gold-Visor Helmet|spacehelmet|700|2|white|gold
Rocket Racer Gloves|glove|350|2|red|white
Flight Commander Jacket|jacket|2200|3|navy|gold
Racing Jetpack|jetpack|2800|3|red|yellow
Apollo-Era EVA Glove|glove|2000|3|white|silver
First Mars Walker's Helmet|spacehelmet|15000|4|white|gold
Couture Zero-G Gown|suit|10000|4|pink|gold`,
'Toys': `
One-Eared Robo-Pet|robot|3|0|gray|pink
Loose VR Cartridge|cartridge|4|0|gray|red
Busted Toy Rover|car|5|0|white|black
Incomplete Holo-Chess|board|2|0|white|black
Deflated Zero-G Ball|ball|1|0|orange|white
Plastic Ray Gun|raygun|2|0|plastic|lime
Robo-Pet Puppy|robot|90|1|silver|red
Holo-Chess Set|board|45|1|cream|sky
Model Rocket Kit|rocket|60|1|white|red
Plush Glorp|teddy|35|1|lime|green
Toy UFO|ufo|40|1|silver|lime
RC Rover|car|70|1|orange|black
Zero-G Ball|ball|30|1|orange|blue
Retro 2020s Plush Bear|teddy|50|1|wood|red
Sealed 2020s Game Cartridge|cartridge|800|2|gray|red
Vintage Tin Robot (Earth)|robot|650|2|blue|yellow
Collector Rocket Model|rocket|500|2|silver|orange
Signed Limited Glorp Plush|teddy|400|2|lime|gold
First Edition Holo-Game|cartridge|550|2|navy|sky
Antique Earth Doll (2010s)|doll|450|2|rose|darkwood
Prototype VR Rig|tablet|2400|3|black|pink
Champion Laser Tag Blaster|raygun|1800|3|red|sky
Tin Rocket (1950s Earth)|rocket|2200|3|red|silver
Gold Prize Cartridge (2027)|cartridge|13000|4|gold|black
Original 1959 Fashion Doll|doll|9500|4|black|yellow`,
};

export const ITEMS = [];
for (const cat of CATS) {
  for (const line of RAW[cat].trim().split('\n')) {
    const [n, sp, v, t, a, b] = line.split('|');
    ITEMS.push({ id: ITEMS.length, n, cat, sp, v: +v, t: +t, a: COLORS[a] || a, b: COLORS[b] || b });
  }
}

export const BY_TIER = [0, 1, 2, 3, 4].map(t => ITEMS.filter(i => i.t === t).map(i => i.id));

/* --------------------------------------------------------------- sprites --- */

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const c = x => Math.max(0, Math.min(255, Math.round(x * f)));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

export const SPRITE_SIZE = 14;   // source grid size (logical pixels)
export const ITEM_PX = 28;       // drawn size at the 2x art resolution
const parsed = {};
function grid(name) {
  if (parsed[name]) return parsed[name];
  const rows = SPRITES[name].replace(/^\n/, '').replace(/[^\x20-\x7e\n]/g, 'o').split('\n').map(r => r.slice(0, SPRITE_SIZE));
  return (parsed[name] = rows);
}

/** Pad a sprite grid into a 14x14 box (centered, bottom-aligned). */
function boxed(name) {
  const g = grid(name);
  const w = Math.max(...g.map(r => r.length));
  const ox = Math.round((SPRITE_SIZE - w) / 2), oy = SPRITE_SIZE - g.length;
  const out = Array.from({ length: SPRITE_SIZE }, () => Array(SPRITE_SIZE).fill('.'));
  g.forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== ' ') out[oy + r][ox + c] = ch; }));
  return out;
}

/** Scale2x (EPX): doubles a pixel-art grid while rounding off diagonal stair-steps. */
function scale2x(g) {
  const h = g.length, w = g[0].length;
  const at = (r, c) => (r < 0 || c < 0 || r >= h || c >= w ? '.' : g[r][c]);
  const out = Array.from({ length: h * 2 }, () => Array(w * 2).fill('.'));
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    const P = g[r][c], A = at(r - 1, c), B = at(r, c + 1), C = at(r, c - 1), D = at(r + 1, c);
    let e0 = P, e1 = P, e2 = P, e3 = P;
    if (C === A && C !== D && A !== B) e0 = A;
    if (A === B && A !== C && B !== D) e1 = B;
    if (D === C && D !== B && C !== A) e2 = C;
    if (B === D && B !== A && D !== C) e3 = D;
    out[r * 2][c * 2] = e0; out[r * 2][c * 2 + 1] = e1; out[r * 2 + 1][c * 2] = e2; out[r * 2 + 1][c * 2 + 1] = e3;
  }
  return out;
}

const big2x = {};
function grid2x(name) {
  if (big2x[name]) return big2x[name];
  const g = scale2x(boxed(name));
  const N = g.length;
  const isFill = ch => ch !== '.' && ch !== 'o';
  // Thin the doubled outline back to 1px: keep only outline pixels that touch a fill pixel.
  const thin = g.map((row, r) => row.map((ch, c) => {
    if (ch !== 'o') return ch;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]]) {
      const n = g[r + dr]?.[c + dc];
      if (n && isFill(n)) return 'o';
    }
    return '.';
  }));
  return (big2x[name] = thin);
}

function hexRgb(hex) {
  if (hex.startsWith('rgb')) return hex.match(/\d+/g).map(Number);
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function tone(hex, f) {
  // Shadows drift toward cool purple, highlights toward warm cream: a classic pixel-art ramp.
  let [r, g, b] = hexRgb(hex);
  if (f < 1) { r = r * f + 30 * (1 - f) * 0.4; g = g * f + 18 * (1 - f) * 0.4; b = b * f + 60 * (1 - f) * 0.6; }
  else { const k = f - 1; r += (255 - r) * k; g += (250 - g) * k; b += (225 - b) * k * 0.85; }
  const c = v => Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

const FILL = new Set(['a', 'A', 'c', 'C', 'g', 'k', 'w']);
const spriteCache = new Map();
/** Render an item once to a 28x28 canvas: Scale2x shape, 5-step lighting from the top-left, tinted outline. */
function itemCanvas(itemId) {
  if (spriteCache.has(itemId)) return spriteCache.get(itemId);
  const it = ITEMS[itemId];
  const g = grid2x(it.sp);
  const N = g.length;
  const base = { a: it.a, A: tone(it.a, 0.68), c: it.b, C: tone(it.b, 0.68), w: '#f6f1e6', g: '#a7adba', k: '#3a3348' };
  const at = (r, c) => (g[r] && g[r][c]) || '.';
  const fill = (r, c) => FILL.has(at(r, c));
  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const x = cv.getContext('2d');
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const ch = g[r][c];
      if (ch === '.') continue;
      let col;
      if (ch === 'o') {
        const nb = [at(r - 1, c), at(r + 1, c), at(r, c - 1), at(r, c + 1)].find(n => 'aAcC'.includes(n) && n !== '.');
        col = nb ? tone(base[nb.toLowerCase()], 0.3) : '#1e1828';
      } else {
        const src = base[ch];
        if (!src) continue;
        col = src;
        if (ch !== 'w') {
          // light from the top-left: two highlight steps on top edges, two shade steps on bottom/right
          if (!fill(r - 1, c) || !fill(r, c - 1) && !fill(r - 1, c - 1)) col = tone(src, 1.3);
          else if (!fill(r - 2, c)) col = tone(src, 1.12);
          else if (!fill(r + 1, c) || !fill(r, c + 1)) col = tone(src, 0.74);
          else if (!fill(r + 2, c) || !fill(r, c + 2)) col = tone(src, 0.88);
          // a small specular glint near the top-left of large fills
          if (ch === 'a' || ch === 'c') {
            if (fill(r - 1, c) && fill(r, c - 1) && !fill(r - 2, c - 1) && fill(r + 2, c + 2) && (r + c) % 5 === 0) col = tone(src, 1.5);
          }
        }
      }
      x.fillStyle = col;
      x.fillRect(c, r, 1, 1);
    }
  }
  spriteCache.set(itemId, cv);
  return cv;
}

/** Draw a 28x28 item sprite with its top-left at (x, y) in 2x art pixels. */
export function drawItem(ctx, itemId, x, y) {
  ctx.drawImage(itemCanvas(itemId), Math.round(x), Math.round(y));
}

const iconCache = new Map();
/**
 * PNG data URL of an item sprite for the DOM. `scale` is relative to the old 14px grid
 * (4 = 56px, 3 = 42px). Sizes that aren't whole multiples of 28 render at 1x, centered,
 * so pixels stay even.
 */
export function itemIcon(itemId, scale = 4) {
  const key = itemId + ':' + scale;
  if (iconCache.has(key)) return iconCache.get(key);
  const c = itemCanvas(itemId);
  const size = SPRITE_SIZE * scale;
  const k = Math.max(1, Math.floor(size / ITEM_PX));
  const big = document.createElement('canvas');
  big.width = big.height = size;
  const bx = big.getContext('2d');
  bx.imageSmoothingEnabled = false;
  const d = ITEM_PX * k, o = Math.floor((size - d) / 2);
  bx.drawImage(c, o, o, d, d);
  const url = big.toDataURL();
  iconCache.set(key, url);
  return url;
}
