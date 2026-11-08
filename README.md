# Paldex

A game companion Paldex for [Palworld](https://www.pocketpair.jp/palworld), in
the same spirit as [pokedex-react](https://github.com/JaedenW/pokedex-react):
browse every Pal, check element matchups and work suitabilities, and work out
what two parents will breed. Built with React, TypeScript, Vite and Tailwind CSS.

## Features

**Navigation and design**

- The home page is the world map (below); every other section is in the side
  menu, grouped as Pals and Items & Base
- The same side menu everywhere: fixed on wide screens, and a slide-in drawer
  from the menu button on phones
- Flexible card grids that fit the screen, filters that stay in view while you
  scroll, and breadcrumbs on detail pages
- Light and dark themes, with a toggle at the foot of the side menu: Auto (follows
  the device), Light or Dark
- Custom dropdowns with a search box on longer lists, in the same style as the
  breeding calculator's pickers

**World map** (the home page)

- An interactive map of the Palpagos Islands and the World Tree: drag to pan,
  scroll or pinch to zoom, tap a marker for its details
- Layers: fast travel statues, towers (with boss and level), Alpha bosses,
  predator Pals, bounty targets, oil rigs and wandering merchants
- Search for a Pal to show where it spawns, day and night, for up to four Pals
  at once, or search for any place and fly to it
- Everything about the view is in the address (map, layers, Pals, selection and
  position), so a link shares exactly what you see

**Paldex**

- Every Pal, including Noct, Cryst, Lux, Ignis and other variants
- Filter by name or Paldeck number, by one or more elements and by work
  suitability; sort by number, name, HP, attack, defense or sell price; card or
  list view; variants can be hidden

**Pal pages** (`/pal/:id`)

- Base and Alpha stats, speeds, capture rate, size, food and sell price
- Work suitability levels, partner skill and element matchups
- How to get it: the same map as the home page, with its wild spawn points (day
  and night), its bosses and the World Tree regions it lives in, plus the busiest
  areas with coordinates, dungeons, raid bosses with their slabs, and its egg and
  parent pairs
- Active skills by level and passive skills
- Breeding rank, egg, and every parent pair that produces the Pal
- Normal and Alpha drops
- Previous and next Pal (← → keys)

**More to explore**

- Elements: type chart and a defence calculator for one or two elements
- Work suitabilities: every Pal ranked per job
- Active skills (with the Pals that learn each) and passive skills
- Breeding calculator: search for each parent, set their passive and active
  skills (a Pal's usual passives are filled in), and see the offspring, how it
  was decided (fixed pairing, rank maths with the nearest candidates, or which
  parent is the mother) and the odds of each trait being passed down, including
  the chance of getting a set of passives you want. A second mode lists every
  pair of parents that makes a given Pal. Everything is in the URL.
- Items: every item with type, rarity and description; equipment stats at each
  quality; food effects; and a "How to get it" section covering crafting
  (with the technology that unlocks it), gathering and ranch notes, Pal and
  enemy drops, merchants and chests, plus what it's used in
- Buildings: every structure with its build cost and tech unlock, and for
  workbenches everything they craft
- Crafting calculator: pick an item or building and a quantity. A flow view
  takes you from raw materials, through each component in the order it's made,
  to the finished item, with curves showing what feeds what (hover or tap a box
  to trace it). On phones it becomes a numbered timeline with a one-line
  summary, a compact grid of raw materials that says what each goes into, and
  ingredient chips that say which step each one comes from. A list view is there too, you can
  choose between alternate recipes, and it totals the workbenches needed
- Technology: all technologies by player level, with a level list to jump
  around, a "My level" filter, running point totals, filters for regular or
  ancient techs and for what they unlock (weapons, foundations, production…),
  and cards showing every item or building each one unlocks
- Search everything with Ctrl/⌘ + K or `/`

Nothing is saved except one display preference: if you pick Light or Dark
instead of Auto, that choice is kept in the browser's local storage. Filters,
tabs, breeding pairs and crafting plans all live in the URL, like a wiki.

## Data

Game data is scraped from [paldb.cc](https://paldb.cc), which reads the game's own
files; images and written notes come from the fan-made Palworld wikis on
[wiki.gg](https://palworld.wiki.gg) and [Fandom](https://palworld.fandom.com)
through its Cargo tables (structured data, so no HTML parsing) and committed
under `src/data`, so the app makes no runtime API calls. Pal icons and art are
saved to `public/pals`; item and building icons are shrunk to 96px WebP in
`public/items` and `public/buildings` (schematics share a placeholder). Spawn points come from the wiki's interactive habitat
map data (one small file per Pal in `public/habitats`, loaded when you open a
Pal's "How to get" tab) and the world map image is saved to `public/map`.
Coordinates are the in-game map's X, Y. About a third of Pals have no spawn
points on the wiki yet; their tab shows the wiki's text and any boss locations. To refresh everything after a game update:

```bash
npm run scrape:crawl                  # fill the page cache in one go (optional)
npm run scrape                        # everything below, in order
node scripts/scrape-pals.ts --no-images  # Pal data only, no pictures
npm run scrape:worldmap               # map markers and pictures
npm run scrape:gear                   # items, recipes, buildings, tech and icons
npm run scrape:obtain                 # spawn points and where to find each Pal
npm run audit                         # look for gaps and check against the wikis
```

Pages from paldb.cc are cached in `.cache/paldb` (a few at a time, backing off if
the site asks), so only the first run downloads them. Add `--refresh` after a game
update. The scrapers exit with an error if far fewer rows come back than expected.

The data covers the game version paldb.cc shows, recorded in `src/data/meta.json`
and shown in the footer. Items the game doesn't use, or the wiki flags as unused,
are left out, and a test fails if one slips back in. `npm run audit` lists gaps
in the data and compares it with both wikis. The wikis lag the game, so differences
usually mean they are behind.
See [Credits](#credits) for licensing.

The map's markers come from paldb.cc's map data, in real game coordinates, which
places the World Tree exactly. Predator Pals come from the wiki, as do the two map
pictures. A few Alphas that paldb.cc confirms but doesn't place on
its map (some Feybreak field bosses, and Dandilord and Silvance on the World Tree)
take the wiki's coordinates, and the map says so.

Breeding uses the game's own rules: two of one species give that species, a fixed
recipe wins, and otherwise the child is the eligible species whose breeding rank is
closest to ⌊(rank A + rank B + 1) ÷ 2⌋, with ties going to the higher rank number.
This reproduces all but two of the roughly
13,700 pairs the wiki lists; those two are older recipes the game data no longer has. Trait odds use the
wiki's documented rolls.

## Development

```bash
npm install
npm start          # dev server at http://localhost:3000
npm test           # unit tests
npm run typecheck  # TypeScript (app and scripts)
npm run lint       # oxlint
npm run build      # type-check, then build to build/
```

## Project layout

```
scripts/      the scrapers (scrape-pals.ts, scrape-worldmap.ts, scrape-gear.ts,
              scrape-obtain.ts), paldb.ts and wiki.ts, which fetch for them, and audit.ts
src/
  data/       scraped JSON (pals, skills, passives, breeding); gear/ holds items,
              buildings, recipes, tech and sources, loaded only by those pages
  Components/ UI building blocks
  Hooks/      URL-backed state, document title
  Pages/      one file per route
  Utils/      pure logic (element chart, breeding, search, work types)
```

Colours live in `src/index.css` as `pw-*` design tokens.

## Credits

- **Game data**: [paldb.cc](https://paldb.cc), a fan-made database of the game's
  files. It states no licence for reuse, so its data is **not** covered by the
  CC licence below, and the underlying game data belongs to Pocketpair. Ask its
  maintainer before reusing it elsewhere.
- **Images and written notes**: the [Palworld Wiki](https://palworld.wiki.gg) on
  wiki.gg and the [Palworld Wiki](https://palworld.fandom.com) on Fandom, and their
  contributors, licensed under
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) and CC BY-SA
  respectively. What comes from them stays under those licences. The date of the
  last scrape is in `src/data/meta.json`.
- **Palworld** and its characters, artwork and names belong to Pocketpair, Inc.
  The Pal icons and art in `public/pals` are theirs, taken from paldb.cc and the wikis.
- This is an unofficial fan project, not affiliated with or endorsed by
  Pocketpair, paldb.cc, wiki.gg or Fandom. If you are a rights holder and want something removed,
  open an issue.
