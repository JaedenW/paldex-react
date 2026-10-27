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
- Search everything with Ctrl/⌘ + K or `/`

Nothing is saved: filters, tabs and breeding pairs all live in the URL.

## Data

All data is scraped from the fan-made [Palworld wiki on wiki.gg](https://palworld.wiki.gg)
through its Cargo tables (structured data, so no HTML parsing) and committed
under `src/data`, so the app makes no runtime API calls. Pal icons and art are
saved to `public/pals`. To refresh everything after a game update:

```bash
npm run scrape                        # data and images
node scripts/scrape.mjs --no-images   # data only
```

The script exits with an error if the wiki returns far fewer Pals than expected.
Wiki text is available under CC BY-SA; Palworld and its artwork belong to
Pocketpair. This is an unofficial fan project.

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
scripts/      scrape.mjs, the wiki scraper
src/
  data/       scraped JSON (pals, skills, passives, items, combos)
  Components/ UI building blocks
  Hooks/      URL-backed state, document title
  Pages/      one file per route
  Utils/      pure logic (element chart, breeding, search, work types)
```

Colours live in `src/index.css` as `pw-*` design tokens.
