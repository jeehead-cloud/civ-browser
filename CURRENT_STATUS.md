# Civ Browser — Current Status

**Status:** Active
**Last updated:** 2026-07-12
**Repository:** `https://github.com/jeehead-cloud/civ-browser`
**Local repository path:** `C:\Projects\civ-browser`

> This is the frequently updated implementation snapshot for Civ Browser.
> It records what's actually implemented (per milestone), what's known-broken or deliberately deferred, and the nearest next steps.
> After every repository-changing agent iteration, reconcile this snapshot and update the change logs (§§6–8). Full procedure: `AI_AGENTS.md` §14.
>
> Foundation **sources of truth** (in-repo): `PRODUCT_STRUCTURE.md` (target product areas/screens/flows) and `FOUNDATION_IMPLEMENTATION_PLAN.md` (F1–F12 sequence and acceptance criteria).

---

## 1. Current Development Phase

The project has a working MVP gameplay loop (map editing → civilizations → turns → growth/culture/annexation) and has started the **foundation restructuring** described in `PRODUCT_STRUCTURE.md` / `FOUNDATION_IMPLEMENTATION_PLAN.md`.

**F1–F9 foundation work is in place:** shell/routing (F1), Atlas design system (D1), domain types (F2), IndexedDB repositories (F3), Maps/Civilizations catalogs (F4), selected-map editor persistence (F5), World Editor IA restructure (F6), independent map-layer operations (F7), repository-backed rules presets at `/settings` (F8), and the New Game wizard that creates independent `GameSession` records (F9). Scratch editor remains at `/library/maps/current/edit`. `/games/:gameId` shows a persisted session summary; full Active Game UI is F10.

There is still no Active Game turn loop on `GameSession` and no units/combat/AI — those remain later milestones (F10+, M6–M8). Legacy World Editor Sim can still run a local play loop.

---

## 2. Foundation Milestone Status

### F1 — Application Shell and Routing (Done)

Implemented:
- React Router (`react-router-dom`) with Main Menu, Library, Maps/Civilizations catalogs, Settings & Balance, New Game wizard, Active Game route, and not-found.
- Existing editor UI at `/library/maps/:mapId/edit` (catalog) and `/library/maps/current/edit` (scratch).
- `AppShell` for non-editor screens; editor uses full-viewport F6 shell.

### D1 — Design System Foundation (Done — supporting task)

Implemented:
- Stable docs: `docs/design/DESIGN_SYSTEM.md`, `docs/design/UI_SCREEN_MAP.md`.
- Tokens: `src/design-system/tokens.css`; primitive styles: `src/design-system/components.css`.
- UI primitives under `src/components/ui/`: Button, IconButton, Card/CardLink, Panel, Badge, Input, Tabs, PageHeader, SectionHeader, EmptyState, Dialog, ConfirmDialog, FormField, Accordion, SegmentedControl.
- AppShell and non-editor routes use Atlas (dark graphite + gold).
- World Editor uses Atlas command-bar / right-panel chrome (F6).

Not done in D1 (deferred):
- Lucide icon pack / logo assets (no production assets copied yet; `src/assets/design-system/` reserved).

### F2 — Domain Model Separation (Done)

Implemented:
- Domain types under `src/domain/`: `MapTemplate`, `MapCityTemplate`, `CivilizationTemplate`, `CivilizationInstance`, `GameRulesPreset`, `GameRulesSnapshot`, `GameSession`, `GameCity`.
- Adapters + shared validators (`src/domain/validators.ts`).
- Focused verification: `npm run verify:domain`.

Still legacy (intentionally):
- Zustand `GameState` / editor / turn engine / v1 JSON import-export.

### F3 — Persistence Abstraction (Done)

Implemented:
- Dexie IndexedDB DB `civ-browser`, schema version 1, stores: `maps`, `civilizations`, `rulesPresets`, `gameSessions`.
- Repository interfaces + implementations under `src/persistence/`.
- `PersistenceError` typed errors; validate-before-save; deep-copy reads/writes.
- Idempotent seed: Standard rules preset (`rules-standard`) only.
- Verification: `npm run verify:persistence` (fake-indexeddb, isolated DB).

### F4 — Game Content Library (Done)

