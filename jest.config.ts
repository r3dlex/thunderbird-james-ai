import type { Config } from "jest"

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src/background"],
  testMatch: ["**/__tests__/**/*.ts", "**/*.test.ts", "**/*.spec.ts"],
  moduleNameMapper: {
    "^@corvus/(.*)$": "<rootDir>/src/$1",
  },
  collectCoverageFrom: [
    "src/background/**/*.ts",
    "!src/background/**/*.d.ts",
    "!src/background/index.ts",
  ],
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80,
    },
    "./src/background/rules/": {
      lines: 90,
      functions: 90,
    },
    "./src/background/storage/crypto.ts": {
      lines: 100,
      functions: 100,
    },
  },
  coverageReporters: ["text", "lcov", "json-summary"],
}

export default config
