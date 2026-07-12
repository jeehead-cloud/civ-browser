# Civ Browser — Foundation Implementation Plan

**Status:** Active (F1 done; F2+ queued)
**Purpose:** Turn the target product structure into an incremental implementation plan
**Repository:** `https://github.com/jeehead-cloud/civ-browser`
**Local repository path:** `C:\Projects\civ-browser`
**Project:** Civ Browser

---

## 1. Purpose

This document defines the implementation sequence for restructuring Civ Browser after the proof-of-concept stage.

The goal is to establish a stable foundation before adding major gameplay systems such as:

- units;
- combat;
- diplomacy;
- technologies;
- great people;
- espionage;
- advanced AI.

The plan prioritizes:

1. separation of reusable content from active game state;
2. clear application navigation;
3. local persistence;
4. independent map editing and game creation;
5. preservation of current working behavior during refactoring.

---

## 2. Guiding Rules

### 2.1. Preserve the Working MVP

The current application already supports:

- map generation;
- map editing;
- civilizations;
- capitals;
- city growth;
- culture accumulation;
- annexation;
- turn progression.

Every implementation stage must keep the project buildable and usable.

### 2.2. Refactor in Small, Reversible Steps

Each stage should:

- have one clear purpose;
- avoid unrelated cleanup;
- end in a working state;
- be independently reviewable;
- be suitable for one logical commit.

### 2.3. No Backend Yet

Do not add:

- PostgreSQL;
- server API;
- authentication;
- cloud persistence;
- multiplayer infrastructure.

The first persistence layer should be local browser storage through IndexedDB.

### 2.4. Templates and Sessions Must Stay Separate

Reusable content:

- maps;
- civilizations;
- rules presets.

Active session state:

- copied map;
- civilization instances;
- current turn;
- current year;
- dynamic city state;
- future units, technologies, diplomacy, and events.

Changes in an active game must not modify reusable source templates.

---

## 3. Target Technical Direction

### 3.1. Routing

Use explicit application routes.

Recommended initial route structure (target):

```text
/
 /library
 /library/maps
 /library/maps/:mapId/edit
 /library/civilizations
 /settings
 /games/new
 /games/:gameId
```

**Current F1 reality:** the working World Editor MVP is reachable at `/library/maps/current/edit` until maps become catalog items (F4/F5). Keep `/library/maps/:mapId/edit` as the target; do not treat `current` as the long-term map id scheme.

Future routes may include:

```text
/library/technologies
/library/units
/library/buildings
/library/great-people
/library/actions
/library/scenarios
```

### 3.2. Local Persistence

Use IndexedDB behind a repository abstraction.

Recommended first implementation:

```text
IndexedDB
└── Maps
└── Civilizations
└── Rules Presets
└── Game Sessions
```

JSON remains available for:

- import;
- export;
- backup;
- migration;
- debugging.

### 3.3. Domain Model

The foundation should introduce clear domain entities:

```text
MapTemplate
MapCityTemplate
CivilizationTemplate
GameRulesPreset
GameSession
GameCity
CivilizationInstance
```

Names may change during implementation, but responsibilities must remain separate.

---

## 4. Milestone Overview

| ID | Milestone | Outcome | Status |
|---|---|---|---|
| F1 | Application Shell and Routing | Separate screens and stable navigation | **Done** |
| F2 | Domain Model Separation | Reusable templates and active sessions become distinct | Queued |
| F3 | Persistence Abstraction | Local catalogs and game saves | Queued |
| F4 | Content Library | Maps and civilizations become reusable catalog items | Queued |
| F5 | World Editor Migration | Existing editor moved into dedicated route | Queued |
| F6 | World Editor Restructure | New Civ V-like editor structure | Queued |
| F7 | Independent Map Layers | Terrain, mountains, rivers, resources edited separately | Queued |
| F8 | Rules Presets | Scalable settings and balance system | Queued |
| F9 | New Game Wizard | Create game sessions from templates | Queued |
| F10 | Active Game Shell | Separate gameplay UI | Queued |
| F11 | Context Popups and Panels | Tile, city, events, civilization summaries | Queued |
| F12 | Debug Editing Boundary | Safe live editing of current session only | Queued |

