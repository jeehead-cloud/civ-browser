# Civ Browser — Design System (Atlas)

**Status:** Active (D1 foundation)  
**Source package:** `Design System/` (Claude-generated Atlas Design System)  
**Production tokens:** `src/design-system/tokens.css`  
**Production UI primitives:** `src/components/ui/`  
**Screen map:** `docs/design/UI_SCREEN_MAP.md`

---

## 1. Name and purpose

**Atlas** is the generated design system for browser-based strategy / simulation games. Civ Browser adopts Atlas as its visual language for application chrome (menus, library, settings, placeholders). The in-product wordmark remains **Civ Browser**; “Atlas” names the design system, not the game.

Principles (from `Design System/system/readme.md`):

- Dark graphite shell; game world stays visually dominant.
- Gold/amber primary command accent; cyan = info/links; olive = success; rust = danger.
- Serif display for brand/headings; sans for UI; mono for data.
- Flat bordered panels; tight shadows; minimal functional motion (100–160ms).
- No emoji in chrome; no decorative gradients on cards/buttons.

---

## 2. Authoritative sources vs excluded files

| Classification | Location | Use |
|---|---|---|
| Guidance | `Design System/system/readme.md`, `SKILL.md` | Principles, voice, caveats |
| Tokens | `Design System/system/tokens/*.css` | Copied into production tokens |
| Component specs | `*.prompt.md`, `*.jsx`, `*.d.ts` under `components/` | Specs for React rewrite |
| UI kits | `ui_kits/game-session`, `ui_kits/scenario-editor` | Layout references (F6/F10) |
| Guidelines | `guidelines/*.html` | Specimen cards |
| Mockup | `examples/Civ Browser.dc.html` | Combined prototype reference |
| Excluded from runtime | `_ds_bundle.js`, `examples/support.js`, `_ds_manifest.json`, `_adherence.oxlintrc.json`, `examples/_ds/**`, `.thumbnail`, `_exploration` | Internal/generated — inspect only |

---

## 3. Color palette

### Neutrals (`--gray-1` … `--gray-10`)

Deepest canvas `#0c0e10` → warm-white headline `#e8e6e1`.

### Accents

- Gold/amber `--gold-4` `#c9962f` — primary commands, selection, brand accent.
- Cyan `#3fb6a8` — info, links, friendly.
- Olive `#8a9a5f` — success / terrain-adjacent positive.
- Rust/red `#c9564a` — danger / destructive.

### Semantic surfaces / text / borders

See `src/design-system/tokens.css` — mirrors Atlas semantic aliases (`--surface-*`, `--text-*`, `--border-*`, `--accent-*`).

Warning tone uses gold (`--accent-warning` → `--gold-5`) — Atlas did not define a separate warning family; Civ Browser maps “warning/placeholder” badges to gold.

---

## 4. Typography

| Role | Family | Notes |
|---|---|---|
| Display / brand | Source Serif 4 | Wordmark, page titles |
| UI | IBM Plex Sans | Buttons, labels, body |
| Data | IBM Plex Mono | IDs, timers, meta |

Scale: 11–44px (`--text-size-2xs` … `--text-size-4xl`). Weights 400/500/600/700. Labels often ALL CAPS + wide tracking.

Fonts load via Google Fonts CDN (same substitution as Atlas; no local brand font files).

---

## 5. Spacing, radius, layout

- 4px rhythm: `--space-1` (2px) … `--space-12` (72px).
- Radii: sm 4px, md 6px, lg 10px, pill 999px.
- Hit target min: 32px.
- Content max width (shell pages): 720px.
- Panel widths: 280 / 340 / 420px (reserved for later HUD).

---

## 6. Borders, shadows, motion

- Hairline borders on panels/cards/inputs.
- Shadows: dark, tight (`--shadow-sm/md/lg`); focus ring gold.
- Transitions: `--duration-fast` 100ms, `--ease-out`. Respect `prefers-reduced-motion`.

---

## 7. Z-index (Civ Browser interpretation)

Atlas tokens did not publish a z-index scale. Production uses:

`--z-base` 0 · `--z-panel` 10 · `--z-sticky` 50 · `--z-dropdown` 100 · `--z-modal` 1000 · `--z-toast` 1100.

---

## 8. Components (production)

Implemented under `src/components/ui/`:

Button (primary/secondary/ghost/danger × sm/md/lg), IconButton, Card/CardLink, Panel, Badge, Input, Tabs, PageHeader, SectionHeader, EmptyState, Dialog (Esc to close), ConfirmDialog, FormField, Accordion, SegmentedControl.

F8 also uses `ParameterField` (`src/components/rules/ParameterField.tsx`) for labeled numeric/percentage balance parameters with changed badges and reset-field actions.

States: hover, active/pressed (primary), disabled, focus-visible. Toast/Tooltip deferred until a screen needs them.

---

## 9. Iconography

Atlas substitutes Lucide via CDN. D1 does not ship Lucide or emoji icons in the app shell — actions use text labels. Future HUD work may add Lucide or a custom set; replace the substitution when a real icon pack exists.

No logo asset was provided; wordmark is typeset.

---

## 10. Layout / navigation

Non-editor screens use `AppShell`: sticky top bar (brand + nav), centered content column. World Editor (F6) uses a full-viewport shell: compact top command bar, dominant map canvas, ~360px right panel with View/Edit + Tiles/Cities/Display/Sim sections.

---

## 11. Accessibility

- Visible `:focus-visible` rings (`--shadow-focus`).
- Semantic buttons/links; IconButton requires `aria-label`.
- Contrast: light text on dark graphite; gold buttons use dark on-accent text.
- Reduced-motion media query zeroes duration tokens.
- Dialogs close on Escape; segmented controls expose `role="tablist"`.

---

## 12. Caveats (from Atlas readme)

- No original Figma/product screens were attached to the generation; treat Atlas as a strong starting point.
- Fonts and Lucide are substitutions.
- Reconcile when brand assets or real mockups arrive.
