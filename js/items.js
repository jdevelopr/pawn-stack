/**
 * items.js — the 250 unique items, their pixel sprites, and palettes.
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
  'Jewelry', 'Electronics', 'Music', 'Collectibles', 'Art',
  'Antiques', 'Tools', 'Sports', 'Toys', 'Fashion',
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
............
..oooooooo..
..occccwco..
..occccccco.
..occcccco..
..occCCCco..
..oooooooo..
.oaaaaaaaao.
oakakakakaao
oaaaakkaaaao
oooooooooooo`,
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
.......ook..
......oko...
......ok....
....ooko....
...oaako....
...oakao....
....oko.....
...oakao....
..oakkkao...
..oaakaao...
...oaaao....
....ooo.....`,
  trumpet: `
............
.........oo.
...ooo..oao.
...oco.oaao.
oooocoooaaao
oaaaaaaaaaao
oooooooooaao
.........oao
..........oo`,
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
...oooo.....
..oggggo....
..okgkgo....
..ogkgko....
...oaao.....
....aa......
....aa......
....aa......
....aa......
..oaaaao....
..okkkko....`,
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
.oo......oo.
oaaoooooooao
oaawwwwwwwao
.oawkkwwwwo.
..owwwkkwwo.
..owcwwwwwo.
..owwwcckwo.
..owwwwwwwo.
.oawwwwwwao.
oaaoooooooao
.oo......oo.`,
  map: `
.oo......oo.
oaaoooooooao
oaacccwwwwao
.oacccwwkwo.
..owccwkwwo.
..owwwkwkwo.
..owwcccwwo.
..owcccccwo.
.oawwwwwwao.
oaaoooooooao
.oo......oo.`,
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
............
..ooooooooo.
.oaaaaaaaao.
.oacccccao..
oaacwcwcao..
oaacccccao..
oaaaaaaaao..
oawwwwwwwo..
.ooooooooo..`,
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
.oo.....oo..
oggo...ogo..
ogggo.oggo..
.ogggogggo..
..ogggggo...
...oggo.....
...oggo.....
..oaaao.....
..oaao......
.oaaao......
.oaao.......
.ooo........`,
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
............
.ooo........
oaaao.......
oaoaoooooooo
oaaaogggggwo
.oaaoggggggo
..ooogggggo.
....okokoko.`,
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
............
....oooo....
...oacwao...
.ooaaaaaaoo.
oaaaaaaaaaao
oaawaaaaaaao
oookooooooko
..kgk....kgk
...k......k.`,
  board: `
............
...ooooo....
..owwwwwo...
.oowkwwwoo..
.owwwwwowo..
.owwkwwowo..
.owwwwwoo...
.owwwkwo....
.ooooooo....`,
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
............
............
oooooooooooo
aaaaaoccccoa
aaaaaoc..coa
aaaaaoccccoa
oooooooooooo`,
};

// name | sprite | value | tier | colorA | colorB      (25 per category, in CATS order)
const RAW = {
Jewelry: `
Plastic Mood Ring|ring|4|0|plastic|purple
Bead Bracelet|necklace|3|0|orange|lime
Cracked Digital Watch|watch|6|0|black|gray
Glass "Diamond"|gem|2|0|sky|white
Costume Tiara|crown|8|0|silver|pink
Clip-On Earrings|earring|3|0|silver|plastic
Sterling Silver Band|ring|45|1|silver|white
Freshwater Pearl Strand|necklace|90|1|pearl|pearl
Quartz Wristwatch|watch|60|1|silver|navy
Amethyst Pendant|necklace|70|1|silver|amethyst
Turquoise Ring|ring|55|1|silver|turq
Gold-Plated Chain|necklace|40|1|gold|gold
Silver Hoop Earrings|earring|35|1|silver|silver
Garnet Stud Earrings|earring|65|1|gold|crimson
14K Gold Signet Ring|ring|320|2|gold|black
Vintage Cameo Brooch|gem|260|2|gold|rose
Automatic Dive Watch|watch|450|2|silver|blue
Sapphire Tennis Bracelet|necklace|480|2|silver|sapphire
Emerald Cocktail Ring|ring|420|2|gold|emerald
Art Deco Pocket Watch|watch|380|2|gold|cream
2-Carat Diamond Ring|ring|2200|3|white|diamond
Swiss Chronograph|watch|1800|3|gold|black
Ruby Choker|necklace|1500|3|gold|ruby
Royal Jeweled Crown|crown|12000|4|gold|ruby
Pink Star Diamond|gem|9000|4|pink|pink`,
Electronics: `
Flip Phone|phone|5|0|gray|lime
Tangled Earbuds|headphones|2|0|white|white
Solar Calculator|phone|3|0|black|olive
Rabbit-Ear TV|tv|12|0|wood|gray
Disposable Camera|camera|3|0|yellow|black
Off-Brand Game Console|console|10|0|plastic|yellow
Two-Gen-Old Smartphone|phone|90|1|black|sky
Portable CD Player|radio|25|1|silver|teal
Budget Netbook|laptop|70|1|black|blue
32-Inch Flatscreen|tv|110|1|black|navy
Point-and-Shoot Camera|camera|45|1|silver|black
Studio Headphones|headphones|80|1|black|red
Handheld Game System|console|60|1|gray|green
Boombox|radio|55|1|black|orange
Gaming Laptop|laptop|650|2|black|lime
DSLR Camera Kit|camera|480|2|black|navy
Noise-Canceling Headphones|headphones|190|2|silver|black
OLED Television|tv|700|2|black|purple
Current-Gen Console|console|380|2|white|blue
Flagship Smartphone|phone|520|2|silver|purple
Vintage Rangefinder Camera|camera|1900|3|silver|black
Sealed Retro Console|console|2400|3|gray|red
Reel-to-Reel Tape Deck|radio|1400|3|silver|bronze
Prototype Handheld|console|8000|4|teal|gold
Hand-Built 1976 Microcomputer|laptop|14000|4|wood|green`,
Music: `
Kazoo|trumpet|1|0|plastic|plastic
Scratched Pop LP|record|2|0|black|pink
Toy Keyboard|keyboard|8|0|plastic|yellow
Single Bongo|drum|9|0|tan|wood
Karaoke Microphone|mic|7|0|plastic|pink
Child's Ukulele|guitar|10|0|yellow|red
Beginner Acoustic Guitar|guitar|70|1|tan|darkwood
Student Violin|violin|90|1|wood|black
Used Trumpet|trumpet|120|1|brass|brass
Jazz Vinyl Box Set|record|60|1|black|blue
Snare Drum|drum|85|1|red|silver
Digital Piano|keyboard|110|1|black|gray
Dynamic Stage Mic|mic|50|1|black|black
Electric Bass|guitar|150|1|navy|white
Vintage Electric Guitar|guitar|900|2|red|cream
Analog Synthesizer|keyboard|1000|2|wood|orange
Ribbon Studio Mic|mic|650|2|silver|gold
Brass Saxophone|trumpet|700|2|gold|gold
Full Drum Kit|drum|600|2|blue|silver
Rare Punk Pressing LP|record|350|2|black|lime
1959 Sunburst Guitar|guitar|2500|3|orange|darkwood
Antique Cello|violin|2200|3|darkwood|black
Test-Pressing Debut Album|record|1800|3|black|white
Italian Master Violin (1700s)|violin|15000|4|copper|black
Guitar Smashed On Stage by a Legend|guitar|9500|4|black|white`,
Collectibles: `
Common Trading Card|card|1|0|blue|gray
Bent Bottle Caps|coin|1|0|gray|red
Coverless Comic|comic|2|0|cream|gray
Fast-Food Toy Figure|figurine|2|0|plastic|yellow
Participation Trophy|trophy|3|0|brass|black
Jar of Foreign Pennies|coin|2|0|copper|bronze
Holo Rookie Card|card|40|1|sky|purple
Silver Dollar|coin|35|1|silver|gray
Bronze Age Comic|comic|30|1|red|yellow
Limited Vinyl Figure|figurine|45|1|teal|black
Bowling League Trophy|trophy|25|1|gold|darkwood
Ammonite Fossil|fossil|60|1|tan|darkwood
Stamp Album|stamp|50|1|red|navy
Commemorative Coin Set|coin|70|1|bronze|navy
Graded Rookie Card (Gem 9)|card|420|2|gold|red
First Appearance Comic|comic|600|2|blue|red
Gold Sovereign Coin|coin|550|2|gold|gold
Trilobite Fossil|fossil|300|2|gray|black
Signed Movie Prop Figurine|figurine|350|2|silver|black
Moon Rock Shard|fossil|800|2|gray|sky
Golden Age Comic|comic|2400|3|yellow|red
Gold Double Eagle Coin|coin|2600|3|gold|gold
Raptor Claw Fossil|fossil|1900|3|cream|black
Inverted Biplane Stamp|stamp|14000|4|crimson|blue
1909 Shortstop Tobacco Card|card|13000|4|cream|orange`,
Art: `
Hotel Room Painting|painting|6|0|tan|sky
Plaster Garden Gnome|statue|5|0|red|green
Chipped Flower Vase|vase|2|0|sky|white
Velvet Tiger Painting|painting|8|0|black|orange
Paint-by-Numbers Sunset|painting|4|0|wood|orange
Souvenir Bust|statue|4|0|white|gray
Signed Local Landscape|painting|90|1|wood|green
Bronze Paperweight Sculpture|statue|60|1|bronze|black
Hand-Thrown Pottery Vase|vase|45|1|rust|cream
Framed Lithograph|painting|120|1|black|white
Ink Wash Scroll|scroll|80|1|darkwood|black
Marble Bookends|statue|70|1|white|gray
Glass Art Bowl|vase|55|1|teal|sky
Watercolor Seascape|painting|100|1|cream|blue
Mid-Century Abstract Canvas|painting|850|2|black|orange
Bronze Dancer Statue|statue|700|2|bronze|darkwood
Celadon Glaze Vase|vase|450|2|jade|white
Edo Period Woodblock Print|scroll|600|2|wood|navy
Signed Pop Art Print|painting|900|2|yellow|pink
Carved Jade Figure|statue|520|2|jade|darkwood
Impressionist Study Sketch|scroll|2500|3|gold|black
Art Nouveau Glass Vase|vase|1800|3|amethyst|gold
Lost Regional Master Oil|painting|2800|3|gold|olive
Missing Golden Age Portrait|painting|15000|4|gold|darkwood
Ancient Marble Bust|statue|12000|4|white|black`,
Antiques: `
Broken Cuckoo Clock|clock|6|0|darkwood|cream
Wickless Oil Lamp|lamp|5|0|gray|cream
Cracked Teapot|teapot|2|0|white|sky
Faded Paperback|book|1|0|cream|gray
Inflatable Globe|globe|3|0|sky|green
Torn Road Atlas|map|1|0|cream|blue
Brass Mantel Clock|clock|90|1|brass|cream
Hurricane Lamp|lamp|40|1|brass|cream
Bone China Tea Set|teapot|70|1|white|blue
Desk Globe|globe|60|1|cream|tan
Manual Typewriter|typewriter|85|1|black|cream
Leather-Bound Classics|book|50|1|leather|gold
Railroad Lantern|lamp|75|1|red|yellow
Antique Sea Chart|map|95|1|darkwood|tan
Grandfather Clock Movement|clock|800|2|gold|cream
Stained Glass Lamp|lamp|650|2|bronze|emerald
Silver Tea Service|teapot|900|2|silver|silver
Library Floor Globe|globe|500|2|tan|darkwood
Signed First Edition|book|700|2|navy|gold
Brass Ship Sextant|globe|550|2|brass|brass
Gilded Carriage Clock|clock|2400|3|gold|white
Colonial Survey Map|map|1700|3|darkwood|olive
Wartime Cipher Typewriter|typewriter|2800|3|olive|cream
Illuminated Medieval Manuscript|book|15000|4|crimson|gold
Authenticated Pirate Treasure Map|map|11000|4|darkwood|tan`,
Tools: `
Bent Hammer|hammer|2|0|rust|wood
Rusty Wrench|wrench|2|0|rust|rust
Dull Hand Saw|saw|3|0|wood|rust
Empty Toolbox|toolbox|4|0|red|gray
Drill, No Battery|drill|6|0|yellow|black
Seized Socket Set|toolbox|5|0|gray|black
Cordless Drill Kit|drill|70|1|yellow|black
Framing Hammer|hammer|25|1|darkwood|gray
Torque Wrench|wrench|80|1|silver|black
Rolling Tool Chest|toolbox|150|1|red|black
Circular Saw|saw|60|1|orange|gray
Gas Chainsaw|chainsaw|140|1|orange|gray
Pipe Wrench Set|wrench|45|1|red|red
Hammer Drill|drill|95|1|teal|black
Pro Mechanic Tool Chest|toolbox|900|2|black|silver
Cabinet Table Saw|saw|500|2|gray|navy
Commercial Chainsaw|chainsaw|450|2|lime|black
Impact Driver Combo|drill|300|2|red|black
Antique Blacksmith Hammer|hammer|260|2|darkwood|black
Machinist Wrench Set|wrench|350|2|silver|navy
Handmade Joinery Saw Set|saw|1600|3|darkwood|silver
Master Machinist Chest|toolbox|2600|3|darkwood|brass
1917 Electric Drill|drill|1900|3|black|brass
Shipwright's 1700s Tool Chest|toolbox|9000|4|darkwood|gold
Gold Presentation Hammer|hammer|7500|4|darkwood|gold`,
Sports: `
Deflated Football|ball|1|0|leather|white
Cracked Bat|bat|3|0|tan|black
Kid's Bike Helmet|helmet|4|0|lime|gray
Rusty BMX|bike|15|0|rust|black
Warped Skateboard|skateboard|4|0|tan|gray
Bag of Lost Golf Balls|ball|2|0|white|gray
Aluminum Bat|bat|40|1|silver|black
Signed Minor-League Ball|ball|30|1|white|red
Football Helmet|helmet|60|1|navy|white
Commuter Bike|bike|110|1|teal|black
Pro Skate Deck|skateboard|60|1|black|red
Golf Driver|golfclub|90|1|silver|black
Catcher's Mitt|glove|50|1|leather|tan
Boxing Gloves|glove|35|1|red|white
Carbon Road Bike|bike|950|2|black|red
Game-Used Bat|bat|600|2|tan|black
Vintage Leather Helmet|helmet|450|2|leather|darkwood
Titanium Golf Set|golfclub|800|2|gray|black
Signed Pro-Model Skateboard|skateboard|350|2|purple|yellow
Championship Basketball|ball|500|2|orange|black
Record Game Home Run Ball|ball|2800|3|white|red
Hall of Fame Glove|glove|2200|3|tan|darkwood
Tour Champion Putter|golfclub|1600|3|gold|black
1920s Slugger's Bat|bat|14000|4|cream|black
Olympic Gold Medal Bike|bike|10000|4|gold|black`,
Toys: `
One-Eyed Teddy|teddy|1|0|tan|pink
Loose Game Cartridge|cartridge|4|0|gray|red
Broken RC Car|car|5|0|red|black
Incomplete Board Game|board|1|0|white|black
Bald Fashion Doll|doll|1|0|pink|cream
Wind-Up Chattering Teeth|robot|3|0|white|red
Collector Teddy Bear|teddy|40|1|wood|red
Boxed Racing Game|cartridge|35|1|gray|blue
Die-Cast Car Set|car|30|1|blue|black
Classic Strategy Game|board|25|1|cream|black
Porcelain Doll|doll|60|1|white|yellow
Tin Wind-Up Robot|robot|90|1|silver|red
Model Airplane Kit|plane|45|1|olive|white
RC Helicopter|plane|70|1|red|black
Sealed Platformer Cartridge|cartridge|800|2|gray|red
Vintage Space Robot|robot|650|2|blue|yellow
Mint Die-Cast Prototype|car|500|2|orange|black
First Edition Fantasy Board Game|board|400|2|cream|crimson
Antique Bisque Doll|doll|550|2|rose|darkwood
Mohair Button-Ear Bear|teddy|700|2|cream|gold
Graded Sealed RPG Cartridge|cartridge|2500|3|gold|blue
1950s Tin Rocket Robot|robot|1800|3|red|silver
Pressed-Steel Pedal Car|car|1500|3|red|white
Gold Contest-Prize Cartridge|cartridge|13000|4|gold|black
Original 1959 Fashion Doll|doll|9500|4|black|yellow`,
Fashion: `
Knockoff Sneakers|sneaker|5|0|white|red
Faux Leather Purse|handbag|4|0|black|gray
Trucker Hat|hat|2|0|red|white
Moth-Eaten Sweater|jacket|2|0|olive|tan
Gas Station Sunglasses|sunglasses|1|0|black|black
Cracked Vinyl Belt|belt|1|0|black|gray
Retro Running Shoes|sneaker|60|1|blue|yellow
Leather Satchel|handbag|80|1|leather|brass
Wool Fedora|hat|45|1|gray|black
Denim Jacket|jacket|50|1|denim|white
Aviator Sunglasses|sunglasses|70|1|gold|black
Western Belt Buckle|belt|40|1|leather|silver
Varsity Jacket|jacket|75|1|red|cream
Polarized Sport Shades|sunglasses|55|1|black|teal
Limited Release Sneakers|sneaker|600|2|lime|black
Designer Handbag|handbag|900|2|cream|gold
Silk Top Hat|hat|350|2|black|crimson
Shearling Bomber Jacket|jacket|500|2|leather|cream
Rodeo Champion Buckle|belt|450|2|leather|gold
Vintage Cat-Eye Frames|sunglasses|300|2|crimson|black
Game-Worn Signature Sneakers|sneaker|2600|3|red|white
Crocodile Leather Tote|handbag|2400|3|olive|gold
Couture Runway Coat|jacket|1900|3|purple|gold
Studio-Provenance Costume Hat|hat|9000|4|black|gold
Moon-Era Prototype Sneakers|sneaker|12000|4|silver|orange`,
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

export const SPRITE_SIZE = 14;
const parsed = {};
function grid(name) {
  if (parsed[name]) return parsed[name];
  const rows = SPRITES[name].replace(/^\n/, '').split('\n').map(r => r.slice(0, SPRITE_SIZE));
  return (parsed[name] = rows);
}

/** Draw item sprite at integer (x,y) top-left in a 14x14 box, bottom-aligned. */
export function drawItem(ctx, itemId, x, y) {
  const it = ITEMS[itemId];
  const g = grid(it.sp);
  const w = Math.max(...g.map(r => r.length));
  const ox = Math.round(x + (SPRITE_SIZE - w) / 2);
  const oy = Math.round(y + SPRITE_SIZE - g.length);
  const pal = {
    o: '#211a2b', a: it.a, A: shade(it.a, 0.7), c: it.b, C: shade(it.b, 0.7),
    w: '#f6f1e6', g: '#a0a6b2', k: '#3a3348',
  };
  for (let r = 0; r < g.length; r++) {
    for (let c = 0; c < g[r].length; c++) {
      const ch = g[r][c];
      const col = pal[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(ox + c, oy + r, 1, 1);
    }
  }
}

const iconCache = new Map();
/** PNG data URL of an item sprite, scaled by an integer factor for DOM use. */
export function itemIcon(itemId, scale = 4) {
  const key = itemId + ':' + scale;
  if (iconCache.has(key)) return iconCache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = SPRITE_SIZE;
  drawItem(c.getContext('2d'), itemId, 0, 0);
  const big = document.createElement('canvas');
  big.width = big.height = SPRITE_SIZE * scale;
  const bx = big.getContext('2d');
  bx.imageSmoothingEnabled = false;
  bx.drawImage(c, 0, 0, big.width, big.height);
  const url = big.toDataURL();
  iconCache.set(key, url);
  return url;
}
