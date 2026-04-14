# Build Pipeline

The popup UI is built with Vite under `src/ui` and merged into the extension output at `dist/ui/index.html`.

## Dependencies

Declared in `package.json` (all as `devDependencies`):

| Package | Purpose |
|---------|---------|
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
| `@types/webextension-polyfill` ^0.12 | WebExtension types |
| `ts-node` ^10.9 | TS execution for webpack config |

## Webpack Configuration (Background)

File: `webpack.config.ts`

```typescript
{
  entry: "./src/background/index.ts",
  output: {
    filename: "background.js",
    path: path.resolve(__dirname, "dist"),
    clean: false   // UI output merges into the same dist/ root
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

The root build scripts delegate directly to the `src/ui` package:

- `npm run dev:ui` -> `cd src/ui && npm run dev`
- `npm run build:ui` -> `cd src/ui && npm run build`
- `npm run test:ui` -> `cd src/ui && npm run typecheck`

The runtime output contract does not change:

- UI assets end up under `dist/ui/`
- popup entry file remains `dist/ui/index.html`
- background webpack output stays in `dist/`

## npm Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `concurrently "npm run dev:background" "npm run dev:ui"` | Development with background/UI watch lanes |
| `dev:background` | `webpack --watch --mode=development` | Background-only watch |
| `dev:ui` | `cd src/ui && npm run dev` | UI dev/watch entry point |
| `build` | `npm run build:background && npm run build:ui && npm run merge:ui` | Full production build |
| `build:background` | `webpack --mode=production` | Background only |
| `build:ui` | `cd src/ui && npm run build` | UI only |
| `merge:ui` | `node scripts/merge-dist.mjs` | Copy the built UI into `dist/ui/` |
| `package` | `npm run build && cd dist && zip -r ../corvus.xpi * -x '*.map'` | Build + XPI |
| `lint` | `npm run lint:background` | Background lint default |
| `lint:background` | `eslint src/ --ext .ts` | Lint background TypeScript |
| `lint:fix` | `npm run lint:background -- --fix` | Background lint with auto-fix |
| `lint:ui` | Optional UI lint entry point when a UI ESLint config exists | Lint UI files |
| `test` | `npm run test:background` | Background tests default |
| `test:background` | `jest --coverage` | Background tests with coverage |
| `test:watch` | `jest --watch` | Background tests in watch mode |
| `test:ui` | `cd src/ui && npm run typecheck` | UI verification gate |

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
    index.html            # Vite UI entrypoint
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
2. Vite UI build in `src/ui`
3. merge-dist.mjs (copy UI output -> dist/ui/)
4. zip (dist/ -> corvus.xpi)
```

Steps 1 and 2 are independent and run sequentially in `npm run build`. The `dev` script runs them in parallel with separate background and UI lanes via `concurrently`.