Implemented:
- `/library` entry to Maps and Civilizations (other categories planned-only).
- Maps catalog (`/library/maps`): list/search, create blank ocean map, duplicate, delete (confirm), v1 JSON import/export, Open → `/library/maps/:mapId/edit`.
- Civilizations catalog (`/library/civilizations`): list/search, create/edit, duplicate, delete (confirm).
- Catalog layer `src/catalog/` (factories, JSON conversion, hooks, lazy `getCatalogPersistence`); React pages do not call Dexie directly.
- Temporary readiness badges: Blank / Draft / Ready (heuristic only).
- Verification: `npm run verify:catalogs`.

### F5 — World Editor Migration (Done)

Implemented:
- Primary route `/library/maps/:mapId/edit` loads `MapTemplate` from `MapRepository` (loading / not-found / error states).
- Converts to legacy Zustand via dedicated adapters; Save / Save As write back through repositories.
- Dirty tracking for map-content edits; Save enabled when dirty; failed save keeps dirty.
- Unsaved-leave protection: `beforeunload` + in-app confirm via `useBlocker` (data router).
- Chrome shows map name, saved/unsaved badge, last saved time, Rename / Save / Save As.
- Scratch `/library/maps/current/edit` kept as non-catalog fallback.
- Legacy JSON import/export retained in the command bar (import marks dirty; export uses active dimensions).
- Verification: `npm run verify:editor-persistence`.

### F6 — World Editor Restructure (Done)

Implemented:
- Layout: top command bar + dominant map + right panel (~360px). No permanent left toolbar.
- Command bar: Back/Open, map name/status, Save, Save As, Description, New Map (`?create=1`), Import/Export JSON, View Mode → Display. Resize / Mini-map disabled (planned).
- Right panel: View/Edit switch; Tiles / Cities / Display / temporary Sim.
- Tiles: Terrain (paint + Terrain Only + Full Procedural/Earth), Features, Mountains/Hills, Rivers, Resources (density), Clear Tile; planned: Improvements, Roads, Borders, Labels.
- Cities: Create City tool, list/search, center, edit dialog, delete with confirm.
- Display: supported layers + presets (Normal, Terrain Only, Resources Only, Cities Only, Relief); UI-only — does not dirty.
- Temporary Sim section: CivilizationsPanel, PlayControlPanel, PlayersPanel, SettingsPanel (legacy until F8–F10).
- Verification: `npm run verify:world-editor-ui`.

Deferred / planned:
- Mini-map; Resize; Political display preset; improvements/roads/labels data models.

### F7 — Independent Map Layers (Done)

Implemented:
- Pure ops in `src/game/mapLayers/`: Terrain Only; Features generate/clear; Mountains clear/small/chain; Rivers clear/short/long; Resources clear/randomize with Sparse/Standard/Rich density.
- Store `applyLayerResult` marks dirty only on real changes; one tiles update per op.
- Policies: city tiles skipped by terrain/mountain placement; river edge mirroring; features skip resource-invalidating placements; resource density is a generation multiplier (not per-tile quantity).
- Full procedural + Earth-like remain distinct full-map actions in Terrain accordion.
- Verification: `npm run verify:map-layers`.

Deferred:
- Splitting Earth generation into independent layers; Web Workers; per-tile resource quantity.

### F8 — Rules Presets (Done)

Implemented:
- `/settings` repository-backed preset editor (Standard seeded, protected from delete).
- Declarative `RULES_PARAMETERS` / categories; City Development + Culture & Influence active.
- Create, Create Copy, rename, Save, Revert Unsaved, reset field/category/all, search, changed-only.
- `baseGrowthRate` percent UI ↔ decimal storage; domain limits aligned with definitions.
- Dirty leave protection (`beforeunload` + router blocker); preset switch confirm.
- Legacy Sim `SettingsPanel` unchanged except clarifying note — not synced to presets.
- Verification: `npm run verify:rules-presets`.

Deferred:
- Future category parameters; preset import/export.

### F9 — New Game Wizard (Done)

Implemented:
- `/games/new` four-step wizard: Map → Civilizations → Game Settings → Review & Start.
- Repository-backed sources (maps, civilizations, rules presets); search/select; loading/empty/error/retry.
- Exactly one Human civilization; unique capitals from map cities; zero-city maps blocked from progressing.
- Rules preset + starting year / years per turn / optional maximum turns; read-only preset summary.
- Pure `createGameSessionFromSetup` + `createAndSaveGameSession` (re-read sources, validate, save once, double-submit guard).
- Independent snapshots: tiles/cities/civ instances/rules; capitals owned only; sources unchanged.
- Dirty leave protection; navigate to `/games/:gameId` after create.
- Minimal Active Game page loads persisted session summary (not F10 gameplay).
- Verification: `npm run verify:new-game`.

