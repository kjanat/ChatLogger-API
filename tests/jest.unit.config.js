module.exports = {
    testEnvironment: 'node',
    testMatch: ['<rootDir>/src/**/__tests__/*.test.js'],
    setupFiles: ['<rootDir>/tests/setup-tests.js'],
    globalTeardown: '<rootDir>/tests/globalTeardown.js',
    collectCoverage: false, // Disable coverage for unit tests
    coverageDirectory: '<rootDir>/coverage/unit',
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
    detectOpenHandles: true,
    forceExit: true,
    verbose: true,
    injectGlobals: true,
};
