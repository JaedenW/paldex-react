# Paldex

A game companion Paldex for [Palworld](https://www.pocketpair.jp/palworld), in
the same spirit as [pokedex-react](https://github.com/JaedenW/pokedex-react):
browse every Pal, check element matchups and work suitabilities, and work out
what two parents will breed. Built with React, TypeScript, Vite and Tailwind CSS.

## Features

**Paldex**

- Every Pal, including Noct, Cryst, Lux, Ignis and other variants
- Filter by name or Paldeck number, by one or more elements and by work
  suitability; sort by number, name, HP, attack, defense or sell price; card or
  list view; variants can be hidden

**Pal pages** (`/pal/:id`)

- Base and Alpha stats, speeds, capture rate, size, food and sell price
- Work suitability levels, partner skill and element matchups
- How to get it: an interactive world map of its wild spawn points (day and
  night), the busiest areas with coordinates, Alpha and Predator boss locations,
  dungeons, raid bosses and a breeding summary
- Active skills by level and passive skills
- Breeding rank, egg, and every parent pair that produces the Pal
- Normal and Alpha drops
- Previous and next Pal (← → keys)

**More to explore**

- Elements: type chart and a defence calculator for one or two elements
- Work suitabilities: every Pal ranked per job
- Active skills (with the Pals that learn each) and passive skills
- Breeding calculator: pick two parents and see the child; the pair lives in
  the URL so a result can be shared
- Items: every item with type, rarity and description; equipment stats at each
  quality; food effects; how to craft it, what it's used in, which Pals and
  enemies drop it, which merchants sell it and which chests hold it
- Buildings: every structure with its build cost and tech unlock, and for
  workbenches everything they craft
- Crafting calculator: pick an item or building and a quantity to get the raw
  materials, the crafting steps in order and the workbenches needed
- Technology: all technologies grouped by player level, with point costs, what
  each unlocks, and totals for any level range
- Search everything with Ctrl/⌘ + K or `/`

Nothing is saved: filters, tabs, breeding pairs and crafting plans all live in
the URL, like a wiki.

## Data

All data is scraped from the fan-made [Palworld wiki on wiki.gg](https://palworld.wiki.gg)
through its Cargo tables (structured data, so no HTML parsing) and committed
under `src/data`, so the app makes no runtime API calls. Pal icons and art are
saved to `public/pals`; item and building icons are shrunk to 96px WebP in
`public/items` and `public/buildings` (schematics share a placeholder). Spawn points come from the wiki's interactive habitat
map data (one small file per Pal in `public/habitats`, loaded when you open a
Pal's "How to get" tab) and the world map image is saved to `public/map`.
Coordinates are the in-game map's X, Y. About a third of Pals have no spawn
points on the wiki yet; their tab shows the wiki's text and any boss locations. To refresh everything after a game update:

```bash
npm run scrape                        # everything below
node scripts/scrape.mjs --no-images   # Pal data only, no icons
npm run scrape:obtain                 # where-to-find data and the world map
npm run scrape:gear                   # items, recipes, buildings, tech and icons
```

The script exits with an error if the wiki returns far fewer Pals than expected.
See [Credits](#credits) for licensing.

Breeding follows the wiki's rules: a listed unique combination wins, otherwise
the child is the Pal whose breeding rank is closest to the parents' average,
with ties broken by the lower duplicate priority. The wiki doesn't say which Pals
are excluded from the rank lookup, so bosses and legendaries (unique-combo Pals
with rank ≤ 30) are left out by a heuristic in `src/Utils/breeding.ts`; check
results involving those against the game.

## Development

```bash
npm install
npm start          # dev server at http://localhost:3000
npm test           # unit tests
npm run typecheck  # TypeScript
npm run build      # type-check, then build to build/
```

## Project layout

```
scripts/      scrape.mjs, scrape-obtain.mjs and scrape-gear.mjs, the wiki scrapers
src/
  data/       scraped JSON (pals, skills, passives, combos); gear/ holds items,
              buildings, recipes, tech and sources, loaded only by those pages
  Components/ UI building blocks
  Hooks/      URL-backed state, document title
  Pages/      one file per route
  Utils/      pure logic (element chart, breeding, search, work types)
```

Colours live in `src/index.css` as `pw-*` design tokens.

## Credits

- **Data and images**: the [Palworld Wiki](https://palworld.wiki.gg) on wiki.gg
  and its contributors, licensed under
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0). The files in
  `src/data` are derived from it (reformatted and combined) and so remain under
  CC BY-SA 4.0. The date of the last scrape is in `src/data/meta.json`.
- **Palworld** and its characters, artwork and names belong to Pocketpair, Inc.
  The Pal icons and art in `public/pals` are theirs, taken from the wiki.
- This is an unofficial fan project, not affiliated with or endorsed by
  Pocketpair or wiki.gg. If you are a rights holder and want something removed,
  open an issue.