Known limitations:
- Wizard draft is not persisted across refresh.
- Teams, AI difficulty, multiple Humans, Continue Game list deferred.
- Session is not loaded into Zustand; no turn simulation on GameSession yet (F10).

### F10–F12 — Not started

Next: **F10 Active Game Shell**. See `FOUNDATION_IMPLEMENTATION_PLAN.md`.

---

## 3. Gameplay Milestone Status (MVP)

### M1 — Подготовка скелета UI игрового движка (Active)

Scope: overall UI layout, panel arrangement, Edit/View mode toggle, the setup→playing phase transition.

Implemented:
- World Editor F6 layout: command bar, MapCanvas, right panel (Tiles/Cities/Display/Sim).
- Edit/View mode toggle (`viewMode`), switching what a hex click does.
- `gamePhase: 'setup' | 'playing'` and the transition via the "Играть" button in `PlayControlPanel` (under Sim).
- City-founding modal (`CityModal`) and tile-info popup (`TileInfoPanel`) as overlays.
- Top-level app routing / Main Menu (see F1 above).

Not yet done / open questions:
- No way to go back from `'playing'` to `'setup'` phase (no "stop game / edit map again" flow) — currently the owner can manually flip `viewMode` back to `'edit'` mid-game, but there's no explicit "return to setup" affordance.
- Narrow widths collapse the right panel behind a Show tools control (desktop-first; not a full mobile editor).

### M2 — Генерация и редактор карт, городов (Active)

Scope: hex grid, World Builder tools, procedural generation, Earth-like map mode, save/load. **Only the map itself** — civilizations/settings are M3.

Implemented:
- Flat-top hex grid, axial coordinates, camera pan/zoom, viewport culling (handles the full 250×135 / ~33,750-tile map).
- World Builder tools: terrain brush (with adjustable radius), resource brush, hills toggle, vegetation brush (forest/jungle/swamp/none), river tool (click near a hex edge to add/remove a river edge), city placement/removal via modal (name + starting population).
- Procedural random map generator: organic coastlines + extra islands, mountain ranges (with occasional width, and a connectivity-repair pass so ranges can't fully wall off part of a continent), "great desert" blobs capped per-landmass, rivers (major + minor, via 0-1 BFS from elevation down to the sea), lakes, latitude-based biome/vegetation, clustered single-roll resource placement.
  - **Known accepted limitation**: procedural generation is good for "give me a random world" but is not a recognizable Earth.
- Earth-like map mode (`generateEarthLikeMap` + `earthTemplate.ts`, toolbar **«Создать Землю»**): fraction-box continents (oversized Europe; Britain and Japan as separate island boxes), forced land bridges (Anatolia, Sinai), carved straits (Gibraltar, Bosphorus, Gulf of Aden/Red Sea), landmark mountains (Himalayas/Andes/Alps/Rockies — land-only), soft-edged Sahara override, named rivers (Nile/Amazon/Mississippi), named lakes (Baikal/Victoria), regional resource bias. Regenerable in-app; results vary by seed.
- Save/load JSON includes tiles, cities, civilizations, and settings (older saves without cities still load; cities default to `[]`). Catalog import/export is separate (F4) and does not replace toolbar Load/Export.

Not yet done:
- No script to auto-place cities on a generated/loaded map (mentioned as a "later" idea by the owner, not started).
- Earth-like mode is stylized and seed-dependent — not a fixed hand-authored polygon Earth with Antarctica/Madagascar/full Mediterranean carving as previously explored in offline authoring experiments.

### M3 — Глобальные настройки и цивилизации (Active)

Implemented:
- `CivilizationsPanel`: create a civilization (name, culture flavor name, flag emoji picker, auto-assigned color), list existing civilizations, assign/change a capital by clicking a city on the map, delete a civilization (releases its cities back to unclaimed).
- Civilization flag renders next to any owned city on the map.
- `SettingsPanel`: edit `baseGrowthRate`, `capitalCulturePerTurn`, `cultureAnnexThreshold`.
- Separate reusable civilization **templates** live in the F4 catalog (independent of the editor panel list).

Not yet done:
- Flags are emoji only — real icon/image support is an explicitly deferred future upgrade (noted in `PROJECT.md`).

### M4 — Механики роста и развития городов (Active)

Implemented:
- Global base growth rate (settings panel) + per-city growth bonus (editable via the Tile Info panel in Edit mode when the tile has a city).
- Growth formula applied once per turn (see `PRODUCT_RULES.md` §6).

Not yet done:
- No growth bonus derived from terrain, resources, or buildings — only the manually-set flat per-city bonus exists.
- No buildings/production system at all yet (reserved `productionQueue` field on `City` is unused).

### M5 — Игровая механика и UI, журнал событий (Active)

Implemented:
- `PlayControlPanel`: choose a starting year (supports BCE via negative numbers) and years-per-turn, "Играть" to start, "Следующий ход" (End Turn) to advance.
- `endTurn()`: grows every city, accumulates capital culture, and performs nearest-unclaimed-city annexation once a capital crosses the culture threshold (see `PRODUCT_RULES.md` §7).
- `PlayersPanel`: per-civilization city count and total population, plus a count of remaining unclaimed cities; only visible during Play phase.
- `TileInfoPanel` shows, for a clicked city: civilization + culture name, culture output and threshold (if capital), and the total growth rate breakdown (base + bonus).

Not yet done:
- **Event log is not implemented at all.** No data structure exists yet for turn-by-turn events (e.g. "Rome annexed Cairo"); `endTurn()` currently performs annexation with no record kept of what happened. This is the main open item for this milestone.
- No visual "turn transition" feedback beyond the panel's numbers updating (no toast/notification for annexation events, since there's no event log to source it from yet).