---

# 5. F1 — Application Shell and Routing

**Status: Implemented** (committed with the application shell / routing work).

## Goal

Introduce the top-level application structure without changing gameplay logic.

## Scope

Create routes for:

- Main Menu;
- Game Content Library;
- Maps;
- Civilizations;
- Settings & Balance;
- New Game;
- Active Game;
- World Editor.

The current application may initially be mounted unchanged inside the World Editor or legacy route.

## Deliverables

- router added;
- global application shell;
- main menu screen;
- placeholder screens for all major areas;
- navigation between screens;
- direct URL access works;
- browser refresh keeps the current route.

## Implemented routes (as of F1)

| Route | Role |
|---|---|
| `/` | Main Menu |
| `/library` | Library home (placeholder links) |
| `/library/maps` | Maps catalog placeholder |
| `/library/maps/current/edit` | **Temporary** World Editor hosting the existing MVP |
| `/library/civilizations` | Civilizations catalog placeholder |
| `/settings` | Settings & Balance placeholder |
| `/games/new` | New Game placeholder |
| `/games/:gameId` | Active Game placeholder (route id only; no session) |
| `*` | Not found |

**Route note:** keep `/library/maps/:mapId/edit` as the target for F5. The `current` segment is temporary until maps are catalog items (F4/F5).

## Acceptance Criteria

- existing app still runs;
- current editor functionality is reachable;
- no gameplay behavior is lost;
- `npm run build` passes;
- route transitions do not reload the whole app.

## Out of Scope

- persistence;
- new domain entities;
- new World Editor UI;
- New Game logic;
- Active Game redesign.

---

# 6. F2 — Domain Model Separation

## Goal

Introduce reusable templates and active game session models.

## Scope

Define:

### MapTemplate

Contains:

- id;
- name;
- description;
- dimensions;
- tiles;
- map cities;
- timestamps;
- version.

### MapCityTemplate

Contains:

- id;
- name;
- coordinates;
- starting population;
- optional metadata.

### CivilizationTemplate

Contains:

- id;
- name;
- culture name;
- flag;
- default color;
- leader later;
- traits later.

### GameRulesPreset

Contains:

- id;
- name;
- editable balance values;
- timestamps;
- version.

### GameSession

Contains:

- id;
- name;
- copied map state;
- copied settings snapshot;
- civilization instances;
- current turn;
- current year;
- years per turn;
- dynamic city state;
- timestamps;
- version.

## Deliverables

- new TypeScript types;
- conversion helpers from current state;
- no immediate deletion of legacy types unless safe;
- documentation update in `ARCHITECTURE.md`.

## Acceptance Criteria

- no source template is directly mutated by an active session;
- compile-time distinction exists between template and session models;
- current JSON map format can still be imported;
- `npm run build` passes.

## Out of Scope

- final persistence;
- final migration of all store logic;
- future technology/unit/building schemas.

---

# 7. F3 — Persistence Abstraction

## Goal

Add local persistence without coupling UI to IndexedDB.

## Scope

Create repository interfaces such as:

```ts
interface MapRepository {
  list(): Promise<MapTemplate[]>
  get(id: string): Promise<MapTemplate | null>
  save(map: MapTemplate): Promise<void>
  delete(id: string): Promise<void>
}

interface CivilizationRepository {
  list(): Promise<CivilizationTemplate[]>
  get(id: string): Promise<CivilizationTemplate | null>
  save(civilization: CivilizationTemplate): Promise<void>
  delete(id: string): Promise<void>
}

interface RulesPresetRepository {
  list(): Promise<GameRulesPreset[]>
  get(id: string): Promise<GameRulesPreset | null>
  save(preset: GameRulesPreset): Promise<void>
  delete(id: string): Promise<void>
}

interface GameSessionRepository {
  list(): Promise<GameSession[]>
  get(id: string): Promise<GameSession | null>
  save(session: GameSession): Promise<void>
  delete(id: string): Promise<void>
}
```

