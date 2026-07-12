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
| State management | Zustand | Single store in `src/game/store.ts` (legacy runtime; domain migration deferred) |
| Domain model (F2) | `src/domain/` | Template vs session TypeScript types + adapters; not wired into Zustand yet |
| Local persistence (F3) | IndexedDB via Dexie (`src/persistence/`) | Repository interfaces used by F4 catalogs via `src/catalog/` |
| Content catalogs (F4) | `src/catalog/` + library pages | Maps/Civilizations CRUD, v1 JSON import/export |
| Selected-map editor (F5) | `/library/maps/:mapId/edit` | Load/save MapTemplate via repositories; dirty tracking; legacy Zustand runtime |
| Backend | **None** | Fully client-side; no server, no accounts |
| File exchange | Manual JSON export/import (v1 map files) | Independent of IndexedDB; unchanged in F3 |
| Package manager | npm | |

There is intentionally no backend. Live editor/gameplay state still lives in the Zustand store and can be exchanged via v1 JSON download/upload. F3 IndexedDB repositories store domain entities. **F4** wires Maps and Civilizations catalogs. **F5** opens `/library/maps/:mapId/edit`, loads/saves the selected `MapTemplate`, and tracks unsaved changes. **F6** restructures the editor into a command bar + map + right panel. **F7** adds independent terrain/feature/elevation/river/resource layer operations. **F8** provides repository-backed rules presets at `/settings`. **F9** creates independent `GameSession` records via the New Game wizard. **F10** loads a session into a dedicated active-game runtime (`src/gameSession/`), runs the turn engine, autosaves, and renders the Active Game shell. **F11** adds contextual tile/city popups, fresh-water and informational yield selectors, and expanded Overview/Cities/World panels. Scratch editor remains at `/library/maps/current/edit` (not catalog-backed).

---

## 2. Routing

`src/App.tsx` mounts `BrowserRouter` and declares:

| Route | Screen | Status |
|---|---|---|
| `/` | Main Menu | Working |
| `/library` | Game Content Library home | Working (Maps + Civilizations entry) |
| `/library/maps` | Maps catalog | Working (F4 repository-backed) |
| `/library/maps/:mapId/edit` | World Editor for a catalog map | Working (F5 load/save) |
| `/library/maps/current/edit` | Scratch World Editor (MVP) | Working — not catalog-backed; development fallback |
| `/library/civilizations` | Civilizations catalog | Working (F4 repository-backed) |
| `/settings` | Settings & Balance | Working (F8 rules presets) |
| `/games/new` | New Game | Working four-step wizard (F9) |
| `/games/:gameId` | Active Game | Working shell (F10) + context popups (F11) |
| `*` | Not found | Working |

Non-editor pages use `src/components/AppShell.tsx` (title + nav). The World Editor route does **not** use `AppShell`; it uses a full-viewport F6 shell: top command bar, dominant map, right editing panel.

Routing uses `createBrowserRouter` / `RouterProvider` so `useBlocker` can guard unsaved editor navigation.

Catalog **Open** navigates to `/library/maps/:mapId/edit`. Scratch `/library/maps/current/edit` remains for Main Menu / nav “World Editor” without a selected catalog id.

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

