# Vue Rewrite Phase 0/1 Guardrails

## Status

Approved rewrite plan for the staged Angular 19 -> Vue 3 + PrimeVue + Tailwind CSS + Vite migration.

This document is the repo-local handoff for the approved Phase 0/1 work. The detailed planning artifacts remain in `.omx/plans/prd-thunderbird-james-ai-vue3-rewrite.md` and `.omx/plans/test-spec-thunderbird-james-ai-vue3-rewrite.md`.

## Locked Runtime Contracts

These contracts are already source-backed and must not change during Phase 0/1:

- `manifest.json`
  - `action.default_popup = "ui/index.html?page=chat"`
  - `message_display_action.default_popup = "ui/index.html?page=msgDisplay"`
  - `compose_action.default_popup = "ui/index.html?page=compose"`
- `src/background/index.ts`
  - UI/background request shape stays `messenger.runtime.sendMessage({ type, payload })`
  - streaming stays `messenger.runtime.connect({ name: "corvus-stream" })`
- `src/ui/`
  - stays a nested UI package during the migration
- Packaging contract
  - final popup artifact remains `dist/ui/index.html`
  - background output and static assets remain rooted in `dist/`

## Current Code Review Findings

### Stable and reusable

- The popup entry contract is already query-param based in `manifest.json`, which matches the rewrite plan.
- `BridgeService` already centralizes the two critical UI/background contracts:
  - request/response via `sendMessage`
  - streaming via `corvus-stream`
- The background entrypoint provides a finite set of message handlers that can be documented and migrated without changing runtime behavior.

### Migration debt to address in Phase 1

- Root scripts still hard-code Angular:
  - `npm run dev`
  - `npm run build`
  - `npm run build:ui`
  - `npm run test:ui`
- `scripts/merge-dist.mjs` is Angular-specific and only copies from `src/ui/dist/corvus-ui/browser`.
- `spec/build.md`, `README.md`, and `CLAUDE.md` describe an Angular-only UI pipeline, which is stale once Vue work starts.
- The current Angular router uses path-based routes (`chat`, `assistant`, `settings`, `compose`), while the rewrite requires `page` query params to remain the only popup entry authority.

## Baseline Verification Snapshot

Observed on 2026-04-14 before any Vue implementation landed:

- `npx tsc --noEmit` passes at the repo root
- `npm run lint` passes at the repo root
- `npm test -- --runInBand` exits successfully but reports `No tests found`
- `npm run build` fails after the background build succeeds because Angular UI build resolution is broken:
  - `Could not find the '@angular-devkit/build-angular:application' builder's node package`

Treat that Angular build failure as migration debt to replace, not as a contract to preserve.

## Phase 0/1 Implementation Guardrails

1. Keep `src/ui` as a nested package with its own UI toolchain config.
2. Keep the root package responsible for:
   - background webpack build
   - manifest/icons/locales packaging
   - dist assembly
   - final XPI packaging
3. Move UI builds to Vite with:
   - relative asset paths
   - explicit UI output directory
   - no cleanup that can delete non-UI files in `dist/`
4. Make `scripts/merge-dist.mjs` framework-agnostic:
   - accept a UI build output directory
   - copy into `dist/ui`
   - preserve existing background artifacts
5. Treat query params as the popup entry contract:
   - direct popup entries: `chat`, `msgDisplay`, `compose`
   - internal states only: `assistant`, `settings`
6. Preserve the `sendMessage` and `corvus-stream` contracts exactly until a later parity-backed change explicitly updates both the background and tests.
7. Do not remove Angular sources or dependencies until Vue parity is verified.

## Recommended Documentation Follow-Through

- Keep this document updated as the repo-local migration summary.
- Update root docs first when workflow changes:
  - `CLAUDE.md` for agent/operator quick reference
  - `README.md` for human-facing setup and architecture notes
- Update detailed specs only after implementation lands so they describe the actual active toolchain, not the intended future state.

## Verification Expectations During the Rewrite

Phase 0/1 is not complete unless the repo can prove all of the following:

1. lint covers `.vue` files
2. UI tests run without Angular CLI dependencies on the critical path
3. build emits `dist/ui/index.html` with relative assets
4. package/XPI assembly still includes background output plus popup assets
5. popup entry URLs still work for:
   - `ui/index.html?page=chat`
   - `ui/index.html?page=msgDisplay`
   - `ui/index.html?page=compose`
