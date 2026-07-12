---
name: atlas-design
description: Use this skill to generate well-branded interfaces and assets for Atlas, a design system for browser-based strategy and simulation games, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

Notes specific to Atlas:
- This system was built from scratch — no real Atlas codebase, Figma, or brand guideline exists yet. Treat tokens/components/UI kits as a strong starting point, not ground truth; flag this to the user if precision matters.
- No logo exists — never invent one. Render "Atlas" in `--font-display` (Source Serif 4) wherever a mark would go.
- Fonts (Source Serif 4 / IBM Plex Sans / IBM Plex Mono) and icons (Lucide) are CDN-loaded substitutes, not real brand assets — see `readme.md` and `assets/README.md`.
- Keep the game map/canvas visually dominant; UI chrome stays flat, bordered, and quiet (no gradients, no blur, no shadows beyond `--shadow-md`) so it never competes with gameplay content underneath it.
