# Civ Browser — Product Structure

**Status:** Target structure (F1 application shell implemented; catalogs/sessions not yet)
**Purpose:** Target product structure after the proof-of-concept stage
**Repository:** `https://github.com/jeehead-cloud/civ-browser`
**Local repository path:** `C:\Projects\civ-browser`
**Project:** Civ Browser

> Implementation sequence and milestone status live in `FOUNDATION_IMPLEMENTATION_PLAN.md`.
> What is actually running today lives in `CURRENT_STATUS.md`.
> This file describes the **target** product areas, screens, and flows.

---

## 1. Purpose

This document defines the target product structure of Civ Browser after the proof-of-concept stage.

Its goal is to separate:

- reusable game content;
- world and map editing;
- new game setup;
- active gameplay;
- global balance configuration;
- development and debug tools.

The document describes the main product areas, their responsibilities, the major screens, and the transitions between them.

---

## 2. Main Product Areas

Civ Browser is divided into four primary areas:

1. **Game Content Library**
2. **World Editor**
3. **New Game Setup**
4. **Active Game**

Global balance settings are available as a separate top-level area.

---

## 3. Main Menu

The main menu contains only large user flows:

```text
Continue Game
New Game
Game Content Library
Settings & Balance
```

### Continue Game

F10: opens the most recently updated game session (no full catalog UI yet). A saved-games list remains a later enhancement.

### New Game

Starts the game-creation wizard.

### Game Content Library

Contains reusable content:

- maps;
- civilizations;
- technologies;
- units;
- buildings;
- great people;
- actions and abilities;
- scenarios.

At the first stage, only **Maps** and **Civilizations** must be active.

### Settings & Balance

Contains global balance presets and editable game parameters at `/settings` (F8).

Implemented:

- preset list / select / create / Create Copy / rename / save / delete (Standard not deletable);
- categories City Development + Culture & Influence;
- parameters `baseGrowthRate` (decimal storage, % UI), `capitalCulturePerTurn`, `cultureAnnexThreshold`;
- search, changed-only filter, revert/reset field/category/all;
- does not mutate GameSession snapshots or World Editor Sim settings.

---

## 4. Game Content Library

The library is the single entry point for reusable game content.

### 4.1. Library Layout

Left side:

```text
Maps
Civilizations
Technologies
Units
Buildings
Great People
Actions & Abilities
Scenarios
```

Right side:

- list or card view;
- search;
- create;
- duplicate;
- import;
- export;
- delete;
- open in the relevant editor.

### 4.2. Maps

Map cards show:

- name;
- description;
- dimensions;
- number of cities;
- last updated date;
- readiness status;
- preview or mini-map.

Available actions:

- Open;
- Duplicate;
- Export;
- Delete.

### 4.3. Civilizations

Civilization cards show:

- name;
- leader;
- flag;
- color;
- traits or effects when they are introduced.

Available actions:

- Open;
- Duplicate;
- Delete.

---

## 5. Reusable Content and Game Session State

Reusable definitions and active-game state must remain separate.

Examples:

- a technology definition exists in the content library;
- a civilization researching that technology exists in a game session;
- a great person definition exists in the library;
- a specific great person appearing in a city exists in a game session;
- an action definition describes what can be done;
- a performed action belongs to the active game and may appear in the event log.

The same principle applies to maps, civilizations, buildings, units, technologies, great people, and actions.

---

## 6. World Editor

The World Editor follows the structure and interaction model of the Civilization V WorldBuilder.

The map occupies most of the screen.

**Current editor routes:** catalog maps open at `/library/maps/:mapId/edit` with repository load/save (F5). Scratch MVP remains at `/library/maps/current/edit` without catalog binding. **F6** implements the top command bar + map + right-panel layout (Tiles / Cities / Display); temporary Simulation access holds legacy setup/play panels until F8–F10. **F7** wires independent layer generate/clear ops into Tiles subsections.

### 6.1. Top Menu

```text
New Map
Open
Save
Save As
Map Description
Resize
Mini-map
View Mode
```

Not required:

- separate toolbar;
- fullscreen mode.

### 6.2. Main Editor Modes

The editor has two explicit modes:

#### View

Clicking a tile opens information about it.

#### Edit

Clicking a tile applies the selected editing tool.

---

## 7. World Editor — Right Panel

The right panel contains three main sections:

1. **Tiles**
2. **Cities**
3. **Display**

---

## 8. Tiles Section

This section contains single-tile editing, brush settings, and drawing tools.

### 8.1. Shared Controls

- brush size;
- brush shape;
- selected tool;
- add/remove behavior where applicable.

### 8.2. Terrain

