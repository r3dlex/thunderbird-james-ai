import tseslint from "@typescript-eslint/eslint-plugin"
import tsparser from "@typescript-eslint/parser"

export default [
  {
    files: ["src/background/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: "./tsconfig.json",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-eval": "error",
      "no-new-func": "error",
    },
  },
  {
    files: [
      "src/ui/src/**/*.ts",
      "src/ui/src/**/*.mjs",
      "src/ui/vite.config.ts",
      "src/ui/tailwind.config.ts",
      "src/ui/postcss.config.mjs",
    ],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: false,
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-eval": "error",
      "no-new-func": "error",
    },
  },
  {
    ignores: ["dist/", "node_modules/", "src/types/", "**/*.d.ts"],
  },
]
