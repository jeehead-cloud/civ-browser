# Civ Browser — Project Overview

**Status:** Active development (hobby project)
**Last updated:** 2026-07-12
**Repository:** `https://github.com/jeehead-cloud/civ-browser`
**Local repository path:** `C:\Projects\civ-browser`
**Main branch:** `main`

> This is the primary entry point for understanding the Civ Browser project.
> It explains what the product is, who it is for, how its main areas fit together, and where it is going.
>
> For implementation details, use the specialized documents listed in the final section.

---

## 1. Vision

**Civ Browser is a browser-based, single-player, turn-based 4X strategy game inspired by Civilization 5 — built as a personal hobby project, with a hand-authored/procedural World Builder, a simplified game engine, and algorithmic AI opponents.**

The owner is both the sole developer and the sole player. There is no multiplayer, no accounts, and no backend server at this stage — everything runs client-side in the browser. The project is deliberately scoped as an MVP first: a small, working core loop (map → civilizations → cities → turns → growth/culture) that can be extended incrementally (units, combat, diplomacy, AI) rather than an attempt to clone Civ5 feature-for-feature from day one.

---

## 2. What This Project Is

- A **World Builder**: a hex-grid map editor (paint terrain, resources, hills, rivers, vegetation, place cities) that also supports procedural random-map generation and a hand-authored, Earth-inspired map.
- A **simplified game engine**: civilizations with capitals, culture accumulation, city growth, and turn-based simulation of both.
- A **single-player sandbox**: the owner plays against algorithmically-controlled opponents (no human multiplayer, no matchmaking, no server-authoritative state).

## 3. What This Project Is Not (For Now)

- Not multiplayer, not networked, not server-authoritative.
- Not a pixel-perfect Civ5 clone — mechanics are intentionally simplified and will grow in complexity over time (eras, tech gating, and diplomacy are explicitly deferred).
- Not aiming for photorealistic geography — the "Earth-like" map mode is a stylized, regenerable approximation (fraction boxes + landmark overrides), not a scientifically accurate projection.

---

## 4. Core Product Loop

**Build the world → Define civilizations → Assign capitals → Play turns → Watch cities grow, culture accumulate, and unclaimed cities get annexed.**

1. **World Builder phase** (`gamePhase: 'setup'`): the owner creates or generates a map, paints terrain/resources/rivers/vegetation by hand, places cities, defines civilizations (name, culture name, flag emoji), and assigns each civilization's starting capital city.
2. **Play phase** (`gamePhase: 'playing'`): the owner picks a starting year and a years-per-turn step, then presses "Играть" (Play). Editing locks (the app switches to View mode); each "End Turn" grows every city's population, accumulates capital culture, and — once a capital's culture crosses a threshold — annexes the nearest unclaimed neighboring city into that civilization.
3. There is currently no human-controlled civilization inside the simulation — the owner is an observer/director during Play phase, watching the simulation unfold. Player-controlled actions (units, production, diplomacy) are future milestones.

---

## 5. Main Product Areas

### 5.1. World Builder & Map (Milestone M2)

- Flat-top hex grid, axial coordinates, camera pan/zoom, viewport culling for large maps (~33,750 tiles at 250×135).
- Manual painting tools: terrain, resources, hills (property, not a terrain type), rivers (edge-based, not tile-based), vegetation (forest/jungle/swamp).
- Two ways to get a base map:
  - **Procedural generation**: organic coastlines, mountain ranges, deserts, rivers, lakes, latitude-based biomes, clustered resource placement. Known to have accepted rough edges (see `CURRENT_STATUS.md` and `ARCHITECTURE.md` for the specific lessons learned).
  - **Earth-like generation** («Создать Землю»): fraction-box continents with oversized Europe, forced bridges/straits, landmark mountains/rivers/lakes/deserts, and regional resource bias — regenerable in-app, stylized rather than geographically accurate.
- Save/load a map as a JSON file.

### 5.2. Civilizations & Global Settings (Milestone M3)

- Civilizations have a name, a "culture" flavor name (e.g. "Египтяне"), a color, and a flag (currently an emoji; real icons/images are a future upgrade).
- Each civilization is assigned exactly one capital city, chosen from cities placed on the map.
- Global settings: base city growth rate per turn, capital culture output per turn, culture threshold required to annex a neighboring unclaimed city.

### 5.3. City Growth & Development (Milestone M4)

- Every city grows population each turn according to the global base growth rate plus an optional per-city growth bonus.
- Growth from terrain, resources, and buildings is explicitly deferred to a later milestone — for now, growth is a flat percentage.

