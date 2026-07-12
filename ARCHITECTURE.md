# Civ Browser — Architecture

**Status:** Active
**Last updated:** 2026-07-12
**Repository:** `https://github.com/jeehead-cloud/civ-browser`
**Local repository path:** `C:\Projects\civ-browser`

> This document describes the technical architecture of Civ Browser: the stack, the source layout, the data model, the hex-grid math, and the hard-won lessons from bugs found during development.
> Product vision belongs in `PROJECT.md`. Game design invariants belong in `PRODUCT_RULES.md`. Deployment belongs in `DEPLOYMENT.md`.

---

## 1. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Language | TypeScript | |
| Build tool | Vite | |
| UI | React (function components + hooks) | Used for panels/toolbars/pages, not for the map itself |
| Routing | React Router (`react-router-dom`) | Client-side routes; editor is a dedicated full-viewport route |
| Design system | Atlas (Claude-generated) → production tokens/CSS | Source/reference: `Design System/`; runtime: `src/design-system/` + `src/components/ui/` |
| Map rendering | HTML5 Canvas 2D (raw `CanvasRenderingContext2D`) | Chosen over PixiJS/Phaser: no physics, no heavy sprite animation, and raw canvas keeps the rendering code simple and fully under the owner's control |
| State management | Zustand | Single store in `src/game/store.ts` (not split in F1) |
| Backend | **None** | Fully client-side; no server, no database, no accounts |
| Persistence | Manual JSON export/import (download/upload a `.json` file) | IndexedDB planned in F3 — see `FOUNDATION_IMPLEMENTATION_PLAN.md` |
| Package manager | npm | |

There is intentionally no backend. Every piece of game state (map tiles, cities, civilizations, turn/year) lives in memory in the browser and is only persisted when the owner explicitly exports it to a JSON file.

---

## 2. Routing

`src/App.tsx` mounts `BrowserRouter` and declares:

| Route | Screen | Status |
|---|---|---|
| `/` | Main Menu | Working |
| `/library` | Game Content Library home | Placeholder (links only) |
| `/library/maps` | Maps catalog | Placeholder |
| `/library/maps/current/edit` | World Editor (existing MVP) | Working — temporary path until F4/F5 |
| `/library/civilizations` | Civilizations catalog | Placeholder |
| `/settings` | Settings & Balance | Placeholder |
| `/games/new` | New Game | Placeholder |
| `/games/:gameId` | Active Game | Placeholder (shows `gameId` as route context only) |
| `*` | Not found | Working |

Non-editor pages use `src/components/AppShell.tsx` (title + nav). The World Editor route does **not** use `AppShell`; it keeps the full viewport for the map and only adds a slim Main Menu link strip.

Target later route for a selected map: `/library/maps/:mapId/edit` (F5). The `current` segment is an intentional F1 bridge so the MVP remains reachable before catalogs exist.

---

## 2.1. Design system

| Role | Location |
|---|---|
| Generated source / mockups (reference only) | `Design System/` |
| Stable design docs | `docs/design/DESIGN_SYSTEM.md`, `docs/design/UI_SCREEN_MAP.md` |
| CSS tokens | `src/design-system/tokens.css` |
| Primitive styles | `src/design-system/components.css` |
| React UI primitives | `src/components/ui/` |
| Copied production assets | `src/assets/design-system/` (reserved; no logo/icon pack shipped yet) |

**Scoping:** shell pages use `.app-shell` classes and dark Atlas chrome. The World Editor isolates light MVP panel chrome under a local light background so global dark body tokens do not rewrite toolbar/panel inline layouts. Do not import `Design System/` files into the Vite bundle — translate into maintainable React/CSS instead. Full editor visual redesign is **F6**.

---

## 3. Repository Structure

```text
civ-browser/
├── Design System/                 — Claude Atlas package (reference; not a runtime dependency)
├── docs/design/
│   ├── DESIGN_SYSTEM.md
│   └── UI_SCREEN_MAP.md
├── index.html
├── package.json
├── …
└── src/
    ├── main.tsx                   — imports design tokens + component CSS
    ├── App.tsx
    ├── design-system/
    │   ├── tokens.css
    │   └── components.css
    ├── assets/design-system/      — reserved for extracted production assets
    ├── styles/index.css
    ├── pages/
    ├── game/
    └── components/
        ├── AppShell.tsx
        ├── ui/                    — Button, Card, Panel, Badge, Input, Tabs, headers, EmptyState
        ├── MapCanvas.tsx
        └── …
```

