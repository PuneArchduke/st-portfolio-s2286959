//jest.config.js
module.exports = {
  testTimeout: 20000,
  globalSetup: "./__tests__/setup/setup-local.js",
  globalTeardown: "./__tests__/setup/teardown-local.js",
  modulePathIgnorePatterns: ["./__tests__/setup/*", "./__tests__/performance/*"]
};