### 5.4. Turn Engine & UI, Event Log (Milestone M5)

- Starting year and years-per-turn are chosen once, at the start of Play phase.
- "End Turn" runs the simulation: population growth, capital culture accumulation, and annexation of the nearest unclaimed city once a capital's culture crosses the configured threshold.
- A Players panel shows, per civilization, city count and total population.
- An Edit/View mode toggle changes what a click on a hex does: paint (Edit) vs. open an info popup (View).
- **Event log** (e.g. "Рим напал на Египет" / "Rome annexed Cairo") is part of this milestone and is **not yet implemented** — see `CURRENT_STATUS.md`.

### 5.5. Units & Actions, not war (Milestone M6 — not started)

Units, movement, worker/settler actions, production queues. No combat yet.

### 5.6. Combat System (Milestone M7 — not started)

Attack/defense resolution, unit combat.

### 5.7. AI & Algorithms, Diplomacy (Milestone M8 — not started)

Algorithmic decision-making for AI-controlled civilizations; optional future LLM-assisted decisions for complex situations (e.g. war/peace); basic diplomacy.

---

## 6. Roadmap

### 6.1. Foundation milestones (current priority)

See `FOUNDATION_IMPLEMENTATION_PLAN.md` and `PRODUCT_STRUCTURE.md`.

| ID | Milestone | Status |
|---|---|---|
| F1 | Application Shell and Routing | Done |
| D1 | Design System Foundation (supporting) | Done |
| F2 | Domain Model Separation | Done |
| F3 | Persistence Abstraction | Done |
| F4 | Content Library (Maps / Civilizations catalogs) | Done |
| F5 | World Editor Migration (selected-map load/save) | Done |
| F6 | World Editor Restructure (command bar + right panel) | Done |
| F7 | Independent Map Layers | Done |
| F8 | Rules Presets (Settings & Balance) | Done |
| F9 | New Game Wizard | Done |
| F10 | Active Game Shell | Done |
| F11–F12 | Context popups, debug editing | Queued |

### 6.2. Gameplay milestones (MVP / later)

| # | Milestone | Scope | Status |
|---|---|---|---|
| M1 | Подготовка скелета UI игрового движка | Overall UI layout, panel arrangement, Edit/View mode toggle, the setup→playing phase transition | Active |
| M2 | Генерация и редактор карт, городов | Hex grid, World Builder tools, procedural generation, Earth-like map, save/load | Active |
| M3 | Глобальные настройки и цивилизации | Civilizations panel (name/culture/flag), capital assignment, global settings panel | Active |
| M4 | Механики роста и развития городов | Base growth rate + per-city growth bonus, culture accumulation config | Active |
| M5 | Игровая механика и UI, журнал событий | Year/turn-step setup, Play button, turn simulation (growth/culture/annexation), players panel, event log | Active |
| M6 | Юниты и действия (не война) | Units, movement, worker/settler actions | Queued |
| M7 | Боевая система | Combat resolution | Queued |
| M8 | AI и алгоритмы, дипломатия | AI decision-making, diplomacy | Queued |

"Active" means the owner is actively working on it right now, not necessarily that it's finished — see `CURRENT_STATUS.md` for the granular done/not-done breakdown. Foundation work (F*) is the near-term restructuring priority while preserving the MVP.

---

## 7. Strategic Product Filters

Since this is a solo hobby project with no external users, the guiding question for any new feature is simpler than in a commercial product:

1. Does it make the owner's own game more fun to build or play next?
2. Does it keep the codebase simple enough for one person (plus AI coding agents) to maintain?
3. Does it avoid over-engineering for hypothetical future needs (multiplayer, accounts, tech trees) before the current milestone actually requires them?

Era/tech gating, diplomacy, and multiplayer are deliberately deferred — they are referenced in the data model (e.g. resource `category` field) but not yet wired into any gameplay rule.

---

## 8. High-Level Infrastructure

### Repository

- GitHub: `https://github.com/jeehead-cloud/civ-browser`
- Main branch: `main`
- Local path: `C:\Projects\civ-browser`

### Stack (see `ARCHITECTURE.md` for full detail)

