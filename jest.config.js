module.exports = {
    testEnvironment: 'node',
    // Removed testMatch to delegate to specific Jest configurations
    setupFiles: ['<rootDir>/tests/setupTests.js'],
    globalTeardown: '<rootDir>/tests/globalTeardown.js',
    collectCoverage: true,
    coverageDirectory: 'coverage',
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
    testTimeout: 10000,
    detectOpenHandles: true,  // Enable to detect resources that weren't properly closed
    forceExit: true,          // Force Jest to exit after tests complete (temporary solution)
    verbose: true,            // Enable more detailed output for debugging
    injectGlobals: true,      // Disable globals that might cause side effects
    // maxConcurrency: 1,     // Run tests sequentially to avoid resource conflicts
    // maxWorkers: 1,         // Use a single worker for better stability
};
