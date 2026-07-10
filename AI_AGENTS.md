# Civ Browser — AI Agent Operating Guide

**Status:** Active
**Last updated:** 2026-07-10
**Applies to:** Cursor, Codex, Claude Code, ChatGPT, and other AI coding agents
**Repository:** `https://github.com/jeehead-cloud/civ-browser`
**Local repository path:** `C:\Projects\civ-browser`

> This document is mandatory reading for any AI agent working on Civ Browser.
> It defines how repository context must be verified, how changes must be scoped, and how results must be reported.
>
> **The single most important rule on this project:** the owner works on several unrelated projects in parallel (this is one of them). Every prompt and every response must clearly state which project/repository is being worked on, so a prompt or answer is never accidentally applied to, or confused with, a different project.

---

## 1. Primary Rule

**Never assume you are in the correct repository. Verify it before doing any work, and say so out loud.**

The owner may paste a prompt meant for a different project into this one, or vice versa, or ask a question in a chat session that isn't scoped to this repository. Every task must begin with repository verification, and every response must restate the project name.

---

## 2. Required Repository Context Block in Every Prompt

Every implementation prompt given to Cursor (or another agent) should begin with a block like this:

```text
Repository context

Project: Civ Browser
Repository: civ-browser
Repository path: C:\Projects\civ-browser
Remote: https://github.com/jeehead-cloud/civ-browser.git
Expected branch: main

Current state

<Describe the known working tree state, or say "Expected working tree: clean".>

Task

<Describe the exact task.>

Before making changes, verify:
- current working directory
- git remote -v
- current branch
- git status
- changed files match the stated current state
```

If the prompt refers to another repository, another local path, or another remote, the agent must stop and flag the mismatch instead of guessing.

---

## 3. Mandatory Repository Verification

Before inspecting or editing code, run or verify the equivalent of:

```powershell
Get-Location
git rev-parse --show-toplevel
git remote -v
git branch --show-current
git status --short
```

Expected values:

```text
Project: Civ Browser
Repository: civ-browser
Repository path: C:\Projects\civ-browser
Remote: https://github.com/jeehead-cloud/civ-browser.git
Branch: main
```

### Stop Conditions

Stop immediately and report the mismatch if:

- the repository root is not `C:\Projects\civ-browser`;
- the remote is not `jeehead-cloud/civ-browser`;
- the prompt clearly references another project (e.g. mentions a different tech stack, a different game, or a different repo name);
- the current branch is not `main` and the task didn't explicitly say to use another branch;
- unexpected uncommitted changes exist that don't match the stated current state.

Do not silently continue in a similar-looking repository or assume "this is probably the right one."

---

## 4. Required Header in Every Agent Response

Every substantive response (planning, implementation summary, bug report, or anything that touches code) must begin with:

```text
Repository context

Project: Civ Browser
Repository: civ-browser
Repository path: C:\Projects\civ-browser
Remote: https://github.com/jeehead-cloud/civ-browser.git
Branch: main
Working tree: <clean / dirty>
```

If the working tree is dirty, list the changed files immediately after.

This requirement applies to planning responses, implementation summaries, bug diagnoses, commit/push responses, and failure reports alike — not just "final" answers.

---

## 5. Scope Discipline

### One Prompt = One Task

Each prompt should describe one logical task (e.g. "add a river-painting tool" or "fix the mountain-generation bug"). Do not combine unrelated work (a new gameplay feature + an unrelated refactor + a documentation update) into one prompt unless explicitly requested.

### One Commit = One Logical Change

A commit should be easy to review and revert. Don't mix a gameplay feature with unrelated cleanup, formatting changes, or dependency bumps.

### Do Not Expand Scope Silently

If you notice an adjacent bug or missing piece while working:

1. finish the requested task;
2. report the additional issue clearly;
3. do not fix it unless it blocks the requested work, or the owner explicitly asks.

---

## 6. Before Editing Code

For anything beyond a trivial one-line fix:

1. inspect the relevant files (`src/game/*.ts`, `src/components/*.tsx`) before proposing a change;
2. trace how the data actually flows (e.g. Zustand store → component → canvas render) rather than guessing;
3. check whether a similar helper/pattern already exists (e.g. `growBlob`, `hexLine`, `generateSmoothField` in `mapGenerator.ts`) before writing a new one;
4. for anything involving hex-grid geometry, BFS/graph search, or coordinate math, double-check the logic numerically (a small script, a console.log of intermediate values, or an explicit worked example) rather than trusting a visual read alone — this project has a track record of subtle bugs in exactly this kind of code (see `ARCHITECTURE.md` §"Lessons learned").

Do not begin by editing the first visible file without this quick investigation for non-trivial tasks.

---

## 7. Architecture Principles

Read `ARCHITECTURE.md` before making structural changes. In brief:

- Game data (tiles, cities, civilizations, settings) lives in `src/game/store.ts` (Zustand). UI components read from the store via selectors and dispatch actions — they should not carry their own duplicate copies of game logic.
- Hex-grid math (axial coordinates, flat-top orientation, pixel conversion, neighbor/direction indices) lives in `src/game/hexGrid.ts` — reuse it, don't reimplement it in a component.
- Resource placement rules live in `src/game/resourceData.ts` as declarative rule objects (terrain/vegetation/hills/river conditions + base chance + regional boost) — new resources should be added there, not hardcoded into the generator.
- There is no backend. Do not introduce server calls, accounts, or persistence beyond the existing JSON export/import unless the task explicitly asks for it.

---

## 8. Game Design Rules

Before changing gameplay behavior, read `PRODUCT_RULES.md`. Important examples:

- Hills are a **property** of a tile (`hasHills: boolean`), not a separate terrain type — don't reintroduce `hills` into `TerrainType`.
- Rivers are stored as **edges** (`riverDirections: number[]` per tile, using the same direction indexing as `neighbors()`), not as a tile terrain type or a separate "river tile."
- Resources are chosen via a **single overall roll per tile**, then a weighted pick among matching rules — never roll independently once per resource rule (that produces oversaturated maps; this was a real bug that had to be fixed twice).
- Civilizations always have **exactly one** capital, assigned explicitly by the owner; a city with `civId === null` is a "free/unclaimed" city that can be annexed.
- Growth and culture accumulation happen once per "End Turn," using the formulas in `PRODUCT_RULES.md` — don't invent a different growth curve without updating that document.

---

## 9. Testing and Validation

This is a frontend-only Vite/React/TypeScript project. The standard check is:

```powershell
npm run build
```

Run this after every non-trivial change and report the result honestly:

- `PASS` only if the command was actually run and succeeded;
- `NOT RUN` if it wasn't run;
- `FAIL` with the actual error output if it failed.

There is currently no automated test suite (unit or otherwise) — manual verification in the browser (and, for generation/algorithm bugs, a throwaway Node script computing connectivity or other invariants) is the norm. Do not claim something "works" without actually having looked at it running.

---

## 10. Root Cause Before Fix

For bugs, explain the actual root cause, not just the symptom.

Good:
> The river appeared as disconnected dashes because the code drew each tile's boundary edge in isolation; a tile with two river directions (through-flow) left an empty gap between its two edges. Fixed by drawing from the tile center to each edge midpoint instead, so adjacent tiles' spokes meet exactly at the shared edge.

Weak:
> Fixed the river rendering.

This project has hit several bugs where the symptom and the real cause were not the same thing (e.g. "mountains disappeared" was actually caused by a stage-ordering placeholder-terrain bug, not the mountain code itself). Don't patch symptoms without understanding why they happened.

---

## 11. Commit and Push Rules

Only commit and push when explicitly requested by the owner.

Before committing:

```powershell
git status
git diff --stat
```

Verify:

- only the expected files changed;
- no unrelated files are included;
- `npm run build` passes.

Use a concise, descriptive commit message that mentions the actual feature/fix (not "update files").

---

## 12. Required Implementation Summary

Every completed implementation response should include:

```text
Repository context

Project: Civ Browser
Repository: civ-browser
Repository path: C:\Projects\civ-browser
Remote: https://github.com/jeehead-cloud/civ-browser.git
Branch: main
Working tree: <clean / dirty>

Root cause (for bugs) / Design (for features)
<explanation>

Files changed
- path/to/file
- path/to/file

Behavior
- what changed
- what stayed the same
- known edge cases / limitations

Validation
- npm run build: PASS / FAIL / NOT RUN

Documentation
- CURRENT_STATUS.md updated: yes / no
- Classification: Significant / Routine
- History entry added: <title or "none">

Commit
- hash and message, or "Not committed"
```

---

## 13. Documentation Updates

Update the relevant document when:

- a milestone (M1-M8) changes status or scope → `PROJECT.md` (roadmap table) and `CURRENT_STATUS.md`;
- a game design rule changes (growth formula, resource rules, annexation logic, etc.) → `PRODUCT_RULES.md`;
- the file/data structure changes meaningfully (new store fields, new files, new hex-math helpers) → `ARCHITECTURE.md`;
- a deployment/hosting decision is finally made → `DEPLOYMENT.md`.

Do not let an important rule exist only in chat history — if it matters going forward, write it down in the right file.

---

## 14. End-of-Iteration Documentation Procedure (Mandatory)

**Documentation maintenance is part of the definition of done.** An implementation or meaningful analysis that leaves `CURRENT_STATUS.md` outdated is incomplete. Include documentation updates in the same logical change set — do not defer them to a later prompt.

After every completed implementation prompt or meaningful analysis prompt that changes repository files (or changes how the project should be understood going forward), the agent must:

1. **Inspect the actual final state** — review the real diff and resulting repository state; do not write status from memory or from the prompt alone.
2. **Reconcile the main snapshot in `CURRENT_STATUS.md`** — update milestone status, known limitations, next steps, architecture-relevant state, or other current-state sections whenever they changed. Remove or rewrite statements that became obsolete. Do not blindly append entries on top of stale claims.
3. **Add a concise entry to the Recent Change Log** (rolling 3 months) for every completed iteration that changed repository files. Newest entries first.
4. **Classify the iteration independently** as Routine or Significant (see criteria below). Do not wait for the owner to label it.
5. **If Significant, also add an entry to Significant Change History** (permanent; never delete for age).
6. **Update the `Last updated` date** on `CURRENT_STATUS.md` whenever that file changes.
7. **Report explicitly in the final response:**
   - whether `CURRENT_STATUS.md` was updated;
   - whether the change was classified as Significant or Routine;
   - which history entry was added (title).

### Significant vs Routine — Classification Guidance

Treat a change as **Significant** when it affects one or more of:

- a user-visible feature or major behavior;
- a milestone’s scope, status, or completion;
- architecture, data model, persistence format, or important file structure;
- product/gameplay rules or invariants;
- deployment or operational workflow;
- a major bug or root-cause lesson that future agents must not reintroduce;
- a durable development-process decision;
- a dependency or stack decision with lasting consequences;
- removal, replacement, or substantial redesign of an existing capability.

Normally **not** Significant:

- typo fixes;
- wording polish;
- formatting-only changes;
- small CSS adjustments with no durable UX rule;
- narrowly scoped cleanup that does not change behavior;
- minor bug fixes with no reusable lesson or architectural consequence.

Use judgment. Prefer Significant when a future agent would be misled without a permanent record.

### Retention Rules

- **Recent Change Log** — retain only entries whose dates fall within the most recent **3 calendar months**. Older routine entries may be removed during later updates. Significant items may appear here while recent; their permanent source of truth is Significant Change History.
- **Significant Change History** — permanent. Never remove an entry merely because it is old. Clarify or correct an entry if later evidence shows it was inaccurate.

### What stays where

- Detailed operating instructions for this procedure live in **this file** (`AI_AGENTS.md`).
- `CURRENT_STATUS.md` holds the current-state snapshot, the two history sections, and the maintenance policy — not a duplicate of every rule above.
- The main body of `CURRENT_STATUS.md` remains a **current-state snapshot**, not a chronological changelog. Routine iteration history belongs only in the Recent Change Log.

---

## 15. Final Safety Rule

**If repository context, task scope, or working tree state is ambiguous, stop before editing.**

It is better to ask "which project is this for?" than to make a correct change in the wrong repository, or to silently proceed on a wrong assumption about which of the owner's several projects a message belongs to.