This map reflects the code as of the last update — always check the actual repository, since new files may have been added since.

---

## 4. Data Model (`src/game/types.ts`)

### Tile

```ts
interface Tile {
  coord: AxialCoord
  terrain: TerrainType         // 'ocean' | 'coast' | 'lake' | 'plains' | 'grassland' | 'mountains' | 'desert' | 'tundra' | 'snow'
  vegetation: VegetationType   // 'none' | 'forest' | 'jungle' | 'swamp'
  resource: ResourceType       // 'none' | one of ~35 specific resources
  ownerCivId: string | null
  cityId: string | null
  hasHills: boolean            // hills are a PROPERTY, not a terrain type
  riverDirections: number[]    // hex edge indices (0-5) that have a river; NOT a terrain type either
}
```

### City

```ts
interface City {
  id: string
  civId: string | null         // null = unclaimed / free city
  name: string
  coord: AxialCoord
  population: number
  productionQueue: string[]    // reserved for future milestones (units/buildings)
  culture: number              // accumulated culture points (relevant for capitals)
  isCapital: boolean
  growthRateBonus: number      // extra growth added to the global base rate, e.g. 0.005 = +0.5%
}
```

### Civilization

```ts
interface Civilization {
  id: string
  name: string
  color: string
  playerType: 'human' | 'ai'
  cultureName: string          // flavor text, e.g. "Египтяне"
  flagEmoji: string            // placeholder for a future real icon/image
  capitalCityId: string | null
}
```

### GameState / GameSettings

```ts
interface GameSettings {
  baseGrowthRate: number            // e.g. 0.01 = +1% population per turn, applied to every city
  capitalCulturePerTurn: number     // flat culture a capital generates per turn
  cultureAnnexThreshold: number     // culture a capital needs to annex a neighboring unclaimed city
}

interface GameState {
  tiles: Record<string, Tile>       // keyed by "q,r"
  cities: City[]
  units: Unit[]                     // reserved, not used yet
  civilizations: Civilization[]
  turn: number
  settings: GameSettings
}
```

### Store-level (not part of GameState, but part of the Zustand store)

- `viewMode: 'edit' | 'view'`
- `gamePhase: 'setup' | 'playing'`
- `currentYear: number`, `yearsPerTurn: number`
- `builder: { mode, selectedTerrain, selectedResource, selectedVegetation, brushRadius }` — World Builder UI state
- `viewingTileKey`, `addingCityAtKey`, `assigningCapitalForCivId` — transient UI state for popups/modals

---

## 5. Hex Grid Math (`src/game/hexGrid.ts`)

The map uses **flat-top** hexagons with **axial coordinates** (`q`, `r`).

```ts
const HEX_SIZE = 32 // pixel "radius" of a hex

axialToPixel({q, r}) => {
  x: HEX_SIZE * 1.5 * q
  y: HEX_SIZE * (sqrt(3)/2 * q + sqrt(3) * r)
}
```

Key functions:

- `tileKey(coord)` → `"q,r"` string, used as the Record key for tiles.
- `axialToPixel` / `pixelToAxial` — convert between hex coordinates and screen/world pixels (with cube-coordinate rounding for the inverse conversion).
- `neighbors(coord)` — the 6 neighboring axial coordinates, in a fixed direction order (`DIRS` array: `{1,0},{1,-1},{0,-1},{-1,0},{-1,1},{0,1}`, i.e. direction index 0-5).
- `hexDistance(a, b)` — hex grid distance.
- `hexCorners(center)` — the 6 pixel corners of a hex, used both for drawing the outline and for figuring out which edge a river click landed on.
- `generateMapCoords(width, height)` — builds the full rectangular set of axial coordinates for the map. For flat-top hexes, **columns must be offset** (`qOffset = floor(q/2)`, shifting `r`), not rows — this was a real bug (see lessons below).
- `getMapPixelBounds(width, height)` — the pixel bounding box of the whole map, used to fit the initial camera and to convert between pixel-space and 0..1 "fraction" coordinates (used heavily by the hand-authored Earth map and by region-based resource bias boxes).

### River edge indexing