## Recommended Technology

IndexedDB, optionally through Dexie.

## Deliverables

- repository interfaces;
- IndexedDB implementation;
- schema versioning;
- seed/default data;
- error handling;
- lightweight migration support.

## Acceptance Criteria

- saved data survives browser refresh;
- maps, civilizations, presets, and games are stored independently;
- UI code does not directly call raw IndexedDB APIs;
- database failures are surfaced clearly;
- `npm run build` passes.

## Out of Scope

- cloud sync;
- accounts;
- multiplayer;
- server API.

---

# 8. F4 — Game Content Library

## Goal

Create the reusable content catalog.

## Scope

Implement:

### Library Home

Categories:

- Maps;
- Civilizations.

Future categories remain hidden or disabled.

### Maps Catalog

Actions:

- create;
- open;
- duplicate;
- import;
- export;
- delete;
- search.

### Civilizations Catalog

Actions:

- create;
- open;
- duplicate;
- delete;
- search.

## Deliverables

- reusable catalog components;
- card or list view;
- confirmation for destructive actions;
- empty states;
- loading and error states.

## Acceptance Criteria

- multiple maps can exist independently;
- multiple civilizations can exist independently;
- deleting one item does not affect game sessions already created from it;
- imported JSON can create a map catalog item;
- `npm run build` passes.

---

# 9. F5 — World Editor Migration

## Goal

Move the current editor into a dedicated map route.

## Scope

Route:

```text
/library/maps/:mapId/edit
```

The editor loads a selected `MapTemplate`.

Existing functionality must remain available:

- map rendering;
- terrain painting;
- resources;
- vegetation;
- hills;
- rivers;
- city placement;
- save/load behavior;
- procedural generation.

## Deliverables

- selected map loading;
- editor save action;
- dirty-state tracking;
- leave-with-unsaved-changes warning;
- map-specific state instead of one global unnamed map.

## Acceptance Criteria

- opening a map loads the correct content;
- editing one map does not change another;
- save updates the selected map;
- reload restores saved changes;
- legacy JSON export remains available;
- `npm run build` passes.

---

# 10. F6 — World Editor Restructure

## Goal

Restructure the editor UI around the agreed Civ V WorldBuilder model.

## Scope

### Top Menu

- New Map;
- Open;
- Save;
- Save As;
- Map Description;
- Resize;
- Mini-map;
- View Mode.

### Right Panel

- View/Edit toggle;
- Tiles;
- Cities;
- Display.

### Tiles Subsections

- Terrain;
- Features;
- Mountains and Hills;
- Rivers;
- Resources;
- Improvements disabled;
- Roads;
- Borders;
- Labels;
- Clear Tile.

## Deliverables

- new editor layout;
- clear active tool state;
- compact right-side controls;
- map remains the dominant screen area;
- existing actions moved into the new structure.

## Acceptance Criteria

- all existing editing tools remain usable;
- View mode opens tile information;
- Edit mode applies tools;
- switching sections does not reset the map;
- `npm run build` passes.

---

# 11. F7 — Independent Map Layers

## Goal

Split the current generation pipeline into independently controllable stages.

## Scope

Introduce or expose independent operations for:

- terrain;
- mountains and hills;
- rivers;
- features/vegetation;
- resources.

### Mountains and Hills

- add;
- remove;
- clear all;
- random small mountain area;
- random mountain chain.

### Rivers

- add;
- remove;
- clear all;
- random short river;
- random long river.

### Resources

- add/remove;
- quantity;
- random scatter;
- clear all.

## Deliverables

- layer-specific generation actions;
- layer-specific clear actions;
- safe validation;
- no accidental reset of unrelated layers.

## Acceptance Criteria

- generating rivers does not replace terrain;
- clearing resources does not remove cities;
- generating mountains does not regenerate the whole map;
- existing full-map generation may remain as a convenience action;
- `npm run build` passes.

