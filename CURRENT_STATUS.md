# Civ Browser — Current Status

**Status:** Active
**Last updated:** 2026-07-10
**Repository:** `https://github.com/jeehead-cloud/civ-browser`
**Local repository path:** `C:\Projects\civ-browser`

> This is the frequently updated implementation snapshot for Civ Browser.
> It records what's actually implemented (per milestone), what's known-broken or deliberately deferred, and the nearest next steps.
> Update this after every meaningful feature block — see the maintenance rule at the end.

---

## 1. Current Development Phase

The project has a working MVP loop: build a map by hand or generate one, define civilizations and assign capitals, configure growth/culture settings, start a game, and step through turns watching population grow and cities get annexed. There is no human-controlled civilization and no units/combat/AI yet — those are the next big blocks of work (M6-M8).

---

## 2. Milestone Status

### M1 — Подготовка скелета UI игрового движка (Active)

Scope: overall UI layout, panel arrangement, Edit/View mode toggle, the setup→playing phase transition.

Implemented:
- Top-level `App.tsx` layout: Toolbar (left), MapCanvas (center), right-hand sidebar column (CivilizationsPanel → PlayControlPanel → PlayersPanel → SettingsPanel).
- Edit/View mode toggle (`viewMode`), switching what a hex click does.
- `gamePhase: 'setup' | 'playing'` and the transition via the "Играть" button in `PlayControlPanel`.
- City-founding modal (`CityModal`) and tile-info popup (`TileInfoPanel`) as overlays.

Not yet done / open questions:
- No way to go back from `'playing'` to `'setup'` phase (no "stop game / edit map again" flow) — currently the owner can manually flip `viewMode` back to `'edit'` mid-game, but there's no explicit "return to setup" affordance.
- Overall panel layout has not been revisited for scaling to a much wider/narrower browser window beyond the responsive canvas work already done.

### M2 — Генерация и редактор карт, городов (Active)

Scope: hex grid, World Builder tools, procedural generation, hand-authored Earth map, save/load. **Only the map itself** — civilizations/settings are M3.

Implemented:
- Flat-top hex grid, axial coordinates, camera pan/zoom, viewport culling (handles the full 250×135 / ~33,750-tile map).
- World Builder tools: terrain brush (with adjustable radius), resource brush, hills toggle, vegetation brush (forest/jungle/swamp/none), river tool (click near a hex edge to add/remove a river edge), city placement/removal.
- Procedural random map generator: organic coastlines + extra islands, mountain ranges (with occasional width, and a connectivity-repair pass so ranges can't fully wall off part of a continent), "great desert" blobs capped per-landmass, rivers (major + minor, via 0-1 BFS from elevation down to the sea), lakes, latitude-based biome/vegetation, clustered single-roll resource placement.
  - **Known accepted limitation**: procedural generation is good for "give me a random world" but was never made reliable enough for a recognizable, fully-connected "Earth" — see the hand-authored map below for how that requirement was actually met.
- Hand-authored "Earth" map: continents drawn as polygons in fraction space (oversized Europe per the owner's request, compact Americas pushed to the left edge, Antarctica hugging the bottom edge, Madagascar, enlarged Arabia/India, Indonesia/Philippines archipelago, Britain/Japan/Kuril islands as separate landmasses), with a real carved Mediterranean/Black Sea/Baltic Sea/Red Sea/Persian Gulf, verified programmatically for landmass connectivity (Eurasia+Africa is one connected component; Americas/Australia/Britain/Japan/Madagascar/Antarctica/the archipelago islands are each separate). Mountains (Rockies/Andes/Atlas/Alps/Caucasus/Urals/Himalayas), 3 deserts (Sahara/Arabian/Gobi), 6 named rivers (Nile/Danube/Amazon/Mississippi/Yangtze/Ganges) plus a few procedural minor rivers, and 3 named lakes (Baikal/Victoria/Great Lakes) were layered on top by hand-picked waypoints.
  - This map was produced once as a specific JSON file and handed to the owner to load via "Загрузить карту" — it is **not** currently regenerable from a single button in the running app the way the random generator is; the authoring pipeline exists as standalone scripts outside the React app.
- Save current map to a `.json` file; load a `.json` file to fully replace the current map.

Not yet done:
- No script to auto-place cities on a generated/loaded map (mentioned as a "later" idea by the owner, not started).
- No UI button inside the app to regenerate the specific hand-authored Earth map — it's a one-off artifact right now, not a repeatable in-app generator mode.

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

## 3. Known Bugs / Limitations Worth Remembering

- Procedural map generation is accepted as imperfect (see M2 above) — don't assume it will produce a recognizable or even always-connected world; that's what the hand-authored Earth map path exists for.
- No automated test suite exists. Verification has so far relied on manual browser checks plus, for generation/algorithm work, throwaway Node scripts that check connectivity or other numeric invariants (see `ARCHITECTURE.md` §7 for the specific historical bugs this caught).
- There is no way to pause/return to Edit phase cleanly from Play phase (see M1 above).

---

## 4. Nearest Next Steps

1. Design and implement the M5 event log (data shape, where it's stored in `GameState`, how it's surfaced in the UI).
2. Decide whether/how to make the hand-authored Earth map regenerable from within the app, or keep it as a one-off loadable file.
3. Start M6 (units) once M5 feels "done enough" — likely the next big scope decision point.

---

## 5. Maintenance Rule

Update this document when:

- a milestone's status changes (Active ↔ Queued ↔ effectively done);
- a major feature ships within an active milestone;
- a known bug is found or fixed;
- a "not yet done" item in this file gets implemented.

Don't turn this file into a commit-by-commit changelog — keep it at the level of "what can this app actually do right now," matching the milestone table in `PROJECT.md`.
