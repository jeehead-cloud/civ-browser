# Civ Browser — Product Rules

**Status:** Active
**Last updated:** 2026-07-10
**Repository:** `https://github.com/jeehead-cloud/civ-browser`

> This document defines game-design invariants: rules that must remain true across the World Builder, the map generators, and the turn engine.
> These are not implementation suggestions — they are behavioral constraints that future features must respect unless the owner explicitly changes them.

---

## 1. General Rule

When game behavior is ambiguous or under-specified:

1. keep the current milestone's mechanics as simple as possible;
2. prefer deterministic, explainable rules over hidden randomness;
3. don't silently add complexity (eras, tech gating, diplomacy) that hasn't been explicitly requested yet;
4. keep terrain/vegetation/hills/river/resource combinations logically consistent (no wheat growing under forest canopy, no gems on bare desert with no jungle, etc.).

---

## 2. Map & Terrain Rules

### 2.1. Terrain Types

`TerrainType`: `ocean`, `coast`, `lake`, `plains`, `grassland`, `mountains`, `desert`, `tundra`, `snow`.

`hills` is **not** a terrain type — it's a boolean property (`hasHills`) that can coexist with any land terrain except `mountains` (mountains and hills are mutually exclusive; a mountain tile is never also "hilly").

### 2.2. Vegetation Types

`VegetationType`: `none`, `forest`, `jungle`, `swamp`. A tile has at most one vegetation value at a time.

- `jungle` should lean toward tropical latitudes; `forest` toward temperate and tundra latitudes; the belt around deserts should stay mostly `none` (steppe).
- `swamp` should appear near river mouths close to the coast, on otherwise-fertile terrain (grassland/plains), not in the middle of a desert.

### 2.3. Rivers

Rivers are **edges**, not tiles or a terrain type. A tile's `riverDirections: number[]` lists which of its 6 neighbor-facing edges carry a river. Two adjacent tiles sharing a river edge must both record it (mirrored direction index) for rendering to look continuous.

### 2.4. Coastline

