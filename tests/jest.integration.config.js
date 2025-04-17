module.exports = {
    testEnvironment: 'node',
    testMatch: ['<rootDir>/tests/integration/**/*.test.js'], // Integration tests in tests/integration
    setupFiles: ['<rootDir>/tests/integrationSetup.js'], // Changed to use our new setup file
    globalTeardown: '<rootDir>/tests/globalTeardown.js',
    collectCoverage: false, // Disable coverage for integration tests
    coverageDirectory: '<rootDir>/coverage/integration',
    coverageThreshold: {
        global: {
            branches: 75,
            functions: 75,
            lines: 75,
            statements: 75,
        },
    },
    clearMocks: true,
    restoreMocks: true,
    testTimeout: 20000, // Longer timeout for integration tests
    detectOpenHandles: true,
    forceExit: true,
    verbose: true,
    injectGlobals: true,
};
