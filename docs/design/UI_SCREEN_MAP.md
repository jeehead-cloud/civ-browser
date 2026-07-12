# Civ Browser — UI Screen Map

Maps product routes to Atlas / Design System references and foundation milestones.

| Route | Screen | Source mockup / kit | Milestone | D1 status |
|---|---|---|---|---|
| `/` | Main Menu | Atlas shell + primary actions; `examples/Civ Browser.dc.html` | F1 / product main menu | **Styled shell** |
| `/library` | Game Content Library | Library category list pattern | F4 (catalogs later) | **Styled placeholder** |
| `/library/maps` | Maps Catalog | Scenario-editor kit density (list/card) | F4 | **Styled placeholder** |
| `/library/civilizations` | Civilizations Catalog | Same | F4 | **Styled placeholder** |
| `/library/maps/current/edit` | World Editor (MVP) | `ui_kits/scenario-editor` (reference only) | F1 bridge; **F6** redesign | **Preserved MVP** — chrome strip only |
| `/library/maps/:mapId/edit` | Target World Editor | scenario-editor kit | F5 / F6 | Not routed yet |
| `/settings` | Settings & Balance | Panel + category nav (future) | F8 | **Styled placeholder** |
| `/games/new` | New Game | Wizard shell (future) | F9 | **Styled placeholder** |
| `/games/:gameId` | Active Game | `ui_kits/game-session` | F10 / F11 | **Styled placeholder** |
| `*` | Not Found | App shell empty state | F1 | **Styled** |

---

## Per-screen notes

### Main Menu `/`

- Regions: page header, primary action stack, temporary editor entry.
- Components: PageHeader, SectionHeader, Button, CardLink, Badge, EmptyState.
- Deferred: Continue Game sessions (F3/F9/F10).

### Library `/library`

- Regions: header, active category cards, planned note.
- Components: PageHeader, CardLink, Badge.
- Deferred: technologies/units/buildings/etc.

### Maps `/library/maps`

- Empty catalog + link to current editor.
- Deferred: CRUD, search, import/export catalog (F4).

### Civilizations `/library/civilizations`

- Empty catalog + link to editor civ panel.
- Deferred: template CRUD (F4).

### World Editor `/library/maps/current/edit`

- Layout regions (target F6): top toolbar, tool rail, canvas, inspector — **not** implemented in D1.
- Current: Toolbar + MapCanvas + right panels + modals (unchanged).
- Components used in D1: none of the new primitives inside editor panels.
- Full redesign: **F6**.

### Settings `/settings`

- Placeholder until rules presets (F8). Live settings remain in editor sidebar.

### New Game `/games/new`

- Placeholder until wizard (F9). No session creation.

### Active Game `/games/:gameId`

- Shows `gameId` as route context only. Kit reference: game-session HUD (F10).

### Not Found `*`

- EmptyState + Main Menu action.

---

## Explicitly deferred from D1

Units, combat, diplomacy, tech trees, real catalogs, persistence, editor layer tools, Lucide icon wiring, Dialog/Toast/Tooltip primitives.