A tile's `riverDirections` stores **neighbor direction indices** (matching `neighbors()`/`DIRS`), not hex-corner/edge indices directly. To draw or hit-test a river edge on the canvas, the direction index must be converted to a corner-pair via `edge = (6 - dir) % 6`, then the edge runs from `corners[edge]` to `corners[(edge+1) % 6]`. Rivers are rendered as **spokes from the tile center to each edge's midpoint** (not as the boundary edge itself) — drawing the raw boundary edge left a visible gap in tiles where a river passes through (two directions on non-adjacent edges), because each edge was drawn in isolation with nothing connecting them through the tile's interior.

---

## 6. Map Generation

There are **two** independent map-building paths, both producing the same `Record<string, Tile>` shape:

### 5.1. Procedural generation (`generateProceduralMap` in `mapGenerator.ts`)

Multi-stage pipeline: continent shape (organic coastline via noise-modulated blob growth, plus extra small/large islands) → elevation (mountain ranges with occasional width, hills) → rivers (0-1 BFS from mountains/hills down to the sea, "major" and "minor" rivers) → biome (latitude bands, "great desert" blobs capped per-landmass, forest/jungle/swamp by latitude and moisture) → resources (single roll per tile, weighted pick among matching rules, occasional "rich zones").

This mode is accepted as **imperfect** — see `CURRENT_STATUS.md` for the specific known rough edges. It's good enough for "give me a random world," not for a recognizable Earth.

### 5.2. Earth-like generation (`earthTemplate.ts` + `generateEarthLikeMap` in `mapGenerator.ts`)

In-app mode triggered by **«Создать Землю»**. Continents grow as organic blobs inside fixed fraction-space boxes (`EARTH_CONTINENTS` — oversized Europe, separate Britain/Japan islands), then forced land bridges (Anatolia, Sinai), carved straits (Gibraltar, Bosphorus, Gulf of Aden/Red Sea), landmark mountain polylines (Himalayas/Andes/Alps/Rockies), soft-edged Sahara desert override, named rivers (Nile/Amazon/Mississippi), named lakes (Baikal/Victoria), and regional resource bias (Middle East oil, Siberia gas/coal, Andes silver/gold, Australia aluminum/iron, Congo gems). Reuses the same terrain/vegetation/hills/resource helpers as the procedural path. Mountains are only painted onto existing land (no ocean mountain slivers).

This is a **stylized, regenerable approximation**, not a scientifically accurate Earth and not a one-off JSON artifact. Connectivity of Eurasia–Africa depends on the bridge/strait specs and organic growth; results vary by seed.

---

## 7. Resource System (`resourceData.ts`)

Resources are defined as a flat list of declarative rules:

```ts
interface ResourceRule {
  id: ResourceType
  category: 'bonus' | 'luxury' | 'strategic'   // category exists now; era/tech gating is NOT wired in yet
  terrains: TerrainType[]
  vegetation?: VegetationType | 'any'
  hills?: 'required' | 'excluded' | 'any'
  requiresRiver?: boolean
  chance: number
  boostTerrains?: TerrainType[]
  boostMultiplier?: number
}
```

~35 resources across bonus/luxury/strategic categories (wheat, deer, fish, gold, gems, oil, uranium, rare earths, lithium, etc.), each with terrain/vegetation/hills/river conditions so illogical combinations (e.g. wheat growing under a forest canopy) are structurally impossible.

**Placement algorithm** (see lessons below for why it looks like this): for each tile, roll **once** whether it gets any resource at all (base chance differs for land vs. water tiles), and only if that roll succeeds, pick one resource via a weighted draw among the rules that match the tile's terrain/vegetation/hills/river state (weight = rule chance × any applicable boosts × regional bias).

---

## 8. Lessons Learned (Read Before Touching Generation/Hex Code)

These are real bugs found during development. They're recorded here so they aren't reintroduced.