`coast` tiles form a ring (currently 2-3 hexes wide) around actual land, computed via BFS from land outward. Any small ocean pocket that is fully enclosed by land (not reachable from the map's open water) should become a `lake`, not be miscolored as isolated coast.

### 2.5. Map Size

The default map is 250×135 hexes (~33,750 tiles). This is deliberately much larger than Civilization 5's largest official map (Huge, 104×64 ≈ 6,656 tiles) but stops well short of a "full globe" scale, to keep unit movement, pathfinding, and AI turn computation tractable on a single browser tab. Changing `MAP_WIDTH`/`MAP_HEIGHT` in `store.ts` is fine, but performance should be re-checked at any significantly larger size.

---

## 3. Resource Rules

- Resources are split into three categories: **bonus** (visible without any tech, simple growth resources), **luxury** (needs an improvement, gives happiness/gold), and **strategic** (era-relevant, enables units/buildings). The `category` field exists on every `ResourceRule` but **era/tech gating is not implemented yet** — all resources can currently appear on any map regardless of "era."
- Each resource rule specifies which terrain(s), vegetation, hills state, and river-adjacency it requires — these conditions are load-bearing and should not be bypassed (e.g. don't let wheat spawn on a forested tile just because the terrain matches).
- Resource placement must stay **sparse**: roll once per tile whether it gets a resource at all (base chance differs for land vs. water — water tiles have very few competing resource options, so their base chance must be set lower, or a single resource like "whales" will blanket the ocean), then weighted-pick among the resources that match that tile.
- Regional bias (e.g. more oil in a "Middle East"-shaped box on the hand-authored Earth map) is a multiplier on top of the normal weight, not a separate independent roll.
- Resources currently occupy a single tile each (no multi-tile "deposits" and no in-tile quantity indicator yet) — if/when a "resource richness/quantity" mechanic is added, it should replace the current one-resource-per-tile assumption deliberately, not accidentally.
- **F7 editor density** (Sparse / Standard / Rich) is a map-wide generation chance multiplier used when randomizing the resource layer. It is not stored per tile and does not change the one-resource-per-tile model.
- Independent World Editor layer operations (terrain / features / mountains-hills / rivers / resources) must preserve unrelated layers except for documented compatibility cleanups (e.g. clearing land resources when a tile becomes water). Cities must never be silently deleted by layer ops.

---

## 3a. Growth rate representation

- `baseGrowthRate` is stored as a decimal fraction (example: `0.01` means +1% population per turn).
- Settings & Balance and the legacy Sim settings panel display/edit this value as a percentage (example: `1`).
- Do not treat a UI value of `1` as a 100% growth rate.

---

## 4. City Rules

- A city is founded via the City modal, which requires a **name** and a **starting population** (minimum 1).
- A newly founded city starts with `civId: null` (unclaimed/free), `isCapital: false`, `culture: 0`, `growthRateBonus: 0`.
- A city can be removed by clicking an existing city while in the City tool (Edit mode).
- Exactly one city per civilization may be `isCapital: true` — assigning a new capital to a civilization demotes any previous capital city for that civilization.

---

## 5. Civilization Rules

- A civilization has: `name`, `color`, `playerType` (`human` | `ai`), `cultureName` (flavor text), `flagEmoji`, and `capitalCityId`.
- New Game (F9) creates session civilizations as snapshots from catalog templates. F9 enforces **exactly one Human** civilization (single-player); others are AI. Teams and multi-human setups are deferred.
- At game creation, only assigned **capital** cities become owned (`civId` set, `isCapital: true`). Other map cities remain unclaimed. One city cannot be the capital of multiple civilizations.
- A civilization's flag is rendered next to any city it owns (not just the capital) on the map, once a capital has been assigned.
- Deleting a civilization in the legacy editor releases all of its cities back to `civId: null` (unclaimed) and clears their `isCapital` flag — it does not delete the cities themselves.
- Legacy World Editor Sim still creates civilizations as `ai` until Active Game (F10) loads Human control from a GameSession.

---

## 6. Growth Rules

- Every city's population grows once per "End Turn," using:

  ```text
  rate = settings.baseGrowthRate + city.growthRateBonus
  newPopulation = max(population + 1, round(population * (1 + rate)))
  ```

  (the `max(population + 1, ...)` guarantees at least +1 population per turn even for very small cities or very low rates, so a city never visibly stalls.)

- `baseGrowthRate` is a single global setting (e.g. `0.01` = +1%/turn) that applies to every city.
- `growthRateBonus` is per-city and additive to the base rate. It currently must be set manually by the owner (via the Tile Info panel in Edit mode) — growth bonuses from terrain, resources, or buildings near a city are an explicitly deferred future mechanic (Milestone M4 follow-up), not yet implemented.

---

## 7. Culture & Annexation Rules

- Only **capital** cities (`isCapital: true`) generate culture, at a flat rate of `settings.capitalCulturePerTurn` per turn, added to that city's `culture` field.
- When a capital's accumulated `culture >= settings.cultureAnnexThreshold`:
  - it annexes the **single nearest** unclaimed city (`civId === null`) anywhere on the map (nearest by hex distance — there is currently no "must be adjacent" or "must be within some radius" restriction, and no check for whether another civilization's territory is in between);
  - the annexed city's `civId` is set to the capital's civilization;
  - the capital's `culture` is reduced by exactly `settings.cultureAnnexThreshold` (not reset to zero — any culture accumulated beyond the threshold carries over).
- If there is no unclaimed city anywhere on the map, culture simply keeps accumulating with no effect until one becomes available (e.g. if the owner adds more free cities to the map later).
- **Explicitly deferred for later milestones**: culture cost scaling across eras, competition/contested annexation between civilizations, any diplomatic or military resistance to annexation. The current annexation rule is intentionally the simplest version that works.

---

## 8. Turn / Time Rules

- The owner chooses a **starting year** (can be negative, meaning BCE) and a **years-per-turn** step when creating a game (New Game wizard) or when starting Play in the legacy World Editor Sim.
- Each "End Turn" / **Next Turn** advances `currentYear` by `yearsPerTurn` and `turn` by 1, and runs growth → culture accumulation → annexation, in that order.
- Active Game (F10) runs this sequence on a `GameSession` copy via `applyTurn`, then autosaves. Optional structured `GameSession.events` record growth summary, culture generated, annexations, and turn completion.
- Legacy World Editor Sim still uses Zustand `endTurn()` with the same formulas.
- In the legacy Sim, starting the game switches `viewMode` to `'view'` and `gamePhase` to `'playing'`. Active Game has no edit tools.

---

## 9. Edit Mode vs. View Mode

- **Edit mode**: clicking a hex paints according to the active World Builder tool (terrain, resource, hills, vegetation, river, or city). This is the only mode where the World Builder toolbar controls are shown.
- **View mode**: clicking a hex opens an info popup (`TileInfoPanel`) showing terrain/vegetation/hills/resource/river state, and — if the tile has a city — the city's name, population, owning civilization, culture output (if capital), and total growth rate. No painting happens in View mode.
- Active Game (F10) is always view-only on the session map: clicks select tiles/cities for a compact strip, never paint.
- Starting a legacy Sim game (pressing "Играть") force-switches to View mode. The owner can still manually flip back to Edit mode from the toolbar even during Play phase — this is intentional for the Sim only.

---

## 10. Event Log

Active Game (F10) persists optional structured `GameSession.events` with types such as `growth_summary`, `culture_generated`, `annexation`, and `turn_completed` (id, turn, year, message, data, related ids).

- Prefer structured records over pre-formatted-only strings so the log can be filtered/localized later.
- The legacy World Editor Sim `endTurn()` still does not write `GameSession.events`.
- Richer narrative / localization remains open for M5/F11 polish.

---

## 11. Explicitly Deferred Mechanics

The following are intentionally **not** implemented yet, and no feature should assume they exist:

- Eras / tech tree / tech-gated resource or unit availability (the `category` field on resources is a placeholder for this).
- Units, movement, worker/settler actions, production queues (Milestone M6).
- Combat of any kind (Milestone M7).
- AI decision-making beyond the simple nearest-city annexation rule, and diplomacy (Milestone M8).
- Multiplayer or human-vs-human play. F9/F10 use exactly one Human civilization in a GameSession. Legacy World Editor Sim still treats civilizations as AI-only.
- Growth bonuses derived from terrain, resources, or buildings (only a manually-set flat per-city bonus exists today).
- Any server-side validation or persistence — see `DEPLOYMENT.md`.

---

## 12. Rule Priority

When two rules conflict, use this priority:

1. what actually keeps the current milestone's mechanics simple and working end-to-end;
2. explicit owner intent from the current conversation/prompt;
3. this document;
4. `ARCHITECTURE.md` (for how something is implemented, not what it should do);
5. inferred "realism" (Civ5 or real-world conventions) — nice to have, but never overrides an explicit simplification the owner has chosen.

---

## Guiding Rule

**Simplicity now, explicit hooks for later.** Every deferred mechanic listed here should be easy to add on top of the current data model (e.g. `category` on resources, `productionQueue` on cities) without a rewrite — but none of them should be implemented ahead of time "just in case."
