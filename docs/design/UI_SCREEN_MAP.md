# Civ Browser — UI Screen Map

Maps product routes to Atlas / Design System references and foundation milestones.

| Route | Screen | Source mockup / kit | Milestone | D1 status |
|---|---|---|---|---|
| `/` | Main Menu | Atlas shell + primary actions; `examples/Civ Browser.dc.html` | F1 / product main menu | **Styled shell** |
| `/library` | Game Content Library | Library category list pattern | F4 | **Working** (Maps + Civilizations entry) |
| `/library/maps` | Maps Catalog | Scenario-editor kit density (list/card) | F4 | **Working catalog** |
| `/library/civilizations` | Civilizations Catalog | Same | F4 | **Working catalog** |
| `/library/maps/current/edit` | World Editor (MVP) | `ui_kits/scenario-editor` (reference only) | F4 bridge; **F6** redesign | **Preserved MVP** + catalog bridge banner |
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

- Repository-backed catalog: search, create (blank ocean), import/export v1 JSON, duplicate, delete (confirm), open → temporary current editor bridge.
- Components: PageHeader, Input, Button, Card, Badge, EmptyState, Dialog, ConfirmDialog, FormField.
- Deferred: `/library/maps/:mapId/edit` persistence (F5); mini-map thumbnails.

### Civilizations `/library/civilizations`

- Repository-backed catalog: search, create/edit, duplicate, delete (confirm).
- Components: same Atlas set as Maps catalog.
- Deferred: traits / bonuses / AI config.

### World Editor `/library/maps/current/edit`

- Layout regions (target F6): top toolbar, tool rail, canvas, inspector — **not** implemented in D1/F4.
- Current: Toolbar + MapCanvas + right panels + modals (unchanged).
- F4: optional banner when a catalog map was loaded into legacy memory (no autosave to catalog).
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
