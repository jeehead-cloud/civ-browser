# Civ Browser — UI Screen Map

Maps product routes to Atlas / Design System references and foundation milestones.

| Route | Screen | Source mockup / kit | Milestone | D1 status |
|---|---|---|---|---|
| `/` | Main Menu | Atlas shell + primary actions; `examples/Civ Browser.dc.html` | F1 / product main menu | **Styled shell** |
| `/library` | Game Content Library | Library category list pattern | F4 | **Working** (Maps + Civilizations entry) |
| `/library/maps` | Maps Catalog | Scenario-editor kit density (list/card) | F4 | **Working catalog** |
| `/library/civilizations` | Civilizations Catalog | Same | F4 | **Working catalog** |
| `/library/maps/:mapId/edit` | World Editor (selected map) | `ui_kits/scenario-editor` (reference) | F5+F6 | **Working** F6 layout + F5 load/save |
| `/library/maps/current/edit` | Scratch World Editor | scenario-editor kit | Scratch + F6 layout | **Working** same shell; not catalog-backed |
| `/settings` | Settings & Balance | Panel + category nav | F8 | **Working** rules preset editor |
| `/games/new` | New Game | Wizard shell | F9 | **Working** |
| `/games/:gameId` | Active Game | `ui_kits/game-session` | F10 | **Working** (F11 popups pending) |
| `*` | Not Found | App shell empty state | F1 | **Styled** |

---

## Per-screen notes

### Main Menu `/`

- Regions: page header, primary action stack, temporary editor entry.
- Components: PageHeader, SectionHeader, Button, CardLink, Badge, EmptyState.
- Deferred: Continue Game full catalog (F10 opens latest session only); F11 HUD polish.

### Library `/library`

- Regions: header, active category cards, planned note.
- Components: PageHeader, CardLink, Badge.
- Deferred: technologies/units/buildings/etc.

### Maps `/library/maps`

- Repository-backed catalog: search, create (blank ocean), import/export v1 JSON, duplicate, delete (confirm), open → `/library/maps/:mapId/edit`.
- Components: PageHeader, Input, Button, Card, Badge, EmptyState, Dialog, ConfirmDialog, FormField.
- Deferred: mini-map thumbnails.

### Civilizations `/library/civilizations`

- Repository-backed catalog: search, create/edit, duplicate, delete (confirm).
- Components: same Atlas set as Maps catalog.
- Deferred: traits / bonuses / AI config.

### World Editor `/library/maps/:mapId/edit`

- F5: load selected MapTemplate; Save / Save As; dirty badge; leave confirm; Map Description dialog.
- F6 layout: top command bar + dominant map + right panel (Tiles / Cities / Display / temporary Sim).
- F7: independent Terrain Only / Features / Mountains / Rivers / Resources ops in Tiles subsections (confirmations for clear-all).
- No permanent left toolbar. View/Edit switch; display layers/presets (non-dirty).
- Deferred: Resize; Mini-map; improvements/roads/labels models; Earth split into layers.
- Scratch: `/library/maps/current/edit` — same F6 shell; Save disabled; Save As may create catalog item.

### Settings `/settings`

- F8: repository-backed rules presets (Standard protected); category nav; parameter cards; search/changed-only; draft Save/Revert/reset; dirty leave guards.
- Components: PageHeader, FormField, Input, Button, Badge, Dialog, ConfirmDialog, ParameterField, EmptyState.
- Deferred: future category parameters; preset import/export.

### New Game `/games/new`

- F9: four-step wizard (Map → Civilizations → Game Settings → Review & Start).
- Creates independent GameSession via dedicated service; saves through GameSessionRepository; navigates to `/games/:gameId`.
- Components: PageHeader, WizardSteps, SelectionCard, ValidationSummary, Panel, FormField, Input, Button, Badge, EmptyState, ConfirmDialog, SegmentedControl.
- Deferred: wizard draft persistence; teams; AI difficulty; multiple Humans; Continue Game.

### Active Game `/games/:gameId`

- F10: loads GameSession into isolated runtime; top bar; map (view-only); Overview events + civ list; Next Turn with autosave; Save Game; Continue from Main Menu.
- Minimal tile/city selection strip (not full F11 popups).
- Deferred F11: richer contextual panels, buildings/actions, denser HUD.

### Not Found `*`

- EmptyState + Main Menu action.

---

## Explicitly deferred from D1 / remaining after F6

Units, combat, diplomacy, tech trees, Lucide icon wiring, Toast/Tooltip primitives, F11 contextual popups/actions.
