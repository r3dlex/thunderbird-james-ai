# Vue Rewrite Verification Checklist

## Purpose

This is the execution checklist for the verification lane once the Wave 1 Vue/Vite build changes land.

Use it together with:

- `docs/vue-rewrite-verification-baseline.md`
- `.omx/plans/prd-thunderbird-james-ai-vue3-rewrite.md`
- `.omx/plans/test-spec-thunderbird-james-ai-vue3-rewrite.md`

This checklist intentionally avoids implementation details and focuses on exact commands plus the assertions they must prove.

## Current baseline commands already captured

These are the commands used to capture the current pre-Vite baseline:

```bash
npm run lint
npx tsc --noEmit -p tsconfig.json
npm test -- --runInBand
npm run test:ui
npm run build
find dist -maxdepth 3 | sort
```

## Wave 1 verification runbook

Run these commands from the repository root after worker-1/3 land the UI and build-glue changes.

### 1) Lint gate

```bash
npm run lint
```

Pass condition:

- exits with status `0`
- includes `.vue` files on the active lint path

### 2) Root typecheck gate

```bash
npx tsc --noEmit -p tsconfig.json
```

Pass condition:

- exits with status `0`
- background TypeScript remains green after UI toolchain changes

### 3) Background test gate

```bash
npm test -- --runInBand
```

Pass condition:

- exits with status `0`
- no regressions in background tests

### 4) UI test gate

```bash
npm run test:ui
```

Pass condition:

- exits with status `0`
- no Angular CLI builder dependency remains on the critical path unless intentionally preserved during transition

### 5) Independent background build gate

```bash
npm run build:background
```

Pass condition:

- exits with status `0`
- background artifact generation remains independent from the UI framework

### 6) Independent UI build gate

```bash
npm run build:ui
```

Pass condition:

- exits with status `0`
- UI build emits to the agreed output directory
- non-UI files in `dist/` are not deleted as a side effect

### 7) Merge gate

If merge stays as a standalone step, run:

```bash
node scripts/merge-dist.mjs
```

Pass condition:

- exits with status `0`
- UI output is copied into `dist/ui`
- existing background artifacts remain intact

### 8) Full build gate

```bash
npm run build
```

Pass condition:

- exits with status `0`
- full repo build produces a complete extension-ready `dist/`

### 9) Dist tree snapshot gate

```bash
find dist -maxdepth 3 | sort
```

Pass condition:

- output includes `dist/ui/index.html`
- output still includes `dist/background.js`
- output still includes `dist/manifest.json`
- output still includes icons and locales

### 10) Manifest popup contract gate

```bash
python3 - <<'PY'
import json
from pathlib import Path

manifest = json.loads(Path("manifest.json").read_text())
assert manifest["action"]["default_popup"] == "ui/index.html?page=chat"
assert manifest["message_display_action"]["default_popup"] == "ui/index.html?page=msgDisplay"
assert manifest["compose_action"]["default_popup"] == "ui/index.html?page=compose"
print("popup contract ok")
PY
```

Pass condition:

- prints `popup contract ok`
- popup entry authority remains query-param based

### 11) Relative asset path gate

```bash
python3 - <<'PY'
from pathlib import Path
html = Path("dist/ui/index.html").read_text()
bad = ['src="/', "src='/", 'href="/', "href='/"]
hits = [token for token in bad if token in html]
if hits:
    raise SystemExit(f"absolute asset paths found: {hits}")
print("relative assets ok")
PY
```

Pass condition:

- prints `relative assets ok`
- `dist/ui/index.html` does not reference root-absolute assets

### 12) Packaging gate

```bash
npm run package
```

Pass condition:

- exits with status `0`
- `corvus.xpi` is produced successfully

### 13) Package contents spot-check

```bash
zipinfo -1 corvus.xpi | sort | sed -n '1,120p'
```

Pass condition:

- includes `background.js`
- includes `manifest.json`
- includes `ui/index.html`
- includes expected UI assets

## Manual smoke checklist

Capture notes for these popup entry URLs after the first passing build:

- `ui/index.html?page=chat`
- `ui/index.html?page=msgDisplay`
- `ui/index.html?page=compose`

Also verify:

- assistant internal navigation works
- settings internal navigation works
- popup loads without console/runtime errors

## Reporting format

When running the checklist, report each gate as:

- `PASS <command> -> <key evidence>`
- `FAIL <command> -> <failure cause>`

If a gate fails, include:

1. exact command
2. exit status
3. first actionable failure line
4. whether the failure is a baseline carryover or a new regression
