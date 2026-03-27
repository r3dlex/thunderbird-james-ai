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
  coverageReporters: ["text", "lcov", "json-summary"],
  passWithNoTests: true,
}

export default config