### M6 — Юниты и действия (не война) (Queued)

Not started. No unit data model beyond a placeholder `Unit[]` field on `GameState`.

### M7 — Боевая система (Queued)

Not started.

### M8 — AI и алгоритмы, дипломатия (Queued)

Not started. The only "AI" behavior that exists today is the deterministic nearest-city annexation rule, which is a growth mechanic, not decision-making AI.

---

## 4. Known Bugs / Limitations Worth Remembering

- Procedural map generation is accepted as imperfect (see M2 above) — don't assume it will produce a recognizable or always-connected world.
- Earth-like generation is regenerable but stylized and seed-dependent; forced bridges/straits improve Eurasia–Africa connectivity but do not guarantee Civ5-level geography.
- Focused verification scripts exist for domain/persistence/catalogs/editor/layers/rules/new-game (`verify:*`); there is still no large end-to-end UI test framework.
- There is no way to pause/return to Edit phase cleanly from Play phase (see M1 above).
- Continue Game list and full Active Game shell remain F10+; `/games/:gameId` is a persisted summary only.
- New Game wizard does not autosave drafts; refresh resets setup.
- World Editor catalog path is `/library/maps/:mapId/edit` with Save; scratch path `/library/maps/current/edit` has no catalog binding.

---

## 5. Nearest Next Steps

1. **F10 — Active Game Shell** (load GameSession, map + turn controls, session save strategy).
2. M5 event log remains open on the legacy gameplay side; Continue Game list after sessions are playable.

---

## 6. Maintenance Rule

Update this document when:

- a milestone's status changes (Active ↔ Queued ↔ effectively done);
- a major feature ships within an active milestone;
- a known bug is found or fixed;
- a "not yet done" item in this file gets implemented;
- any repository-changing agent iteration completes (see below).

**The main body of this file is a current-state snapshot**, aligned with the milestone table in `PROJECT.md`. It is not a commit-by-commit changelog.

Routine iteration history belongs only in **§7 Recent Change Log**. Durable decisions and major shifts belong in **§8 Significant Change History**. Do not dump chronological noise into §§1–5.

After every repository-changing agent iteration (mandatory; full procedure in `AI_AGENTS.md` §14):

1. Reconcile §§1–5 with the actual repository state — rewrite or remove obsolete claims.
2. Add a Recent Change Log entry (newest first).
3. Classify the iteration as Routine or Significant; if Significant, also add a §8 entry.
4. Update the `Last updated` date at the top of this file.
5. Drop Recent Change Log entries older than **3 calendar months**. Never delete Significant Change History entries for age.

---

## 7. Recent Change Log — Rolling 3 Months

Concise record of completed repository-changing iterations. Newest first. Retain only entries dated within the last **3 calendar months**. Significant items may appear here while recent; permanent record is §8.

### 2026-07-12 — F9 New Game Wizard

- Classification: Significant
- Summary: Replaced `/games/new` placeholder with a four-step repository-backed wizard that creates independent `GameSession` snapshots (map/civs/rules), saves via `GameSessionRepository`, and navigates to a minimal `/games/:gameId` summary. Exactly one Human; unique capitals; sources immutable; `npm run verify:new-game`.
- Files: `src/newGame/*`, `src/components/newGame/*`, `src/pages/{NewGame,ActiveGame}Page.tsx`, `src/design-system/components.css`, `package.json`, docs
- Validation: `npm run build` PASS; `git diff --check` PASS (LF warnings only); all verify:* including `verify:new-game` PASS; interactive browser New Game checklist NOT exhaustively run

