# Vue Rewrite Wave 1 Verification Baseline

## Purpose

This document records the verification baseline for the approved Angular 19 -> Vue 3 + PrimeVue + Tailwind CSS + Vite rewrite.

It is intentionally limited to Phase 0/1 verification concerns:

- current command evidence
- package/build/test topology
- known failure causes
- expected verification gates for the Vite migration

The source-of-truth plan remains:

- `.omx/plans/prd-thunderbird-james-ai-vue3-rewrite.md`
- `.omx/plans/test-spec-thunderbird-james-ai-vue3-rewrite.md`

## Baseline command evidence

Captured on 2026-04-14 from the repository root.

| Command | Result | Notes |
| --- | --- | --- |
| `npm run lint` | PASS | Current ESLint scope is `src/**/*.ts` and excludes `src/ui`, `.vue`, and `src/types`. |
| `npx tsc --noEmit -p tsconfig.json` | PASS | Current root typecheck covers background TypeScript only and excludes `src/ui`. |
| `npm test -- --runInBand` | PASS | Jest exits successfully with `No tests found`; there is no active background test suite yet. |
| `npm run test:ui` | FAIL | `npx ng test` cannot resolve `@angular-devkit/build-angular:karma` because the nested `src/ui` package does not have installed builder dependencies. |
| `npm run build` | FAIL | Root webpack/background build succeeds, then `cd src/ui && npx ng build` fails because `@angular-devkit/build-angular:application` is not available. |

### Observed failure text

`npm run test:ui`

- `Error: Could not find the '@angular-devkit/build-angular:karma' builder's node package.`

`npm run build`

- `webpack 5.105.4 compiled successfully`
- `Error: Could not find the '@angular-devkit/build-angular:application' builder's node package.`

## Current topology findings

### Root package responsibilities

The root package currently owns:

- background webpack build
- manifest/icon/locale copying
- final package orchestration
- XPI packaging

Relevant root scripts still assume Angular for the UI lane:

- `dev`
- `build`
- `build:ui`
- `test:ui`

### Nested UI package state

`src/ui` remains a separate package, which matches the approved rewrite topology.

Current state:

- `src/ui/package.json` exists
- root `node_modules/` exists
- `src/ui/node_modules/` does not exist
- Angular CLI config in `src/ui/angular.json` still defines the active UI build/test entrypoints

### Dist/output state

After the current failed `npm run build`:

- `dist/background.js` exists
- `dist/manifest.json` exists
- `dist/icons/*` exists
- `dist/_locales/*` exists
- `dist/ui/index.html` does not exist

### Merge step coupling

`scripts/merge-dist.mjs` is Angular-specific today:

- expects UI output at `src/ui/dist/corvus-ui/browser`
- copies that exact directory into `dist/ui`
- exits hard if the Angular output path is absent

That coupling must be removed before the Vite migration can be considered verified.

## Locked contracts relevant to verification

These behaviors are already source-backed and should remain stable during Phase 0/1:

- `manifest.json` popup entries:
  - `ui/index.html?page=chat`
  - `ui/index.html?page=msgDisplay`
  - `ui/index.html?page=compose`
- background/UI messaging:
  - `messenger.runtime.sendMessage({ type, payload })`
  - `messenger.runtime.connect({ name: "corvus-stream" })`
- final popup artifact location:
  - `dist/ui/index.html`

## Wave 1 verification gaps

The current repo does not yet prove the required Phase 1 gates:

1. lint coverage for `.vue`
2. UI test coverage that does not depend on Angular CLI builders
3. a successful UI build that emits relative assets
4. a framework-agnostic merge step into `dist/ui`
5. a final build/package path that preserves background artifacts and popup assets together

## Expected Vite verification gates

The first Vue/Vite verification pass should prove all of the following:

1. `build:background` remains independently green
2. `build:ui` emits into an explicit UI output directory without deleting non-UI files in `dist/`
3. built UI assets use relative paths suitable for Thunderbird popup loading
4. merge logic copies the chosen UI output into `dist/ui`
5. `dist/ui/index.html` exists after the root build
6. manifest popup URLs still resolve to the same query-param entrypoints
7. lint and tests include `.vue` sources on the critical path

## Expected command gates after migration

Exact script names may evolve, but the command surface should support these verification gates from the repo root:

1. `npm run lint`
2. `npx tsc --noEmit -p tsconfig.json`
3. `npm test -- --runInBand`
4. `npm run test:ui`
5. `npm run build:background`
6. `npm run build:ui`
7. merge into `dist/ui`
8. `npm run build`
9. `npm run package`

If new UI-specific commands are introduced for Vitest or Vite smoke assertions, keep the root command surface stable enough for CI and team workers to run the same gates without knowing framework internals.

## Recommended verification follow-through

When the Vue toolchain lands, update this document with:

- the final UI build command
- the final UI test command
- the first passing `dist/` tree snapshot that includes `dist/ui/index.html`
- any remaining manual Thunderbird smoke steps for `chat`, `msgDisplay`, and `compose`
