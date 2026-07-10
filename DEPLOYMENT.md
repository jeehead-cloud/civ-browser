# Civ Browser — Deployment and Operations

**Status:** Not deployed yet (local development only)
**Last updated:** 2026-07-10
**Repository:** `https://github.com/jeehead-cloud/civ-browser`
**Local repository path:** `C:\Projects\civ-browser`

> This document is the operational source of truth for running and (eventually) deploying Civ Browser.
> As of this writing, there is **no production deployment** — everything runs locally via `npm run dev`. This document records the current local workflow and the open questions that need answers before shipping anywhere public.

---

## 1. Current State: Local-Only

There is currently exactly one way to run this project: locally, on the owner's machine, via Vite's dev server.

```powershell
cd C:\Projects\civ-browser
npm install
npm run dev
```

This prints a local URL (typically `http://localhost:5173/`) to open in a browser. Hot reload is active — most Cursor-driven code changes appear automatically after saving; a manual browser refresh (`F5`) is only needed for structural changes (e.g. `index.html`, `vite.config.ts`) or if something seems stuck.

There is no staging environment, no production environment, and no CI/CD pipeline yet.

---

## 2. Why Deployment Is Simple When It Happens

Civ Browser has **no backend** — the entire game (map, cities, civilizations, turn simulation) runs client-side in the browser, and persistence is a manual JSON file export/import. This means:

- `npm run build` produces a static `dist/` folder (HTML/JS/CSS + no server-side code);
- deployment, whenever it happens, is "upload a static folder to a static host" — no server process, no database, no environment secrets to manage;
- almost any static hosting provider will work: Vercel, Netlify, GitHub Pages, Cloudflare Pages, etc.

This simplicity is **conditional on staying single-player and backend-free**. If a future milestone adds real multiplayer, server-authoritative state, or persistent cloud saves, this document (and the "no backend" architectural decision in `ARCHITECTURE.md`) will need to be revisited.

---

## 3. Open Decisions (TBD)

The following have **not** been decided yet and are recorded here specifically so the owner can pick a stack-compatible hosting option later, rather than the choice being made ad hoc by whichever AI agent happens to be asked:

- **Hosting provider**: not chosen. Any static host works given the current stack (see above). No provider-specific configuration exists in the repo yet (no `vercel.json`, no `netlify.toml`, no GitHub Actions workflow).
- **Custom domain**: not decided.
- **Whether a backend will ever be needed**: not decided. If/when multiplayer, cloud saves, or server-validated turns are introduced, this document must be rewritten with real infrastructure (a runtime service, a database, environment variables, migration workflow, etc.), following a similar structure to how such things are documented in the owner's other projects.

**Do not pick a hosting provider or add deployment configuration files without explicit instruction from the owner** — this avoids ending up with mismatched or half-configured deployment setups across the owner's several parallel projects.

---

## 4. Build Verification (Do This Before Any Future Deploy)

Even without a deployment target yet, it's useful to periodically confirm the production build actually works:

```powershell
cd C:\Projects\civ-browser
npm run build
npm run preview
```

`npm run preview` serves the built `dist/` folder locally so you can sanity-check the production build (not just the dev server) in a browser.

---

## 5. Repository / Git

```text
Repository: civ-browser
Remote: https://github.com/jeehead-cloud/civ-browser.git
Main branch: main
Local path: C:\Projects\civ-browser
```

Standard flow for pushing changes (no deployment step attached yet):

```powershell
git add .
git commit -m "<descriptive message>"
git push origin main
```

There are no branch protection rules, no required reviews, and no deployment triggers tied to pushes at this time — pushing to `main` only updates GitHub, nothing else.

---

## 6. When This Document Needs a Rewrite

Update this document as soon as any of the following becomes true:

- a hosting provider is chosen (record the provider, the production URL, the build command/output directory, and any environment variables);
- a custom domain is configured;
- a CI/CD workflow (e.g. GitHub Actions) is added;
- a backend, database, or any server-side component is introduced (this will also require updates to `ARCHITECTURE.md` and possibly `PRODUCT_RULES.md`).

Until then, this document intentionally stays short — there's nothing to operate yet.

---

## Guiding Rule

**Don't invent deployment infrastructure the project doesn't have yet. Keep this document honest about the current (local-only) state, and let the owner make the hosting decision explicitly when they're ready.**