- select terrain type;
- paint terrain with the brush;
- generate terrain only (base landscape; preserves cities; does not run mountain/river/feature/resource generators);
- full procedural / Earth-like remain separate full-map actions.

### 8.3. Features

- forest;
- jungle;
- swamp;
- remove feature;
- generate / clear all features (F7).

### 8.4. Mountains and Hills

- add;
- remove;
- clear all mountains and hills;
- add a random small mountain area;
- add a random mountain chain.

### 8.5. Rivers

- add;
- remove;
- clear all rivers;
- add a random short river;
- add a random long river.

### 8.6. Resources

- choose resource;
- add or remove;
- configure placement density (Sparse / Standard / Rich) — generation parameter, not per-tile quantity;
- scatter resources randomly;
- remove all resources.

### 8.7. Improvements

Visible but inactive until the mechanic is implemented.

### 8.8. Roads

- add road;
- remove road;
- later: choose road type.

### 8.9. Borders

- assign owner or territory;
- remove ownership;
- paint borders or ownership with the brush.

### 8.10. Labels

Text labels placed directly on the map.

Examples:

- river name;
- sea name;
- region name;
- mountain range name.

Actions:

- add;
- edit text;
- move;
- delete.

### 8.11. Clear Tile

Removes everything except the base terrain:

- feature;
- mountains or hills;
- river;
- resource;
- improvement;
- road;
- border.

Cities should not be removed through this command. City deletion belongs to the Cities section.

---

## 9. Cities Section

### 9.1. Create

- choose a tile;
- enter city name;
- enter starting parameters.

### 9.2. View and Edit

Clicking a city opens its editable card.

### 9.3. City List

Shows all cities on the map.

Functions:

- search;
- select;
- open city card;
- center map on city;
- delete.

---

## 10. Display Section

The Display section controls visible map layers.

Available layer toggles:

- grid;
- terrain;
- features;
- mountains and hills;
- rivers;
- resources;
- improvements;
- roads;
- borders;
- cities;
- labels.

Suggested presets:

```text
Normal
Terrain Only
Resources Only
Cities Only
Relief
Political
```

---

## 11. Map Description

Separate dialog containing:

- map name;
- map description.

---

## 12. Mini-map

Separate floating window containing:

- full-map overview;
- current viewport rectangle;
- click-to-navigate behavior.

---

## 13. Saving Maps

A map may be saved at any intermediate editing stage.

Current format:

- JSON export/import.

Target behavior:

- maps are stored in the Game Content Library;
- JSON remains available for import, export, backup, and transfer.

A saved map is a reusable template, not an active game.

---

## 14. New Game Setup

New Game is a four-step wizard.

```text
Map
Civilizations
Game Settings
Review & Start
```

### 14.1. Step 1 — Map

The user selects a saved map.

The screen shows:

- name;
- description;
- dimensions;
- number of cities;
- last updated date;
- mini-map;
- readiness status.

Available actions:

- Select;
- Open in Editor.

The selected map is copied into the new game session.

### 14.2. Step 2 — Civilizations

The user selects civilizations from the catalog.

For each civilization:

- player or AI;
- color;
- leader;
- capital;
- team later;
- AI difficulty later.

The capital is selected from cities already present on the chosen map.

Rules:

- every selected civilization has exactly one capital;
- one city cannot be the capital of two civilizations;
- the capital must already exist on the selected map;
- F9 enforces exactly one Human civilization (single-player); additional Humans remain deferred.

### 14.3. Step 3 — Game Settings

Initial fields:

- rules preset;
- starting year;
- years per turn;
- maximum number of turns.

Future fields:

- victory conditions;
- starting era;
- starting technologies;
- difficulty;
- barbarians;
- diplomacy rules;
- scenario-specific options.

### 14.4. Step 4 — Review & Start

Summary includes:

- map;
- dimensions;
- number of cities;
- player civilization;
- AI civilizations;
- assigned capitals;
- starting year;
- years per turn;
- selected rules preset.

Before starting, validate:

- map selected (with at least one city);
- at least one civilization selected;
- exactly one Human civilization;
- every civilization has a valid capital;
- capitals are unique;
- settings are valid.

Button:

```text
Create Game
```

---

## 15. Game Session Creation

When the user creates a game, the system creates an independent game session containing copies or snapshots of:

- map;
- cities;
- selected civilizations;
- assigned capitals;
- selected rules preset;
- starting parameters.

Changes in the active game do not modify:

- the source map;
- civilization catalog entries;
- the original global rules preset.

---

## 16. Active Game Screen

The active game follows the Civilization V principle:

