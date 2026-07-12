# Atlas Design System

Atlas is the design system for a family of **browser-based strategy and simulation games**. It provides reusable foundations — layout shells, panels, HUD chrome, editors, dashboards, notifications — that keep the *game world* visually dominant while making dense information (unit stats, resources, terrain, diplomacy) easy to scan and act on quickly.

This is a **from-scratch build**: no existing codebase, Figma file, or brand guideline was attached. Everything here — palette, type, components, and the two UI kits — was authored to spec from the project brief and the user's direction picks (see below). There is **no logo** provided or invented; the wordmark "Atlas" is rendered in type wherever a mark would normally sit. If real brand assets (logo, existing app screens, Figma) become available, this system should be reconciled against them.

## Direction

Two initial directions were explored — **A) Tactical HUD** (graphite, high-contrast, amber+cyan) and **B) Cartographer** (warm umber/parchment tones, serif display, ornate historical strategy-game feel). The user asked for a **mix of both**. The merged direction:

- **Shell**: dark graphite/ink surfaces (from A) — panels sit *on* the game world, not floating far above it.
- **Accent**: gold/amber as the primary command color (shared instinct of both directions), cyan for informational/friendly-unit states, olive for success/terrain/resources, rust-red for danger/hostile.
- **Type**: a serif display face (from B, "Cartographer") for the wordmark, section headers, and big numbers, paired with a technical sans + mono (from A, "Tactical HUD") for UI chrome, labels, and data.
- **Density**: balanced — data-rich but readable, generous enough hit targets for a game HUD, not a cramped enterprise dashboard.

## Products covered

1. **Game session view** — the core gameplay HUD: map viewport, minimap, resource bar, unit/selection panel, action bar, turn/time indicator, notifications.
2. **Level / scenario editor** — the authoring tool: layer & tool sidebar, canvas, inspector/properties panel, asset browser, top toolbar.

(Future surfaces per the brief — dashboards, diplomacy, tech trees, combat — are not built yet; the component set below is written generic enough to extend into them.)

## Sources

None attached this round — no Figma link, GitHub repo, or slide deck was provided. All values below were authored directly; nothing was copied from an existing product. If you have real screens, a codebase, or a Figma file for Atlas (or the actual game(s) it powers), attach them and this system should be revised to match — see "Caveats" at the end of this readme.

---

## Content fundamentals

*(Authored from scratch — no existing copy corpus to draw from. This is the intended voice; revise once real product copy exists.)*

- **Voice**: terse, operational, second-person-adjacent but mostly imperative — command-line energy, not chatty. Think field-manual, not marketing.
- **Casing**: UI labels and button text are Title Case for primary actions ("Deploy Unit", "End Turn") and ALL CAPS with wide letter-spacing for section labels, status chips, and metadata ("TURN 14 · 03:41", "SURFACES"). Body copy and descriptions are normal sentence case.
- **Numbers over adjectives**: prefer exact stats and coordinates over vague description — "+12 defense", "Turn 14", "3 units queued" rather than "a lot of units."
- **No exclamation points, no emoji.** Iconography and color carry the emotional weight (danger = red, success = olive), not punctuation or emoji.
- **Errors are direct and actionable**: "Not enough supply to deploy this unit" rather than "Oops! Something went wrong."
- **Tooltips/help text are one line, no fluff**: "Right-click to cancel" not "You can right-click here if you'd like to cancel this action."

## Visual foundations