### 2026-07-12 — F8 Rules Presets

- Classification: Significant
- Summary: Replaced `/settings` placeholder with repository-backed rules preset editor; declarative parameter definitions; Standard protected; draft/save/reset/search/dirty guards; legacy Sim settings remain independent; `npm run verify:rules-presets`.
- Files: `src/rules/*`, `src/pages/SettingsBalancePage.tsx`, `src/components/rules/ParameterField.tsx`, `src/components/SettingsPanel.tsx`, `src/domain/{rulesDefaults,validators,index}.ts`, `src/persistence/seed.ts`, `package.json`, docs
- Validation: `npm run build` PASS; `git diff --check` PASS; all verify:* including `verify:rules-presets` PASS; interactive browser Settings checklist NOT exhaustively run

### 2026-07-12 — F7 Independent Map Layers

- Classification: Significant
- Summary: Added pure `src/game/mapLayers/` operations for terrain-only, features, mountains/hills, rivers, and resources with density; wired into F6 Tiles panel with confirmations; dirty only on real changes; `npm run verify:map-layers`.
- Files: `src/game/mapLayers/*`, `src/game/store.ts`, `src/components/editor/TilesSection.tsx`, `package.json`, docs
- Validation: `npm run build` PASS; `git diff --check` PASS; all verify:* including `verify:map-layers` PASS; interactive catalog Save/refresh after layer ops NOT exhaustively run in browser

### 2026-07-12 — F6 World Editor Restructure

- Classification: Significant
- Summary: Redesigned World Editor to Civ V WorldBuilder-inspired layout (command bar + dominant map + right panel). Moved tools into Tiles/Cities/Display; temporary Sim for legacy play panels; display layers/presets without dirty; Clear Tile; Accordion/SegmentedControl; `npm run verify:world-editor-ui`. F5 persistence and v1 JSON preserved. Mini-map/Resize deferred.
- Files: `src/pages/WorldEditorPage.tsx`, `src/components/editor/*`, `src/components/MapCanvas.tsx`, `src/components/ui/{Accordion,SegmentedControl}*`, `src/editor/*`, `src/game/store.ts`, `src/design-system/components.css`, `src/pages/MapsCatalogPage.tsx`, `package.json`, docs
- Validation: `npm run build` PASS; `git diff --check` PASS; `verify:domain` / `verify:persistence` / `verify:catalogs` / `verify:editor-persistence` / `verify:world-editor-ui` PASS; manual browser smoke PASS for scratch `/library/maps/current/edit` shell (command bar, View/Edit, Tiles accordions, Save disabled); full selected-map Save/dirty/Play checklist not exhaustively run

### 2026-07-12 — F5 World Editor Migration

- Classification: Significant
- Summary: Selected-map route `/library/maps/:mapId/edit` with repository load/save, dirty tracking, leave guards, Save As; scratch `current` editor retained; `createBrowserRouter` for blockers; `npm run verify:editor-persistence`.
- Files: `src/App.tsx`, `src/pages/WorldEditorPage.tsx`, `src/pages/MapsCatalogPage.tsx`, `src/game/store.ts`, `src/catalog/editorPersistence*`, `src/catalog/hooks/useSelectedMapEditor.ts`, `src/catalog/editorBridge.ts`, `package.json`, docs
- Validation: `npm run build` PASS; `git diff --check` PASS; `verify:domain` / `verify:persistence` / `verify:catalogs` / `verify:editor-persistence` PASS; manual smoke PASS (Open → `:mapId/edit`, Saved chrome, not-found for missing id)

### 2026-07-12 — F4 Game Content Library

- Classification: Significant
- Summary: Repository-backed Maps and Civilizations catalogs with create/duplicate/delete/search; map v1 JSON import/export; temporary catalog→current-editor bridge (no write-back); Atlas Dialog/ConfirmDialog/FormField; `npm run verify:catalogs`.
- Files: `src/catalog/*`, `src/pages/{Maps,Civilizations,Library,WorldEditor}*`, `src/components/ui/{Dialog,ConfirmDialog,FormField}*`, `src/game/store.ts`, `src/design-system/components.css`, `package.json`, docs (`ARCHITECTURE`, `CURRENT_STATUS`, foundation plan, `PROJECT`, `PRODUCT_STRUCTURE`, UI screen map, design system)
- Validation: `npm run build` PASS; `git diff --check` PASS; `verify:domain` / `verify:persistence` / `verify:catalogs` PASS; manual browser catalog + editor regression PASS (preview `4178`); during verification fixed pre-existing intermittent boot crash in `mapGenerator` island `growBlob` (off-map land keys)

