# Build Pipeline

## Dependencies

Declared in `package.json` (all as `devDependencies`):

| Package | Purpose |
|---------|---------|
| `@angular/cli` ^19.0 | Angular build toolchain |
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
| `concurrently` ^9.0 | Parallel dev script runner |
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
- Excludes `src/ui/` from ts-loader (Angular has its own build)
- Copies manifest, icons, and locales to `dist/`
- Source maps enabled for development

## Angular CLI Configuration (UI)

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
| `dev` | `concurrently "webpack --watch --mode=development" "cd src/ui && npx ng build --watch --configuration=development"` | Development with watch |
| `build` | `webpack --mode=production && cd src/ui && npx ng build --configuration=production && cd ../.. && node scripts/merge-dist.mjs` | Full production build |
| `build:background` | `webpack --mode=production` | Background only |
| `build:ui` | `cd src/ui && npx ng build --configuration=production` | UI only |
| `package` | `npm run build && cd dist && zip -r ../corvus.xpi * -x '*.map'` | Build + XPI |
| `lint` | `eslint src/ --ext .ts` | Lint all TypeScript |
| `lint:fix` | `eslint src/ --ext .ts --fix` | Lint with auto-fix |
| `test` | `jest --coverage` | Background tests with coverage |
| `test:watch` | `jest --watch` | Background tests in watch mode |
| `test:ui` | `cd src/ui && npx ng test --watch=false --code-coverage` | Angular tests |

## Post-Build Merge

Script: `scripts/merge-dist.mjs`

Copies the Angular build output from `src/ui/dist/corvus-ui/browser/` into `dist/ui/`. This produces the final extension layout:

```
dist/
  background.js           # Webpack output
  background.js.map
  manifest.json           # Copied by webpack
  icons/                  # Copied by webpack
  _locales/               # Copied by webpack
  ui/
    index.html            # Angular output
    main.js               # Angular bundle
    polyfills.js
    styles.css
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
2. ng build (Angular -> src/ui/dist/corvus-ui/browser/)
3. merge-dist.mjs (copy Angular output -> dist/ui/)
4. zip (dist/ -> corvus.xpi)
```

Steps 1 and 2 are independent and run sequentially in `npm run build`. The `dev` script runs them in parallel with watch mode via `concurrently`.