- TypeScript
- Vite
- React (UI panels / pages)
- React Router (application navigation)
- HTML5 Canvas 2D (hex map rendering — chosen over PixiJS/Phaser for simplicity, since there's no physics or heavy sprite animation)
- Zustand (state management)
- Dexie / IndexedDB (`src/persistence/`) for domain catalogs and sessions — not UI-wired yet (F3)
- Manual v1 JSON export/import remains the editor file exchange path
- No backend / accounts — fully client-side

### Hosting / Deployment

**Not yet decided (TBD).** No production deployment exists yet — the project currently only runs via `npm run dev` on the owner's machine. Since the game is fully client-side with no backend, any static hosting provider (Vercel, Netlify, GitHub Pages, Cloudflare Pages, etc.) would work when the owner is ready — see `DEPLOYMENT.md` for the current (empty) state and what will need to be decided.

---

## 9. Development Philosophy

### Solo hobby project, AI-agent-assisted

The owner works with Cursor (and potentially other AI coding agents) to implement changes, usually via a single, self-contained prompt per task. See `AI_AGENTS.md` for mandatory agent operating rules — in particular, **always confirm which project/repository you are working in**, since the owner runs several unrelated projects in parallel.

### Prefer simple, debuggable code over cleverness

Several past bugs in this project came from subtle algorithmic mistakes (an incorrect 0-1 BFS deque implementation, a hex-edge/neighbor-direction mismatch, coordinate system confusion between pointy-top and flat-top hexes). When something is genuinely tricky (hex geometry, graph search, procedural generation), prefer verifying with a small script or a numeric sanity check over trusting a visual read alone.

### Procedural generation is a tool, not a religion

When procedural generation repeatedly failed to produce a recognizable, connected "Earth" map, the project switched to direct hand-authoring (polygon-based continent shapes, verified programmatically for connectivity) instead of continuing to patch the algorithm. Prefer whichever approach actually produces a good result with reasonable effort — don't over-invest in generality the current milestone doesn't need.

### One task per prompt

Cursor prompts in this project are scoped to one logical change at a time (e.g. "add a river-painting tool", not "add rivers and also refactor the store"). This keeps changes reviewable and easy to roll back.

---

## 10. Documentation System

- **`PROJECT.md`** — this file. Vision, product areas, roadmap.
- **`AI_AGENTS.md`** — mandatory operating instructions for Cursor and other AI coding agents, including the repository-context requirement.
- **`PRODUCT_STRUCTURE.md`** — target product areas, screens, flows, and UI behavior after the proof-of-concept stage.
- **`FOUNDATION_IMPLEMENTATION_PLAN.md`** — foundation milestones (F1–F12), acceptance criteria, and implementation sequence.
- **`ARCHITECTURE.md`** — tech stack, file structure, data model, hex grid math, key algorithmic lessons learned.
- **`docs/design/DESIGN_SYSTEM.md`** — Atlas design rules translated for production (tokens, components, states).
- **`docs/design/UI_SCREEN_MAP.md`** — route ↔ mockup map and D1 vs later milestone ownership.
- **`DEPLOYMENT.md`** — current (currently empty/local-only) deployment state and what will need deciding before shipping anywhere.
- **`PRODUCT_RULES.md`** — game design invariants: terrain/resource/growth/culture/annexation rules that must stay consistent.
- **`CURRENT_STATUS.md`** — frequently updated snapshot: what's implemented per milestone, known bugs/limitations, next steps.

## 11. Recommended Reading Order

1. `PROJECT.md`
2. `AI_AGENTS.md`
3. `CURRENT_STATUS.md`
4. `PRODUCT_STRUCTURE.md`
5. `FOUNDATION_IMPLEMENTATION_PLAN.md`
6. `PRODUCT_RULES.md`
7. `ARCHITECTURE.md`
8. `docs/design/DESIGN_SYSTEM.md` / `docs/design/UI_SCREEN_MAP.md` (when doing UI work)
9. `DEPLOYMENT.md`

## 12. Source-of-Truth Hierarchy

When information conflicts, use this order:

1. current repository code and actual in-browser behavior;
2. `PRODUCT_RULES.md`;
3. `PRODUCT_STRUCTURE.md` (target product behavior) / `FOUNDATION_IMPLEMENTATION_PLAN.md` (foundation sequence);
4. `ARCHITECTURE.md`;
5. `CURRENT_STATUS.md`;
6. `PROJECT.md`;
7. old chat history / memory.

## 13. Maintenance Policy

Update this file when the vision, milestone list, or high-level stack changes. Day-to-day progress belongs in `CURRENT_STATUS.md`, not here.

---

## Guiding Rule

**Keep the core loop (build world → define civs → play turns) simple and working end-to-end before adding width (units, combat, diplomacy). A small working game beats a large half-built one.**