### 2026-07-12 — F3 Persistence Abstraction

- Classification: Significant
- Summary: Added Dexie IndexedDB repositories for MapTemplate, CivilizationTemplate, GameRulesPreset, and GameSession; schema v1; Standard rules seed; typed errors; no UI wiring. Shared domain validators extracted for save-path reuse.
- Files: `src/persistence/*`, `src/domain/validators.ts`, `src/domain/adapters.ts`, `src/domain/index.ts`, `package.json`, `ARCHITECTURE.md`, `CURRENT_STATUS.md`, `FOUNDATION_IMPLEMENTATION_PLAN.md`, `PROJECT.md`
- Validation: `npm run build` PASS; `git diff --check` PASS; `npm run verify:domain` PASS; `npm run verify:persistence` PASS; manual editor regression recorded in completing agent response

### 2026-07-12 — F2 Domain Model Separation

- Classification: Significant
- Summary: Added `src/domain/` template vs session TypeScript models and deep-copy adapters; legacy Zustand/`GameState` and v1 JSON I/O unchanged; no persistence or UI wiring.
- Files: `src/domain/*`, `ARCHITECTURE.md`, `CURRENT_STATUS.md`, `FOUNDATION_IMPLEMENTATION_PLAN.md`, `PROJECT.md`
- Validation: `npm run build` PASS; `git diff --check` PASS; `npx --yes tsx src/domain/verify.ts` PASS; manual editor regression recorded in completing agent response

### 2026-07-12 — D1 Design System Foundation

- Classification: Significant
- Summary: Extracted Atlas design tokens and docs from `Design System/`; added reusable UI primitives; restyled AppShell and all non-editor routes; preserved World Editor gameplay UI (F6 redesign deferred). No F2+ domain/persistence work.
- Files: `src/design-system/*`, `src/components/ui/*`, `src/components/AppShell.tsx`, `src/pages/*`, `src/main.tsx`, `src/styles/index.css`, `src/assets/design-system/README.md`, `docs/design/*`, `ARCHITECTURE.md`, `CURRENT_STATUS.md`, `PROJECT.md`, `FOUNDATION_IMPLEMENTATION_PLAN.md`
- Validation: `npm run build` PASS; `git diff --check` PASS; SPA routes + Not Found PASS in preview; World Editor open/canvas/paint/View tile info/civs/Play chrome PASS; pan/zoom wheel gestures not exhaustively exercised; keyboard focus reviewed via CSS focus tokens on shell buttons

### 2026-07-11 — F1 application shell and routing

- Classification: Significant
- Summary: Added React Router, Main Menu, library/settings/new-game/active-game placeholders, and mounted the existing World Builder MVP unchanged at `/library/maps/current/edit`. No gameplay/store/domain changes.
- Files: `src/App.tsx`, `src/pages/*`, `src/components/AppShell.tsx`, `src/styles/index.css`, `index.html`, `package.json`, `ARCHITECTURE.md`, `CURRENT_STATUS.md`, `PROJECT.md`, `FOUNDATION_IMPLEMENTATION_PLAN.md`
- Validation: `npm run build` PASS; `git diff --check` PASS; SPA route fallback smoke PASS; interactive browser editor checks NOT RUN (no browser automation available)

### 2026-07-10 — World builder, Earth-like maps, civilizations, turn simulation

- Classification: Significant
- Summary: Shipped the coherent MVP loop already present in the working tree: vegetation/river editor tools, city modal, Edit/View + tile info, Earth-like map generation (`earthTemplate` + `generateEarthLikeMap`), civilizations/capitals/settings panels, turn engine (growth/culture/annexation), players panel; save/load now persists cities and settings; removed temp diagnostics; reconciled docs to match the in-app Earth-like path (not a one-off JSON Earth).
- Files: `src/App.tsx`, `src/components/*` (Toolbar, MapCanvas, CityModal, TileInfoPanel, CivilizationsPanel, SettingsPanel, PlayControlPanel, PlayersPanel), `src/game/{types,store,mapGenerator,earthTemplate}.ts`, `CURRENT_STATUS.md`, `ARCHITECTURE.md`, `PROJECT.md`
- Validation: `npm run build` PASS; `git diff --check` PASS; Earth-like numeric smoke via tsx NOT RUN (no local tsx; build covers typecheck)

