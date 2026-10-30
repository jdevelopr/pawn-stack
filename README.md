# Red Planet Pawn

A 2D pixel-art pawn shop game for desktop browsers, set in a Mars colony in the
year 2149. Haggle with humans, astronauts, and aliens in the morning, flip their
goods to buyers in the afternoon, and spend your credits (CR) on staff,
advertising, and shop upgrades in the evening. Play solo or with up to 4 players
in a shared market. Days are called sols.

Plain HTML, CSS, and JavaScript. No build step, no npm install.

## How it plays

Each day has three parts:

1. **Morning: buying.** Sellers bring items to your counter one at a time. You see
   the item, its condition, and your appraiser's value estimate. Offer low and
   haggle, pay their asking price, or pass. Offers far below their bottom line
   cost patience; run out and they refuse to deal with you. Some items are fakes.
2. **Afternoon: selling.** Buyers ask for a category. Pick an item and name a
   price. Price it sensibly and they buy; a little high and they counter; way too
   high and they lose patience.
3. **Evening: books and upgrades.** Rent and staff wages are paid, your restorer
   fixes items, thieves may strike. Walk to the office board to buy upgrades.

You can dump any item to the wholesaler at any time for a fraction of its real
value, which is how you cut losses on a bad buy.

### Items

250 unique items, 25 in each of 10 categories: Earth Relics (antiques from
roughly 1950-2060 Earth, like a 2026 smartphone or a paper newspaper), Tech,
Ship Parts, Xeno Artifacts, Minerals, Tools, Music, Art, Gear (suits, helmets,
jetpacks), and Toys. Each runs from Junk to Legendary.

### Customers

Every customer has a profile that changes how they haggle. The deal panel shows
who you are dealing with.

| Profile | Type | As a seller | As a buyer |
|---|---|---|---|
| Colonist | Human | Baseline | Baseline |
| Dome Miner | Human | Cheap, but short patience | Short patience; wants Tools, Minerals |
| Earth Tourist | Human | Rare; asks high | Overpays, rarely spots fakes |
| Relic Collector | Human | Knows values, little haggle room | Pays extra for Earth Relics, spots fakes |
| Smuggler | Human | Very cheap, 40% fakes | Buys anything, never checks, pays little |
| Freighter Spacer | Astronaut | Ship parts, gear, tech | Big spender |
| Belt Prospector | Astronaut | Better-quality goods, hard bargainer | Pays extra for Tools |
| Grey Broker | Alien | Shrewd, offended by lowballs, drops ask fast | Spots fakes |
| Glorp | Alien | No idea what anything is worth (wild prices) | Wild prices, very patient |
| Zix Swarmling | Alien | Brings shiny, better goods | Pays extra for Minerals, hates junk |

Tuning for each profile lives in `js/profiles.js`.

### Upgrades

| Upgrade | Effect |
|---|---|
| Appraiser (staff) | Narrower value estimates, reveals rarity, detects fakes from level 2 |
| Advertising | More sellers, better items, and they come to you first |
| Storefront | More buyers who come to you first, with slightly larger budgets |
| Storage | +4 inventory slots per level |
| Haggler (staff) | Asks drop faster, more patience, reads the seller's bottom line |
| Salesclerk (staff) | Buyers pay more, better wholesale prices, reads buyer budgets |
| Restorer (staff) | Raises the condition of items overnight |
| Security | Reduces overnight theft |

Staff draw a daily wage. Dome rent rises every sol.

### Multiplayer (shared market)

Everyone sees the same sellers and buyers. The first player to close a deal
wins it. Haggling a seller's ask down lowers it for everyone, so a rival can
swoop in and pay the price you worked for. Players who advertised get a
4-second head start with the sellers their ad attracted, and the same for
storefront upgrades with buyers. Highest net worth (cash plus the true value of
inventory) at the end wins.

### Controls

- **A / D** or **arrow keys**: walk
- **E** or **Space**: use the counter, shelves, or office board
- **I**: inventory
- **Esc**: close a panel
- **M**: mute

## Files

```
index.html        all screens
css/style.css     pixel UI styling
js/main.js        screens, solo/host/join wiring, render loop, input, panels
js/sim.js         authoritative game rules (runs in solo, or on the host)
js/items.js       the 250 items, their sprites and palettes
js/profiles.js    customer types: haggling behavior and speech lines
js/art.js         Mars scene, humans/astronauts/aliens/droids, pixel font
js/net.js         PeerJS networking (host-authoritative star)
js/sound.js       WebAudio sound effects
fonts/            Tiny5 and Press Start 2P pixel fonts (SIL Open Font License)
amplify.yml       AWS Amplify config (no build)
```

The game canvas is 384x216 and is scaled by a whole number to fit the window,
so every pixel lands on the grid. The menus and panels use the same pixel size:
CSS sizes are in multiples of `--u` (one game pixel), and both fonts are drawn at
8 font pixels per em so one font pixel equals one game pixel. Characters have no
black outlines; their edges are shaded from their own colors.

## Run locally

ES modules need a web server; opening `index.html` directly will not work.

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

To test multiplayer on one computer, use a normal window and a private window
(two tabs in the same window share an identity).

## Deploy to AWS Amplify

**Option A: connect the GitHub repo**

1. AWS Amplify console, **Create new app**, choose **GitHub**, pick this repo and the `main` branch.
2. Amplify detects `amplify.yml`. There is no build command; it serves the files as-is.
3. Save and deploy. You get an `https://...amplifyapp.com` URL. Every push to `main` redeploys.

**Option B: drag and drop**

Zip the folder contents (so `index.html` is at the top of the zip), then in Amplify
choose **Deploy without Git** and drop the zip.

HTTPS is required for the multiplayer connection, and Amplify provides it.
Join links look like `https://your-app.amplifyapp.com/?room=ABCD`.

## Multiplayer notes

- Multiplayer uses PeerJS over WebRTC. The host's browser runs the game and the
  others connect directly to it. If the host closes their tab, the game ends.
- A player who drops can reopen the join link and gets their shop back.
- The free public PeerJS signaling server is fine for playing with friends but has
  no uptime guarantee. For anything bigger, run your own PeerServer
  (`npx peer --port 9000`, or the Docker image) and pass its address to
  `createHost`/`createClient` in `js/main.js` via `peerOptions`, e.g.
  `{ host: 'peer.yourdomain.com', port: 443, secure: true, path: '/' }`.
- Players on very restrictive networks may need a TURN server to connect.

## Solo saves

Solo progress is saved in your browser at the end of each sol. **Continue** on the
title screen picks up from the last evening.
