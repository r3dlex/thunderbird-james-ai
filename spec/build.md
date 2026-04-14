# Build Pipeline

Note: the UI is in a staged Angular -> Vue/Vite migration. The root package now treats the UI build as framework-aware infrastructure and keeps the final output contract stable at `dist/ui/index.html`.

## Dependencies

Declared in `package.json` (all as `devDependencies`):

| Package | Purpose |
|---------|---------|
| `@angular/cli` ^19.0 | Legacy Angular build toolchain during the staged rewrite |
| `@angular/core` ^19.0 | Angular framework |
| `@angular/forms` ^19.0 | Reactive forms |
| `@angular/router` ^19.0 | View routing |
| `@angular/platform-browser` ^19.0 | Browser platform |
| `@angular/platform-browser-dynamic` ^19.0 | JIT bootstrap (dev only) |
| `@angular/compiler-cli` ^19.0 | AOT compiler |
| `typescript` ^5.7 | TypeScript compiler |
| `webpack` ^5.97 | Background bundler |
| `webpack-cli` ^6.0 | Webpack CLI |
| `ts-loader` ^9.5 | TypeScript loader for webpack |
| `copy-webpack-plugin` ^12.0 | Copy static assets to dist |
| `concurrently` ^9.0 | Parallel background/UI dev runner |
| `jest` ^29.7 | Test runner |
| `ts-jest` ^29.2 | Jest TypeScript support |
| `@types/jest` ^29.5 | Jest type definitions |
| `eslint` ^9.0 | Linter |
| `@typescript-eslint/eslint-plugin` ^8.0 | TS lint rules |
| `@typescript-eslint/parser` ^8.0 | TS parser for ESLint |
| `marked` ^15.0 | Markdown rendering |
| `dompurify` ^3.2 | HTML sanitization |
| `@types/dompurify` ^3.2 | DOMPurify types |
| `@types/webextension-polyfill` ^0.12 | WebExtension types |
| `rxjs` ^7.8 | Reactive extensions (Angular dep) |
| `zone.js` ^0.15 | Angular zone.js |
| `ts-node` ^10.9 | TS execution for webpack config |

## Webpack Configuration (Background)

File: `webpack.config.ts`

```typescript
{
  entry: "./src/background/index.ts",
  output: {
    filename: "background.js",
    path: path.resolve(__dirname, "dist"),
    clean: false   // Angular output merges into same dist/
  },
  resolve: {
    extensions: [".ts", ".js"]
  },
  module: {
    rules: [{
      test: /\.ts$/,
      use: "ts-loader",
      exclude: /node_modules|src\/ui/
    }]
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "manifest.json", to: "manifest.json" },
        { from: "icons/", to: "icons/" },
        { from: "_locales/", to: "_locales/" }
      ]
    })
  ],
  devtool: "source-map"
}
```

Key points:
- Single entry point at `src/background/index.ts`
- Excludes `src/ui/` from ts-loader (the UI keeps its own build toolchain)
- Copies manifest, icons, and locales to `dist/`
- Source maps enabled for development

## UI Build Configuration

During the staged rewrite, the root build scripts support either:

- a `src/ui` package `build` / `dev` / `test` / `lint` script surface
- a Vite config discovered inside `src/ui`
- the legacy Angular CLI fallback while parity work is still in flight

The runtime output contract does not change:

- UI assets end up under `dist/ui/`
- popup entry file remains `dist/ui/index.html`
- background webpack output stays in `dist/`

## Legacy Angular CLI Configuration

Located at `src/ui/angular.json`. Key settings:

| Setting | Value | Reason |
|---------|-------|--------|
| `outputHashing` | `none` | Extension files are not served via CDN |
| `aot` | `true` | Required -- no eval()/Function() allowed |
| `budgets[0].maximumWarning` | `500kb` | Keep popup bundle small |
| `outputPath` | `dist/corvus-ui` | Merged into `dist/ui/` post-build |

## npm Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `concurrently "npm run dev:background" "npm run dev:ui"` | Development with background/UI watch lanes |
| `dev:background` | `webpack --watch --mode=development` | Background-only watch |
| `dev:ui` | framework-aware UI dev entry point | UI dev/watch entry point |
| `build` | `npm run build:background && npm run build:ui && npm run merge:ui` | Full production build |
| `build:background` | `webpack --mode=production` | Background only |
| `build:ui` | framework-aware UI build entry point | UI only |
| `merge:ui` | `node scripts/merge-dist.mjs` | Copy the built UI into `dist/ui/` |
| `package` | `npm run build && cd dist && zip -r ../corvus.xpi * -x '*.map'` | Build + XPI |
| `lint` | `npm run lint:background` | Background lint default |
| `lint:background` | `eslint src/ --ext .ts` | Lint background TypeScript |
| `lint:fix` | `npm run lint:background -- --fix` | Background lint with auto-fix |
| `lint:ui` | framework-aware UI lint entry point | Lint UI files |
| `test` | `npm run test:background` | Background tests default |
| `test:background` | `jest --coverage` | Background tests with coverage |
| `test:watch` | `jest --watch` | Background tests in watch mode |
| `test:ui` | framework-aware UI test entry point | UI tests |

## Post-Build Merge

Script: `scripts/merge-dist.mjs`

Copies the active UI build output into `dist/ui/` without deleting background assets from `dist/`. The script can take an explicit source directory via `CORVUS_UI_DIST_DIR`, otherwise it auto-detects a directory containing `index.html` under `src/ui/dist/`.

This produces the final extension layout:

```
dist/
  background.js           # Webpack output
  background.js.map
  manifest.json           # Copied by webpack
  icons/                  # Copied by webpack
  _locales/               # Copied by webpack
  ui/
    index.html            # UI entrypoint (Angular or Vite)
    ...                   # UI assets
```

## XPI Packaging

The `package` script produces `corvus.xpi` at the project root:

1. Runs full `build`
2. `cd dist && zip -r ../corvus.xpi * -x '*.map'`
3. Source maps are excluded from the XPI

The XPI can be installed in Thunderbird via Add-ons Manager > Install Add-on From File.

## Build Order

```
1. webpack (background.js + static assets -> dist/)
2. framework-aware UI build (`src/ui` package script, Vite, or legacy Angular fallback)
3. merge-dist.mjs (copy UI output -> dist/ui/)
4. zip (dist/ -> corvus.xpi)
```

Steps 1 and 2 are independent and run sequentially in `npm run build`. The `dev` script runs them in parallel with separate background and UI lanes via `concurrently`.