---

# 12. F8 — Rules Presets

## Goal

Create scalable global settings and balance presets.

## Scope

Initial categories may include:

- City Development;
- Culture & Influence;
- System Rules.

Initial parameters:

- base city growth rate;
- capital culture per turn;
- culture annexation threshold.

Preset actions:

- create;
- duplicate;
- rename;
- save;
- reset;
- delete where safe.

## Deliverables

- preset catalog;
- category navigation;
- consistent parameter editor;
- validation;
- search structure prepared for later use.

## Acceptance Criteria

- multiple presets can exist;
- changing one preset does not change another;
- existing settings are migrated into a default preset;
- future parameters can be added without redesigning the screen;
- `npm run build` passes.

---

# 13. F9 — New Game Wizard

## Goal

Create a game session from reusable content.

## Steps

### Step 1 — Map

- select saved map;
- preview;
- dimensions;
- number of cities;
- readiness status;
- open in editor.

### Step 2 — Civilizations

- select civilization templates;
- choose player or AI;
- assign color;
- assign capital from cities already present on the map.

Validation:

- at least one civilization;
- at least one player civilization;
- every civilization has exactly one capital;
- capitals are unique;
- capital exists on the selected map.

### Step 3 — Game Settings

- select rules preset;
- starting year;
- years per turn;
- maximum turns.

### Step 4 — Review & Start

- summary;
- validation;
- Create Game.

## Deliverables

- wizard state;
- validation;
- session creation service;
- deep-copy or snapshot logic;
- save to game session repository.

## Acceptance Criteria

- source map remains unchanged;
- source civilization templates remain unchanged;
- source preset remains unchanged;
- created game has independent copied state;
- invalid capital assignments are blocked;
- `npm run build` passes.

---

# 14. F10 — Active Game Shell

## Goal

Move active gameplay into its own dedicated screen.

## Scope

Route:

```text
/games/:gameId
```

Layout:

- compact top information bar;
- large map;
- right information column;
- contextual popups;
- fixed Next Turn control.

## Deliverables

- active session loading;
- session autosave or explicit save strategy;
- turn controls;
- current year and turn display;
- current MVP simulation preserved.

## Acceptance Criteria

- active game opens independently from editor;
- next turn updates only the current session;
- session can be resumed after refresh;
- source templates remain unchanged;
- `npm run build` passes.

---

# 15. F11 — Context Popups and Information Panels

## Goal

Implement the agreed gameplay information structure.

## Scope

### Right Column Default

- panel switcher;
- notifications and events;
- civilization summary list;
- year;
- turn;
- Next Turn.

### Tile Popup

- terrain;
- feature;
- hills/mountains;
- resource;
- river on tile boundary;
- nearby river;
- fresh-water access;
- food;
- production;
- beauty later;
- owner.

### City Popup

- name;
- emblem;
- culture;
- founding year;
- owner;
- flag;
- characters;
- population;
- production;
- science;
- culture;
- mood;
- buildings;
- Build action for player city;
- Actions for any city.

## Deliverables

- popup components;
- object selection behavior;
- event list;
- civilization summary panel.

## Acceptance Criteria

- clicking a normal tile opens tile popup;
- clicking a city opens city popup;
- own city shows available actions;
- foreign city stays informational except generic Actions;
- `npm run build` passes.

---

# 16. F12 — Debug Editing Boundary

## Goal

Allow live editing during development without corrupting source templates.

## Scope

Add an explicit debug mode.

Rules:

- hidden or clearly marked in normal UI;
- disabled by default;
- confirmation required;
- changes affect only the active game session;
- original map template remains untouched.

## Deliverables

- debug toggle;
- visual warning;
- selected editor tools available in session context;
- session-only mutation path.

## Acceptance Criteria

- source map hash/data remains unchanged after debug editing;
- game session reflects the debug changes;
- disabling debug mode restores normal gameplay interaction;
- `npm run build` passes.

---

# 17. Store Refactoring Strategy

Do not split the current Zustand store all at once.

Recommended progression:

