/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  collectCoverage: true,
  clearMocks: true,
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  globalSetup: "./src/test/global-setup.ts",
  globalTeardown: "./src/test/global-teardown.ts",
  setupFilesAfterEnv: ["./src/test/setup-after-env.ts"],
  transform: {
    "^.+.tsx?$": ["ts-jest", {}],
  },
  preset: "@shelf/jest-mongodb",
};