### 2026-07-10 — Mandatory end-of-iteration documentation process

- Classification: Significant
- Summary: Introduced required `CURRENT_STATUS.md` reconciliation after every repository-changing agent iteration; rolling 3-month recent log; permanent significant-change history; agent-owned Significant/Routine classification. Operating details in `AI_AGENTS.md` §14.
- Files: `AI_AGENTS.md`, `CURRENT_STATUS.md`
- Validation: NOT RUN (documentation-only)

### 2026-07-10 — Repository hygiene for generated/temp artifacts

- Classification: Routine
- Summary: Fixed corrupted UTF-16 `.gitignore` line; ignore `tsconfig.tsbuildinfo` and `*.zip`; stop tracking `tsconfig.tsbuildinfo`; removed local `src.zip` backup (no unique source vs working tree).
- Files: `.gitignore`, `tsconfig.tsbuildinfo` (removed from index)
- Validation: NOT RUN (hygiene-only)

---

## 8. Significant Change History — Permanent

Permanent record of durable changes and decisions. Chronological entries must **never** be removed because of age. Clarify or correct if later evidence shows inaccuracy. Prefer linking to the source-of-truth doc over duplicating low-level detail.

### 2026-07-12 — F9 New Game Wizard

- Area: Product / Architecture
- Change: New Game is a working four-step wizard that builds an independent `GameSession` from catalog map/civ/rules sources, assigns unique capitals (capitals-only ownership at start), snapshots rules, and persists through `GameSessionRepository`. `/games/:gameId` loads a summary only; F10 owns gameplay UI. F9 enforces exactly one Human civilization for single-player.
- Reason: Separates session creation from catalog editing and from the Active Game shell.
- Source of truth: `ARCHITECTURE.md` §3.8, `src/newGame/`, `FOUNDATION_IMPLEMENTATION_PLAN.md` §F9

### 2026-07-12 — F8 Rules Presets

- Area: Product / Architecture
- Change: Settings & Balance is a real preset catalog over `RulesPresetRepository`. Declarative parameter definitions drive the editor; Standard cannot be deleted; drafts save explicitly; presets do not mutate GameSession snapshots or legacy Sim settings.
- Reason: Establishes reusable balance configuration before F9 copies a preset into a new session snapshot.
- Source of truth: `ARCHITECTURE.md` §3.7, `src/rules/`, `FOUNDATION_IMPLEMENTATION_PLAN.md` §F8

### 2026-07-12 — F7 Independent Map Layers

- Area: Product / Architecture / Gameplay tools
- Change: World Editor can run terrain, feature, mountain/hill, river, and resource operations independently via pure `mapLayers` functions. Cities are never silently deleted; river edges stay mirrored; resource “quantity” is map-wide density only.
- Reason: Enables iterative map authoring without full regenerations, matching Civ V WorldBuilder layer workflow.
- Source of truth: `ARCHITECTURE.md` §3.6, `src/game/mapLayers/`, `FOUNDATION_IMPLEMENTATION_PLAN.md` §F7

### 2026-07-12 — F6 World Editor Restructure

- Area: Product / Architecture / UX
- Change: World Editor now uses a Civilization V WorldBuilder-inspired shell: compact top command bar, dominant map canvas, and a structured right panel (View/Edit, Tiles, Cities, Display, temporary Simulation). Display-layer state is UI-only. F5 catalog persistence and v1 JSON remain. Mini-map and Resize are deferred.
- Reason: Separates map-editing IA from legacy left-toolbar chrome before independent layer generation and Active Game UI work.
- Source of truth: `ARCHITECTURE.md` §3.5, `src/components/editor/`, `FOUNDATION_IMPLEMENTATION_PLAN.md` §F6

### 2026-07-12 — F5 World Editor Migration

- Area: Product / Architecture
- Change: Catalog maps open at `/library/maps/:mapId/edit` with load/save through `MapRepository`, dirty-state tracking, and unsaved-navigation protection. Scratch editor remains at `current/edit`. Legacy Zustand runtime and v1 JSON I/O are preserved.
- Reason: Completes the F4 temporary bridge so reusable maps are editable as selected catalog items.
- Source of truth: `ARCHITECTURE.md` §3.4, `src/catalog/editorPersistence.ts`, `FOUNDATION_IMPLEMENTATION_PLAN.md` §F5

### 2026-07-12 — F4 Game Content Library

