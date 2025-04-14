module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/src/**/__tests__/**/*.test.js'], // Unit tests in src/
    setupFiles: ['<rootDir>/tests/setupTests.js'],
    globalTeardown: '<rootDir>/tests/globalTeardown.js',
    collectCoverage: true,
    coverageDirectory: 'coverage/unit',
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