- the map occupies almost the entire screen;
- information is placed around the edges;
- the right column contains secondary information;
- the top panel contains compact game status.

F10 implements the shell for `/games/:gameId` with an isolated session runtime, Next Turn, and autosave. **F11** completes contextual tile/city popups and expanded Overview/Cities/World panels.

Main structure:

```text
Top status bar
Large central map
Right information column
Map-edge context popup (tile or city; one at a time)
```

Popup positioning: stable overlay at the map edge (bottom-left of the map column). Camera-anchored follow is deferred so Canvas pan/zoom stays stable.

---

## 17. Right Information Column

The right column is always visible by default.

### 17.1. Panel Switcher

At the top:

```text
Overview
Cities
World
...
```

Future panels may include:

- technologies;
- economy;
- diplomacy;
- military;
- espionage;
- great people.

### 17.2. Default Overview Panel

Contains, from top to bottom:

1. Notifications and events
2. Civilization summary list
3. Current year and turn
4. Next Turn button

### 17.3. Notifications and Events

Shows:

- icon;
- event or notification text;
- turn;
- year;
- related object when applicable.

Clicking an item may center the map on the relevant city, tile, unit, or civilization.

Notifications require attention.

Events record what happened.

### 17.4. Civilization Summary

Each civilization row may show:

- flag;
- name;
- color;
- number of cities;
- total population;
- culture;
- capital;
- player or AI.

Clicking a civilization may open a more detailed summary and center the map on its capital.

### 17.5. Bottom Area

Always fixed:

- current year;
- turn number;
- Next Turn button.

In the future, this area may explain why the turn cannot be ended.

Examples:

```text
Research must be selected
A unit is waiting for orders
A city has no production
```

### 17.6. Cities Panel (F11)

Read-only list of all cities in the session:

- name, owner/flag, population, capital, culture, coordinates;
- search;
- filters: All / Human-owned / AI-owned / unclaimed;
- click: select city, center map, open city popup.

No city editing.

### 17.7. World Panel (F11)

Read-only session/map summary:

- map/source name, dimensions;
- tile counts by terrain; land/water;
- city counts (claimed/unclaimed);
- civilization count;
- year, turn, years per turn, max turns;
- rules snapshot summary;
- optional resource / river counts.

Selectors are pure and suitable for memoization.

---

## 18. Top Information Bar

The top bar is a compact single-line status display.

### 18.1. Current Information

- civilization flag;
- civilization name;
- capital;
- total population;
- city count;
- culture;
- current year;
- turn number;
- years per turn.

Example:

```text
Rome · Capital: Rome
Population: 28 | Cities: 4 | Culture: 120 (+8)
1200 BCE | Turn 37 | 25 years/turn
```

### 18.2. Future Information

- gold;
- science;
- happiness;
- faith;
- strategic resources;
- great person progress;
- current era;
- diplomatic status.

Indicators may become clickable and open the relevant right-side information panel.

---

## 19. Tile Popup

Clicking a non-city tile opens a compact information popup (F11). Escape closes; another click replaces content. No gameplay actions.

### Landscape

- terrain type;
- feature or vegetation;
- mountains or hills;
- resource if present.

### Water

- river on the tile boundary (`riverOnTile`);
- river on neighboring tiles (`riverNearby`);
- adjacent lake;
- fresh-water access (`riverOnTile` OR adjacent lake) — see `PRODUCT_RULES.md`.

### Yield

- food / production as **base tile yield** (display-only; see `PRODUCT_RULES.md`);
- beauty: Planned (not stored).

### Ownership

- owning civilization or neutral/unclaimed.

Optional muted coordinates for debugging.

---

## 20. City Popup

Clicking a city tile opens a city popup (F11). One contextual popup at a time; Escape closes.

### 20.1. Header

- city name;
- emblem placeholder / badge;
- city culture;
- founding year: **Unknown** when not stored (do not invent dates);
- capital badge when applicable.

### 20.2. Owner

- civilization name;
- flag;
- Human / AI;
- no fake diplomacy/relationship.

### 20.3. Characters in the City

**Planned** in F11 — no character persistence yet. Show a planned placeholder; do not invent characters.

### 20.4. Main City Parameters

Show real fields only:

- population;
- culture;
- growth rate / growth bonus;
- capital status.

Production, science, mood, and similar metrics are omitted or marked Planned when not implemented — never show `0` as if real.

### 20.5. Buildings

**Not implemented** in F11. Do not treat `productionQueue` as completed buildings. No building info popover without real data.

### 20.6. Actions

For a Human-owned city:

- `Build` — disabled / planned (no production system);
- `Actions` — opens an informational dialog listing future actions as unavailable.

For a foreign city:

- `Actions` — planned/unavailable only; no state mutation.

Unavailable mechanics must not fake success.

---

## 21. Game Editing and Debug Mode

Active gameplay does not allow map editing by default.

**Implementation (F12):** development-only Debug Mode on Active Game (`import.meta.env.DEV`).

Rules:

- disabled by default; confirmation required to enable;
- Inspect vs Edit sub-modes (Edit paints; Inspect keeps F11 popups);
- compact tools only (terrain/features/hills/mountains/rivers/resources/clear);
- changes affect only the current GameSession runtime / saved session;
- never changes source MapTemplate, civilization templates, or rules presets;
- disabling Debug Mode does not discard unsaved or saved runtime edits;
- persistent “Debug Editing Active” warning while enabled.

---

## 22. Global Settings and Balance

The settings screen must support a growing number of parameters without requiring a redesign.

**Implementation (F8):** `/settings` uses declarative parameter definitions, category navigation, and repository-backed presets. Future categories appear as Planned until they have real parameters.

### 22.1. Layout

Left side:

- category navigation.

Right side:

- parameters in the selected category.

Suggested categories:

```text
City Development
Culture & Influence
Economy
Science & Technologies
Population & Mood
Combat
Diplomacy
AI
Great People
Espionage
System Rules
```

### 22.2. Initial Parameters

Initially, only already existing parameters are required:

- base city growth rate;
- capital culture per turn;
- culture threshold for annexation.

### 22.3. Parameter Format

Every parameter should support:

- name;
- description;
- current value;
- unit;
- default value;
- valid range;
- reset action.

### 22.4. Presets

The screen supports rules presets.

Examples:

```text
Standard
Fast Game
Historical
Test Balance
```

Preset actions:

- create copy;
- rename;
- save;
- reset changes.

### 22.5. Search and Filters

Future support:

- search by parameter name;
- show only changed parameters;
- show experimental parameters;
- filter by category.

### 22.6. Snapshot Rule

A new game receives a snapshot of the selected preset.

Later changes to global settings must not change already started games.

---

## 23. Future Content Types

The architecture must allow the Game Content Library to expand with:

- technologies;
- units;
- buildings;
- great people;
- actions and abilities;
- scenarios.

Each of these has:

1. a reusable definition in the library;
2. state or instances inside a game session.

---

## 24. Product Flow

```text
Main Menu
→ Game Content Library
→ Maps
→ World Editor

Main Menu
→ Game Content Library
→ Civilizations
→ Civilization Editor

Main Menu
→ Settings & Balance
→ Edit Rules Preset

Main Menu
→ New Game
→ Select Map
→ Select Civilizations and Capitals
→ Select Game Settings
→ Review
→ Create Game
→ Active Game

Main Menu
→ Continue Game
→ Select Game Session
→ Active Game
```

---

## 25. Core Product Rules

1. A map is a reusable template.
2. A game session contains an independent copy of the selected map.
3. A civilization catalog entry is a reusable template.
4. A civilization inside a game session is an independent instance.
5. A capital is selected from cities already present on the chosen map.
6. One city cannot be the capital of multiple civilizations.
7. At game start, only capital cities are owned; other map cities remain unclaimed.
8. New Game (F9) requires exactly one Human civilization (single-player); additional Humans are deferred.
9. A started game uses a snapshot of the selected rules preset.
10. Active gameplay does not allow editing by default.
11. Debug editing affects only the active game session.
12. The map remains the dominant visual element in both the editor and the game.

---

## 26. Immediate Implementation Priority

Before adding units, combat, diplomacy, great people, espionage, or other large mechanics, the project should establish:

1. application shell and navigation;
2. Game Content Library;
3. reusable map model;
4. reusable civilization model;
5. rules presets;
6. New Game wizard (done — F9);
7. separation between map templates and game sessions (done — F2/F9);
8. separate editor and active-game screens (done — F5/F6 editor, F10–F11 Active Game);
9. local persistence (done — F3);
10. staged map-generation tools (done — F7);
11. display layers (done — F6);
12. debug editing boundaries (done — F12).

---

## 27. Open Questions

The following remain to be designed later:

- civilization editor structure;
- local persistence technology and versioning;
- detailed city screen beyond the popup;
- detailed building selection UI;
- exact event-log data model;
- exact rules-preset schema;
- map readiness criteria;
- scenario content model;
- player visibility and fog-of-war;
- political borders and ownership rules;
- save-game versioning and migration.

---

## Guiding Principle

**Separate reusable content, editing, game creation, and active gameplay before expanding the mechanics. The map remains central, while the surrounding UI stays compact, familiar, and scalable.**