**Scoping:** shell pages use `.app-shell` classes and dark Atlas chrome. The World Editor uses Atlas command-bar / right-panel chrome (`world-editor-*` classes) with the map as the dominant visual area. Do not import `Design System/` files into the Vite bundle — translate into maintainable React/CSS instead.

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
    ├── domain/                    — F2 template/session types + adapters (+ validators)
    │   ├── maps.ts
    │   ├── civilizations.ts
    │   ├── rules.ts
    │   ├── gameSession.ts
    │   ├── adapters.ts
    │   ├── validators.ts
    │   ├── verification.ts
    │   ├── verify.ts              — npm run verify:domain
    │   └── index.ts
    ├── persistence/               — F3 IndexedDB (Dexie) repositories
    │   ├── database.ts
    │   ├── schema.ts
    │   ├── errors.ts
    │   ├── seed.ts
    │   ├── repositories/
    │   ├── verification.ts
    │   ├── verify.ts              — npm run verify:persistence
    │   └── index.ts
    ├── catalog/                   — F4/F5 catalog services / hooks (no Dexie in React pages)
    │   ├── persistence.ts         — lazy getCatalogPersistence singleton
    │   ├── mapFactory.ts
    │   ├── mapJson.ts             — v1 JSON ↔ MapTemplate
    │   ├── civilizationFactory.ts
    │   ├── editorBridgeCore.ts    — pure MapTemplate → legacy payload
    │   ├── editorBridge.ts        — loads payload into Zustand
    │   ├── editorPersistence.ts   — legacy ↔ MapTemplate save/load helpers
    │   ├── hooks/
    │   ├── verification.ts / verify.ts
    │   └── editorPersistenceVerification.ts / verifyEditorPersistence.ts
    ├── editor/                    — F6 display-layer helpers + verify:world-editor-ui
    ├── rules/                     — F8 parameter defs, preset service/hook, verify:rules-presets
    ├── newGame/                   — F9 setup validation, createGameSession, persistence service, wizard hook, verify:new-game
    ├── gameSession/               — F10 runtime + F11 context selectors (fresh water, yields, events, world metrics), verify:active-game / verify:active-context
    ├── game/                      — legacy runtime types + Zustand store (World Editor / Sim)
    │   └── mapLayers/             — F7 independent layer operations + verify:map-layers
    └── components/
        ├── AppShell.tsx
        ├── ui/                    — Button, Accordion, SegmentedControl, Dialog, …
        ├── editor/                — EditorCommandBar, EditorRightPanel, Tiles/Cities/Display sections
        ├── rules/                 — ParameterField
        ├── newGame/               — WizardSteps, SelectionCard, ValidationSummary
        ├── activeGame/            — TilePopup, CityPopup, EventsPanel, CitiesPanel, WorldPanel, CivilizationsSummary
        ├── MapCanvas.tsx          — editor paint + optional active `view` prop (read-only)
        └── … (CityModal, TileInfoPanel, temporary Simulation panels)