1. **Flat-top hex coordinate generation must offset columns, not rows.** `generateMapCoords` originally shifted `q` by row (`rOffset = floor(r/2)`), which is the correct trick for *pointy-top* hexes. For flat-top hexes (which this project uses), the shift must be `r` offset by column (`qOffset = floor(q/2)`), or the whole map renders as a diagonally-skewed parallelogram.
2. **River edge index ≠ neighbor direction index directly.** Drawing `corners[dir]` to `corners[dir+1]` for a river using the raw neighbor direction produced edges on the wrong side of the hex for 4 out of 6 directions. The correct edge index is `(6 - dir) % 6`.
3. **Rivers should be drawn as center-to-edge-midpoint spokes, not boundary edges.** Boundary-edge rendering left a visible gap through the middle of any tile with a river passing through (two edges, nothing connecting them inside the tile).
4. **0-1 BFS must not mix `Array.unshift()` with an index-based queue pointer.** `unshift()` shifts every already-processed element, silently invalidating the index pointer — this caused a "the algorithm looks like it found a path but the map doesn't reflect it" class of bug that took multiple rounds of numeric debugging (component-size checks written in a throwaway Node script) to find. Use two plain FIFO arrays (current-layer / next-layer) instead.
5. **Stage-ordering placeholder bug: land tiles start as `terrain: 'ocean'`.** All tiles are created with a placeholder `'ocean'` terrain, and land tiles only get their real biome in the biome stage. Any earlier stage (mountains, rivers) that checks `terrain !== 'ocean'` to mean "is this land" will incorrectly treat all not-yet-biome-assigned land as ocean. Fix: assign a temporary `'grassland'` placeholder to land tiles immediately after the coastline stage, before mountains/rivers run.
6. **Independent multi-seed "blob growth" for a single continent does not guarantee connectivity.** Growing a continent from several random seed points inside its bounding box can leave disconnected fragments if the seeds and their growth radii don't happen to touch. Fix: after growing, run a same-continent connectivity repair pass (find disconnected fragments restricted to that continent's own candidate tiles, BFS-connect the two largest with a minimal path).
7. **A "bridge" between two landmasses must anchor to each landmass's real largest connected body, not just "any land tile whose position falls in the right bounding box."** Overlapping bounding boxes (e.g. Africa's and Asia's boxes sharing a strip near Sinai) can let a stray patch of the *other* continent's land satisfy a naive box check, causing the bridge to connect to the wrong, disconnected fragment. Fix: compute the largest connected component within each continent's own box first, then bridge between those specific components.
8. **Independent per-resource-rule rolls oversaturate the map.** Rolling once per resource rule (of ~35 rules) per tile makes "does this tile get *some* resource" close to guaranteed even with small individual probabilities. Fix: roll once per tile for "gets a resource at all," then weighted-pick among matching rules.
9. **Hills are a property, not a terrain type.** Modeling hills as `TerrainType: 'hills'` conflicts with the fact that hills can sit on top of grassland, plains, desert, or tundra simultaneously. They were moved to a boolean `hasHills` field on `Tile`.
10. **Global browser/OS zoom can look identical to a CSS bug.** A "the whole UI looks huge" report turned out to be the browser's page zoom, not application CSS — always rule out `Ctrl+0` (reset zoom) before hunting for a CSS regression.

---

## 9. Save/Load Format

`store.ts`'s `exportMap`/`importMap` produce/consume this JSON shape:

```json
{
  "version": 1,
  "mapWidth": 250,
  "mapHeight": 135,
  "savedAt": "ISO timestamp",
  "tiles": { "q,r": { /* Tile */ }, ... },
  "cities": [ { /* City */ }, ... ],
  "civilizations": [ { /* Civilization */ }, ... ],
  "settings": { /* GameSettings */ }
}
```

Loading a file **fully replaces** the current map's tiles (and cities/civilizations/settings when present in the file) — there is no merge behavior. Older saves without `cities`/`settings` load with an empty city list and keep current settings defaults.

---

## 10. Documentation Boundaries

- Vision/roadmap → `PROJECT.md`
- AI-agent workflow → `AI_AGENTS.md`
- Target product areas / screens / flows → `PRODUCT_STRUCTURE.md`
- Foundation milestones and sequence → `FOUNDATION_IMPLEMENTATION_PLAN.md`
- Design system rules / screen map → `docs/design/DESIGN_SYSTEM.md`, `docs/design/UI_SCREEN_MAP.md`
- This document → architecture, stack, data model, hex math, lessons, **actual** routes
- Deployment → `DEPLOYMENT.md`
- Game design invariants → `PRODUCT_RULES.md`
- Current implementation snapshot → `CURRENT_STATUS.md`

---

## Guiding Rule

**Hex-grid geometry and graph-search code in this project is easy to get subtly wrong and hard to spot visually. When touching it, verify with a small numeric check (a script, a console.log, a connected-components count) — don't trust a screenshot alone.**