- Area: Product / Architecture
- Change: Maps and Civilizations catalogs are live against IndexedDB repositories, with v1 JSON import/export for maps and a temporary one-way bridge into the current World Editor. Selected-map editor persistence remains F5.
- Reason: Makes reusable content browsable and durable in-browser without pretending the legacy editor already saves to a selected catalog id.
- Source of truth: `ARCHITECTURE.md` §3.3, `src/catalog/`, `FOUNDATION_IMPLEMENTATION_PLAN.md` §F4

### 2026-07-12 — F3 Persistence Abstraction

- Area: Architecture
- Change: Civ Browser now has an IndexedDB persistence layer (Dexie) behind repository interfaces for maps, civilizations, rules presets, and game sessions, with schema versioning and an idempotent Standard rules seed. UI and Zustand remain unwired; v1 JSON file exchange is unchanged.
- Reason: Establishes local storage required by catalogs / New Game / Continue Game without coupling product screens to IndexedDB yet.
- Source of truth: `ARCHITECTURE.md` §3.2, `src/persistence/`, `FOUNDATION_IMPLEMENTATION_PLAN.md` §F3

### 2026-07-12 — F2 Domain Model Separation

- Area: Architecture
- Change: Introduced compile-time domain types separating reusable templates (`MapTemplate`, `CivilizationTemplate`, `GameRulesPreset`) from session state (`GameSession`, `GameCity`, `CivilizationInstance`, rules snapshots), plus adapters with deep-copy guarantees. Runtime remains on legacy `src/game` types until later milestones.
- Reason: Establishes the type boundary required by `PRODUCT_STRUCTURE.md` before F3 persistence and F4+ catalogs without rewriting the working MVP store.
- Source of truth: `ARCHITECTURE.md` §3.1, `src/domain/`, `FOUNDATION_IMPLEMENTATION_PLAN.md` §F2

### 2026-07-12 — D1 Design System Foundation

- Area: Architecture / Product UX
- Change: Civ Browser now has a durable Atlas-derived design layer (tokens, docs, shell primitives) applied to the F1 application shell and non-editor screens. Generated Claude materials under `Design System/` remain reference-only; production code lives in `src/design-system/` and `src/components/ui/`. World Editor visual redesign remains F6.
- Reason: Establishes a single visual language for product screens before F2+ work without rewriting the working editor.
- Source of truth: `docs/design/DESIGN_SYSTEM.md`, `docs/design/UI_SCREEN_MAP.md`, `ARCHITECTURE.md` §2.1

### 2026-07-11 — F1 application shell and routing

- Area: Architecture / Product
- Change: Civ Browser is now a routed multi-screen app. Entry is Main Menu; the legacy World Builder MVP is preserved under `/library/maps/current/edit`. Placeholder screens exist for library catalogs, settings, new game, and active game. No domain templates or persistence yet.
- Reason: Establishes navigation boundaries required by `PRODUCT_STRUCTURE.md` before F2+ domain/persistence work.
- Source of truth: `ARCHITECTURE.md` (routing), `FOUNDATION_IMPLEMENTATION_PLAN.md` §F1, `PRODUCT_STRUCTURE.md`

### 2026-07-10 — MVP world builder + turn simulation loop

- Area: Product / Architecture / Gameplay
- Change: Civ Browser now has an end-to-end setup→play loop: map editor tools (including vegetation and rivers), regenerable Earth-like map mode, civilization/capital management, global growth/culture settings, and `endTurn` growth/culture/annexation. JSON save/load includes cities and settings. Persistence format and UI panel set documented in `ARCHITECTURE.md`.
- Reason: This is the first playable MVP core; future milestones (event log, units, combat, AI) build on this data model and UI shell.
- Source of truth: `ARCHITECTURE.md`, `PRODUCT_RULES.md`, `CURRENT_STATUS.md` §§1–5, `PROJECT.md`

### 2026-07-10 — Mandatory documentation lifecycle for AI agents

- Area: Process
- Change: Civ Browser now requires (1) reconciling `CURRENT_STATUS.md` after every repository-changing agent iteration, (2) a rolling 3-calendar-month Recent Change Log, (3) a permanent Significant Change History, and (4) agent-owned classification of Significant vs Routine changes. Documentation maintenance is part of the definition of done.
- Reason: Keeps the status snapshot trustworthy across parallel projects and multi-agent sessions; prevents important decisions from living only in chat history; separates ephemeral iteration noise from durable project memory.
- Source of truth: `AI_AGENTS.md` §14, this file §§6–8