```

This map reflects the code as of the last update — always check the actual repository, since new files may have been added since.

---

## 3.1. Domain layer vs legacy runtime (F2)

| Layer | Location | Role |
|---|---|---|
| Legacy runtime | `src/game/types.ts`, `src/game/store.ts` | What the editor, canvas, turn engine, and v1 JSON I/O actually use today |
| Target domain | `src/domain/` | Compile-time separation of reusable templates vs `GameSession` |

**Types:**

| Type | Responsibility |
|---|---|
| `MapTemplate` | Reusable map: dimensions, tiles, `MapCityTemplate[]` — no turn/year/civ progress |
| `MapCityTemplate` | Pre-game city placement (id, name, coord, startingPopulation) |
| `CivilizationTemplate` | Catalog civ (name, culture, flag, defaultColor) — no capital/runtime |
| `GameRulesPreset` | Reusable balance (`baseGrowthRate`, `capitalCulturePerTurn`, `cultureAnnexThreshold`) |
| `GameRulesSnapshot` | Independent rules copy embedded in a session |
| `GameSession` | Active/resumable game: copied tiles/cities/civs + rules snapshot + turn/year |
| `GameCity` / `CivilizationInstance` | Session-mutable city / participating civ snapshots |

**Adapters** (`src/domain/adapters.ts`): convert legacy `GameState` / `City` / `Civilization` / `GameSettings` into domain entities with `ConversionResult`, deep-cloning nested data via `structuredClone`. Session creation must not share mutable references with templates or presets.

**Validators** (`src/domain/validators.ts`): pure entity validators shared by adapters and F3 persistence saves.

**UI wiring:** F4 catalogs and F5 selected-map editor use domain types through repositories. Zustand still uses legacy `GameState` for runtime editing.

---

## 3.2. Persistence layer (F3)

| Item | Value |
|---|---|
| Technology | IndexedDB via **Dexie** |
| Production DB name | `civ-browser` |
| Schema version | `1` (`DATABASE_SCHEMA_VERSION`) — independent of domain entity `version` |
| Object stores | `maps`, `civilizations`, `rulesPresets`, `gameSessions` |
| Primary key | entity `id` |
| Indexes | `updatedAt`, `name` on each store |
| Access | `MapRepository`, `CivilizationRepository`, `RulesPresetRepository`, `GameSessionRepository` via `createPersistenceServices` / `createPersistence` |
| Errors | `PersistenceError` with codes: `database_open`, `validation`, `serialization`, `write`, `read`, `migration` |
| Seed | Idempotent `Standard` rules preset only (`rules-standard`); no default maps/civs/sessions |
| Verification | `npm run verify:persistence` (uses `fake-indexeddb` + isolated DB name) |

**Rules:** `list`/`get` return deep clones; `save` clones input, validates, sets `updatedAt`; missing `get` → `null`; no cascading deletes (deleting a template never deletes sessions).

**Catalog wiring (F4):** library pages open persistence lazily via `getCatalogPersistence({ seed: true })` when catalogs mount — not on every render and not on unrelated routes. Rules presets remain seeded but have no F4 UI.

---

## 3.3. Content catalogs (F4)

| Item | Behavior |
|---|---|
| Pages | `/library/maps`, `/library/civilizations` via `useMapsCatalog` / `useCivilizationsCatalog` |
| Create map | Blank all-ocean `MapTemplate` (dimensions clamped 16–250×135); not procedural |
| Map readiness | Temporary heuristic: Blank / Draft (land, no cities) / Ready (≥1 city) |
| Map JSON import | Legacy **v1** file → new catalog map; **ignores** `civilizations` and `settings` (noted in UI) |
| Map JSON export | **v1-compatible** JSON (`version`, `mapWidth`, `mapHeight`, `tiles`, `cities`) — catalog metadata omitted |
| Editor open | Catalog Open → `/library/maps/:mapId/edit` (F5) |
| Save-back | Save / Save As via `MapRepository` (F5) |
| Verification | `npm run verify:catalogs` |

Legacy editor Load/Export Map buttons are unchanged and independent of the catalog import/export actions.

---

## 3.4. Selected-map editor persistence (F5)

| Item | Behavior |
|---|---|
| Route | `/library/maps/:mapId/edit` |
| Scratch fallback | `/library/maps/current/edit` — no catalog binding / no Save |
| Load | `loadCatalogMapById` → `loadMapTemplateIntoEditor` → Zustand `loadSelectedCatalogMap` |
| Save | `legacyEditorToMapTemplate` → validate → `MapRepository.save`; preserves `id` / `version` / `createdAt`; refreshes `updatedAt` |
| Save As | New id + navigate to new `:mapId/edit` |
| Dirty | Store flag set by map-content mutators (`paintAt`, rivers, cities, regenerate, earth, import, rename); not by pan/zoom/view mode |
| Leave guard | `beforeunload` + React Router `useBlocker` confirm when dirty |
| Not-found / error | Atlas EmptyState + retry / back to catalog; editor not initialized |
| Legacy JSON | Command-bar Import/Export; import marks dirty; export uses active map dimensions; schema unchanged |
| Verification | `npm run verify:editor-persistence` |

## 3.5. World Editor layout (F6)

| Item | Behavior |
|---|---|
| Shell | Top `EditorCommandBar` + dominant map column + right `EditorRightPanel` (~320–380px). No permanent left toolbar. |
| Modes | View/Edit segmented control; View opens tile info; Edit applies active tool |
| Right sections | Tiles / Cities / Display / Sim (temporary legacy simulation panels) |
| Display | `editorDisplay` UI state + presets; rendering only; does not mark dirty or mutate `MapTemplate` |
| Clear Tile | Builder mode `clear` — keeps terrain + city; clears vegetation/hills/rivers/resource/owner |
| Cities | Create via existing modal; list/search/center/edit; delete with confirm (not via Clear Tile) |
| Deferred | Resize, mini-map, F7 generation ops, improvements/roads/labels models |
| Verification | `npm run verify:world-editor-ui` |

## 3.6. Independent map layers (F7)

| Item | Behavior |
|---|---|
| Module | `src/game/mapLayers/` — pure ops returning `LayerOpResult` (clone-in, no caller mutation) |
| RNG | Local `mulberry32` (same algorithm as `mapGenerator`); optional explicit seed |
| Store | `applyLayerResult` — one tiles update per op; `editorDirty` only if `changed` |
| Terrain Only | Base ocean/coast/lake/biomes; skip city tiles; clean water-incompatible overlays; does not place mountains/rivers/features/resources |
| Features | Clear all vegetation / regenerate; skip placements that would invalidate existing resources |
| Mountains/Hills | Clear all; random small cluster (3–12); random chain (6–24); never on water/cities; no mountain+hills |
| Rivers | Clear all; short/long downhill paths with mirrored edges |
| Resources | Clear all; randomize with Sparse/Standard/Rich density multiplier (not per-tile quantity) |
| Full map | Existing `regenerateMap` / `generateEarthMap` remain distinct full-pipeline actions |
| Verification | `npm run verify:map-layers` |

## 3.7. Rules presets / Settings & Balance (F8)

| Item | Behavior |
|---|---|
| Route | `/settings` — repository-backed preset editor (no longer a placeholder) |
| Definitions | `src/rules/parameterDefinitions.ts` drives labels, units, ranges, defaults, category grouping |
| Service/hook | `rulesPresetService` + `useRulesPresets` via `getCatalogPersistence` (no Dexie in React) |
| Percent conversion | `baseGrowthRate` stored as decimal (0.01); UI edits percent via `storageToUiValue` / `uiToStorageValue` |
| Validation | Domain `validateRulesValues` / `RULES_VALUE_LIMITS` aligned with parameter defs |
| Standard | `rules-standard` — editable, duplicable, resettable; delete blocked; seed idempotent / non-overwriting |
| Draft model | Local draft until Save; Revert Unsaved; Reset field/category/all (dirty until Save) |
| Dirty protection | `beforeunload` + `useBlocker`; confirm on preset switch |
| Legacy boundary | World Editor Sim `SettingsPanel` edits Zustand `GameSettings` only — not the preset catalog |
| F9 boundary | Presets are reusable templates; New Game copies into `GameRulesSnapshot` with no live link |
| Verification | `npm run verify:rules-presets` |

## 3.8. New Game Wizard (F9)

| Item | Behavior |
|---|---|
| Route | `/games/new` — four steps: Map → Civilizations → Game Settings → Review & Start |
| Wizard state | Single in-memory state via `useNewGameWizard` + pure `wizardState` helpers; refresh resets (no draft repository) |
| Sources | Maps / civilizations / rules presets loaded through catalog persistence (repositories); React does not touch Dexie |
| Map step | Select one map; zero-city maps may be inspected but cannot proceed; Open in Editor warns if dirty |
| Civilizations | Add/remove catalog templates; exactly one Human (others AI); per-game color override; unique capital from map cities |
| Settings | Choose rules preset + starting year / years per turn / optional maximum turns; preset values shown read-only |
| Session factory | Pure `createGameSessionFromSetup` — deep-copies tiles, converts `MapCityTemplate` → `GameCity`, snapshots civs + rules |
| Ownership | Only assigned capitals receive `civId` + `isCapital`; other cities stay unclaimed; no inferred territory |
| Persistence | `createAndSaveGameSession` re-reads sources, validates, creates once, saves via `GameSessionRepository`, verifies with `get` |
| Immutability | Source `MapTemplate`, `CivilizationTemplate`, and `GameRulesPreset` are never mutated by creation |
| Leave guards | `beforeunload` + router blocker after meaningful progress; cleared after successful create |
| Navigation | After create, navigate to `/games/:gameId` (Active Game shell — F10) |
| Verification | `npm run verify:new-game` |

## 3.9. Active Game Shell (F10)

| Item | Behavior |
|---|---|
| Route | `/games/:gameId` — load session, isolated runtime, map + top bar + right column |
| Runtime | Dedicated Zustand store `useActiveGameStore` in `src/gameSession/` — **not** the World Editor store |
| Load | `loadGameSession` → validate → deep-copy hydrate; loading / not-found / error states |
| Turn engine | Pure `applyTurn`: growth → capital culture → annexation → year+ → turn+ (PRODUCT_RULES formulas unchanged) |
| Events | Structured `GameSessionEvent[]` (optional on session); growth summary, culture, annexation, turn completed |
| Save | Explicit **Save Game**; **autosave after each successful Next Turn**; failed save keeps runtime; Retry Save |
| Map | `MapCanvas` `view` prop — pan/zoom/select only; no editor tools; selection highlight |
| Top bar | Human civ flag/name/capital/pop/cities/culture; year/turn; save status |
| Right column | Tabs Overview (events + civ list + Next Turn), Cities (read-only), World (summary) |
| Continue Game | Main Menu opens most recently updated `GameSession` |
| Isolation | Source map templates and rules presets are never mutated by play |
| Verification | `npm run verify:active-game` |

## 3.10. Active Game context popups (F11)

| Item | Behavior |
|---|---|
| Positioning | Map-edge overlay card (bottom-left of map column). Canvas camera anchor-follow deferred — documented choice for stability |
| Tile popup | Landscape, water/fresh-water, informational yields, ownership; no actions |
| City popup | Real fields only + planned Buildings/Characters/Build/Actions (disabled/dialog) |
| Fresh water | Pure `analyzeFreshWater`: river edge on tile OR adjacent lake |
| Yields | Pure `calculateTileYields` — display-only base table; does not affect growth |
| Right column | Overview (events + civ expand), Cities (search/filter/select), World (metrics) |
| Events | Normalize missing/unknown; newest first; click centers related city when resolvable |
| Selection | Runtime-only; never dirties session or triggers save |
| Verification | `npm run verify:active-context` |

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