- **Colors**: Graphite/ink neutral shell (`--gray-1`…`--gray-10`) with a single warm accent family (gold/amber, `--gold-*`) reserved for primary commands, selection outlines, and brand. Cyan/olive/red are semantic-only (info, success, danger/hostile) — never decorative. See `tokens/colors.css` and the Colors cards.
- **Type**: Serif display (`Source Serif 4`) for the wordmark, page/section headings, and hero numbers only — never for UI chrome. Sans (`IBM Plex Sans`) for all interactive UI text. Mono (`IBM Plex Mono`) for anything that's literally data: coordinates, timers, resource counts, logs. This 3-way split is the core typographic rule of Atlas.
- **Spacing**: 4px-derived scale (`--space-1`…`--space-12`), balanced density — panels are compact (8–16px internal padding) but click targets stay ≥32px tall.
- **Backgrounds**: flat surfaces only — no photographic imagery, no hand-drawn illustration, no repeating texture/pattern. The game map itself supplies visual richness; UI chrome stays quiet and flat so it doesn't compete. The *only* gradients in the system are two decorative, functional ones reserved for the map/minimap: a fog-of-war edge fade and a vignette (`--gradient-fog-edge`, `--gradient-vignette`) — never used on cards, buttons, or panels.
- **Animation**: minimal and functional, never decorative. Fast (100–160ms) ease-out transitions (`--ease-out`) for hovers, panel open/close, and selection changes. No bounce, no spring physics, no looping/ambient animation on static UI.
- **Hover state**: surfaces step one tone lighter (`--gray-3` → `--gray-4`); accent buttons lighten (`--gold-4` → `--gold-5`). No opacity fades — a HUD needs decisive, instant-feeling feedback.
- **Press/active state**: accent buttons darken one step (`--gold-4` → `--gold-3`); no scale/shrink transforms — shrinking a button in a fast-paced game HUD reads as lag, not feedback.
- **Borders**: 1px hairlines in `--border-subtle`/`--border-default` on nearly everything (panels, inputs, dividers) — Atlas is a bordered, bounded system, not a shadow-only one. Selected/focused elements get a 1px `--accent-primary` (gold) border, sometimes paired with a soft focus ring.
- **Shadows**: dark, tight, and functional — `--shadow-sm/md/lg` are all low-spread, high-opacity black shadows (never colored, never soft/large). Shadows exist to lift a panel off the map, not to add polish.
- **Corner radii**: small and consistent — `--radius-sm` (4px) for inputs/chips, `--radius-md` (6px) for buttons/panels/cards, `--radius-pill` only for status pills/badges. Never fully rounded "bubbly" cards.
- **Cards/panels**: flat fill (`--surface-panel`), 1px border, `--radius-md`, `--shadow-sm` at most. No colored left-border accent strips, no gradient fills.
- **Transparency/blur**: reserved for exactly one case — modal/dialog scrims (`--surface-overlay` + `--blur-scrim`). Not used on panels, tooltips, or cards, which all stay fully opaque so they read clearly against a busy map underneath.
- **Imagery**: none provided or invented for this pass — no product photography, no illustration. If/when map art, unit portraits, or terrain textures are supplied, they should stay desaturated-compatible so they don't fight the UI's neutral shell.

## Iconography

No icon codebase or sprite sheet was provided. **[Lucide](https://lucide.dev)** was selected as the icon system — a CDN-loaded, single-weight line icon set that matches Atlas's technical/tactical tone (consistent 2px stroke, no fill, works at small HUD sizes). Loaded via the Lucide web-font/SVG CDN in each screen — see `assets/icons/README.md`. No emoji. No unicode glyphs used as icons (unicode is reserved for genuine typographic characters like `·` dividers and `→`). This is a **substitution, flagged for the user**: if Atlas has its own icon set already, replace this pick.

---

## Index

- `styles.css` — root stylesheet; import this one file.
- `tokens/` — `colors.css`, `typography.css`, `spacing.css`, `effects.css`, `fonts.css`.
- `guidelines/` — 12 foundation specimen cards (colors ×4, type ×3, spacing ×2, effects ×3) for the Design System tab.
- `assets/README.md` — iconography (Lucide via CDN) and logo-absence notes.
- `components/core/` — Button, IconButton, Input, Select, Checkbox, Radio, Switch, Tabs, Tooltip + `core.card.html` showcase.
- `components/feedback/` — Badge, Tag, Toast, Dialog + `feedback.card.html` showcase.
- `components/game/` — Panel, StatMeter, StatusPill (Atlas-specific HUD/editor primitives) + `game.card.html` showcase.
- `ui_kits/game-session/` — core gameplay HUD recreation (`index.html` + `README.md`).
- `ui_kits/scenario-editor/` — level/scenario editor recreation (`index.html` + `README.md`).
- `SKILL.md` — portable skill file for using this system in Claude Code.

### Intentional additions

No component source existed to enumerate against (from-scratch build), so the standard primitive set was authored sized to Atlas's needs: the usual core set (Button, IconButton, Input, Select, Checkbox, Radio, Switch, Tabs, Tooltip, Badge, Tag, Toast, Dialog) plus three **Atlas-specific additions** — `Panel` (bordered HUD/editor container every floating chrome piece is built on), `StatMeter` (HP/supply/morale progress bar), and `StatusPill` (faction-colored dot + label) — needed because generic design systems don't have a primitive for "who owns this unit" or "labeled stat bar," both core to strategy-game HUDs.

## Caveats — please read

- **No source material was attached.** Every color, type choice, spacing value, and component was authored from the brief + your direction picks, not copied from a real product. Treat this as a strong starting point, not ground truth.
- **No logo exists.** The wordmark is set in Source Serif 4 wherever a mark would go.
- **Fonts are Google Fonts substitutes** (Source Serif 4 / IBM Plex Sans / IBM Plex Mono), loaded via CDN — not real brand font files, since none were provided.
- **Icons are Lucide** (CDN), a substitution — not a real Atlas icon set.

**Please attach real product material** — a codebase, Figma file, screenshots of an existing build, or brand guidelines — so this system can be revised to match reality instead of an invented starting point. I can iterate quickly once there's something real to check against.
