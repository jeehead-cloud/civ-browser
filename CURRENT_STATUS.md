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

**F1 (Application Shell and Routing) is implemented.** **D1 (Design System Foundation) is implemented** as a supporting task between F1 and F2: Atlas tokens, shell/UI primitives, and restyled non-editor screens. The World Editor gameplay UI is deliberately preserved for F6.

Domain templates, IndexedDB, catalogs, and New Game wizard are not started (F2+). There is no human-controlled civilization and no units/combat/AI yet — those remain later gameplay milestones (M6–M8), after the foundation batch.

---

## 2. Foundation Milestone Status

### F1 — Application Shell and Routing (Done)

Implemented:
- React Router (`react-router-dom`) with Main Menu, Library, Maps/Civilizations placeholders, Settings & Balance placeholder, New Game placeholder, Active Game placeholder (`/games/:gameId` shows route id only), and not-found.
- Existing editor UI mounted at `/library/maps/current/edit` (temporary path until map catalog / F5).
- `AppShell` for non-editor screens; editor uses full viewport with a slim Main Menu link strip.

### D1 — Design System Foundation (Done — supporting task)

Implemented:
- Stable docs: `docs/design/DESIGN_SYSTEM.md`, `docs/design/UI_SCREEN_MAP.md`.
- Tokens: `src/design-system/tokens.css`; primitive styles: `src/design-system/components.css`.
- UI primitives under `src/components/ui/`: Button, IconButton, Card/CardLink, Panel, Badge, Input, Tabs, PageHeader, SectionHeader, EmptyState.
- AppShell and all non-editor routes restyled to Atlas (dark graphite + gold); placeholders clearly marked.
- World Editor tools/panels/canvas/gameplay unchanged; only slim chrome + local light isolation for editor chrome.

Not done in D1 (deferred):
- Full World Editor redesign → **F6**.
- Real catalog/settings/new-game/active-game behavior → F4–F10.
- Lucide icon pack / logo assets (no production assets copied yet; `src/assets/design-system/` reserved).

### F2–F12 — Not started

Next: **F2 Domain Model Separation** (templates vs sessions). See `FOUNDATION_IMPLEMENTATION_PLAN.md`.

---

## 3. Gameplay Milestone Status (MVP)

### M1 — Подготовка скелета UI игрового движка (Active)

Scope: overall UI layout, panel arrangement, Edit/View mode toggle, the setup→playing phase transition.

Implemented:
- World Editor layout (on `/library/maps/current/edit`): Toolbar (left), MapCanvas (center), right-hand sidebar column (CivilizationsPanel → PlayControlPanel → PlayersPanel → SettingsPanel).
- Edit/View mode toggle (`viewMode`), switching what a hex click does.
- `gamePhase: 'setup' | 'playing'` and the transition via the "Играть" button in `PlayControlPanel`.
- City-founding modal (`CityModal`) and tile-info popup (`TileInfoPanel`) as overlays.
- Top-level app routing / Main Menu (see F1 above).

Not yet done / open questions:
- No way to go back from `'playing'` to `'setup'` phase (no "stop game / edit map again" flow) — currently the owner can manually flip `viewMode` back to `'edit'` mid-game, but there's no explicit "return to setup" affordance.
- Overall panel layout has not been revisited for scaling to a much wider/narrower browser window beyond the responsive canvas work already done.

### M2 — Генерация и редактор карт, городов (Active)

Scope: hex grid, World Builder tools, procedural generation, Earth-like map mode, save/load. **Only the map itself** — civilizations/settings are M3.

Implemented:
- Flat-top hex grid, axial coordinates, camera pan/zoom, viewport culling (handles the full 250×135 / ~33,750-tile map).
- World Builder tools: terrain brush (with adjustable radius), resource brush, hills toggle, vegetation brush (forest/jungle/swamp/none), river tool (click near a hex edge to add/remove a river edge), city placement/removal via modal (name + starting population).
- Procedural random map generator: organic coastlines + extra islands, mountain ranges (with occasional width, and a connectivity-repair pass so ranges can't fully wall off part of a continent), "great desert" blobs capped per-landmass, rivers (major + minor, via 0-1 BFS from elevation down to the sea), lakes, latitude-based biome/vegetation, clustered single-roll resource placement.
  - **Known accepted limitation**: procedural generation is good for "give me a random world" but is not a recognizable Earth.
- Earth-like map mode (`generateEarthLikeMap` + `earthTemplate.ts`, toolbar **«Создать Землю»**): fraction-box continents (oversized Europe; Britain and Japan as separate island boxes), forced land bridges (Anatolia, Sinai), carved straits (Gibraltar, Bosphorus, Gulf of Aden/Red Sea), landmark mountains (Himalayas/Andes/Alps/Rockies — land-only), soft-edged Sahara override, named rivers (Nile/Amazon/Mississippi), named lakes (Baikal/Victoria), regional resource bias. Regenerable in-app; results vary by seed.
- Save/load JSON includes tiles, cities, civilizations, and settings (older saves without cities still load; cities default to `[]`).

Not yet done:
- No script to auto-place cities on a generated/loaded map (mentioned as a "later" idea by the owner, not started).
- Earth-like mode is stylized and seed-dependent — not a fixed hand-authored polygon Earth with Antarctica/Madagascar/full Mediterranean carving as previously explored in offline authoring experiments.

### M3 — Глобальные настройки и цивилизации (Active)

Implemented:
- `CivilizationsPanel`: create a civilization (name, culture flavor name, flag emoji picker, auto-assigned color), list existing civilizations, assign/change a capital by clicking a city on the map, delete a civilization (releases its cities back to unclaimed).
- Civilization flag renders next to any owned city on the map.
- `SettingsPanel`: edit `baseGrowthRate`, `capitalCulturePerTurn`, `cultureAnnexThreshold`.

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
- No automated test suite exists. Verification has so far relied on manual browser checks plus, for generation/algorithm work, throwaway Node scripts that check connectivity or other numeric invariants (see `ARCHITECTURE.md` §7 for the specific historical bugs this caught).
- There is no way to pause/return to Edit phase cleanly from Play phase (see M1 above).
- Continue Game / New Game / Active Game / catalog screens are placeholders until F3–F10.
- World Editor path `/library/maps/current/edit` is temporary until maps are real catalog items (F4/F5).

---

## 5. Nearest Next Steps

1. **F2 — Domain Model Separation** (MapTemplate, CivilizationTemplate, GameSession, rules preset types; keep MVP working).
2. **F3 — Persistence Abstraction** (IndexedDB repositories).
3. Then F4 Content Library / F5 editor migration; World Editor visual redesign remains **F6**; M5 event log remains open on the gameplay side but foundation structure is the priority.

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
- Validation: `npm run build` PASS; Earth-like numeric smoke via tsx NOT RUN (no local tsx; build covers typecheck)

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