### Phase A

Keep the current store, but separate grouped actions and selectors.

### Phase B

Introduce dedicated stores or slices:

```text
appStore
libraryStore
mapEditorStore
gameSetupStore
gameSessionStore
uiStore
```

### Phase C

Move persistence concerns out of stores and into repository/services.

### Rule

Stores manage current application state.

Repositories manage persisted data.

Domain services perform conversions and session creation.

---

# 18. Migration Strategy

## Existing Maps

Current JSON maps should remain importable.

Migration may:

- add ids;
- add names;
- add version;
- separate map cities from game cities;
- preserve unknown future-compatible fields where practical.

## Existing Civilizations

Current civilizations may be migrated into reusable templates.

## Existing Settings

Current global settings should become the default rules preset.

## Existing Game State

A one-time compatibility path may convert the current in-memory MVP state into a `GameSession`.

---

# 19. Validation Strategy

There is currently no automated test suite.

For each stage:

1. run `npm run build`;
2. run `git diff --check`;
3. manually test the affected flow in the browser;
4. verify persistence after refresh where relevant;
5. verify source templates are not mutated by game sessions;
6. use small scripts for map integrity or graph-related checks.

Recommended future automated tests:

- template-to-session deep copy;
- capital uniqueness validation;
- persistence migrations;
- layer-specific clear/generation behavior;
- source-template immutability.

---

# 20. Documentation Maintenance

Update documentation as implementation progresses.

### `PROJECT.md`

Update roadmap and milestone naming.

### `CURRENT_STATUS.md`

Track what foundation milestone is active and what is implemented.

### `ARCHITECTURE.md`

Update:

- routing;
- persistence;
- domain entities;
- stores;
- repository abstraction.

### `PRODUCT_RULES.md`

Update only when gameplay rules change.

### `DEPLOYMENT.md`

Update only if hosting or backend decisions change.

### `PRODUCT_STRUCTURE.md`

Update when product areas, screens, or flows change.

---

# 21. Recommended Commit Boundaries

Suggested logical commits:

```text
feat: add application shell and routing
refactor: introduce template and game session domain models
feat: add indexeddb persistence repositories
feat: add game content library
refactor: move map editor to dedicated route
feat: restructure world editor navigation
refactor: split map generation into independent layers
feat: add game rules presets
feat: add new game wizard
feat: add dedicated active game screen
feat: add tile and city information popups
feat: add session-only debug editing
```

---

# 22. Recommended Immediate Sequence

The first implementation batch should contain only:

## Batch 1

1. F1 — Application Shell and Routing
2. F2 — Domain Model Separation
3. F3 — Persistence Abstraction

## Batch 2

4. F4 — Game Content Library
5. F5 — World Editor Migration
6. F8 — Rules Presets

## Batch 3

7. F6 — World Editor Restructure
8. F7 — Independent Map Layers
9. F9 — New Game Wizard

## Batch 4

10. F10 — Active Game Shell
11. F11 — Context Popups and Information Panels
12. F12 — Debug Editing Boundary

---

# 23. First Cursor Task

**F1 is complete.** The next Cursor task in Batch 1 should be:

```text
Introduce template vs game-session domain models without breaking the current MVP.
```

(See F2 — Domain Model Separation.)

The original first task was:

```text
Add the application shell and routing without changing current gameplay behavior.
```

It delivered:

- routing and Main Menu;
- placeholder screens;
- the existing application mounted at `/library/maps/current/edit`;
- preserved MVP gameplay behavior.

---

# 24. Completion Definition

The foundation phase is complete when:

- maps are reusable catalog items;
- civilizations are reusable catalog items;
- rules are stored as presets;
- new games are created from templates;
- game sessions are independent;
- the editor and active game are separate screens;
- local persistence survives refresh;
- map layers can be edited independently;
- debug editing affects sessions only;
- current MVP gameplay still works.

---

## Guiding Principle

**Restructure first, expand mechanics second. Preserve the working MVP while introducing clean boundaries that future systems can depend on.**
