# Red Planet Pawn: MarsNet Edition

An alternate version of Red Planet Pawn with no walking around. The whole shop runs on a fake Mars colony desktop OS: draggable windows, a taskbar, and a command shell.

Static HTML/CSS/JS, no build. Open `index.html` through any static server, or deploy with `amplify.yml`.

## Files
- `js/sim.js, guild.js, ai.js, net.js, items.js, profiles.js, sound.js, art.js`: copied unchanged from `pawn-stack`. Keep them in sync by copying again when the main game changes.
- `js/ext.js`: `TermSim`, the shared Sim plus terminal mechanics (scan, dossier, hack).
- `js/os.js`: the desktop UI (window manager, apps, shell, pixel portraits/icons).
- `css/os.css`: styling.

## Windows
AIRLOCK CAM (counter), INTEL.EXE (scanner + dossiers), STOCK.DB (inventory + shelf prices), SHELL, LEDGER, ADMIN (staff/upgrades/insurance), NETLINK (hacking), GUILD_COMMS, NIGHTLY_REPORT. The MARSNET button tiles the windows back to the default layout.

## New mechanics
- Scan: 25 CR. Detects fakes (80% + 4% per Appraiser level) and gives a +/-8% value range. At the counter it costs the seller 3s of patience.
- Dossier: 15 CR, 2s of patience. Seller bottom line (+/-12%), fraud flags, loan reliability; or buyer budget and how well they spot fakes.
- Hack: 40 CR, 2 per sol, midday or evening only. Success 70% minus 13% per target Security level (min 25%). Books breach shows cash, top stock, upgrades. Guild intercept shows a rival's sealed answer. Half of failures are traced: fine of 60 + 10% cash, and the target is told your name.

Multiplayer uses its own PeerJS slug (`redplanetpawn-term-v1`), so it does not collide with the 2D game.
