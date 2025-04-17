/** @type {import('jest').Config} */
const config = {
    testEnvironment: 'node',
    projects: [
        {
            displayName: 'unit',
            testMatch: ['**/src/**/__tests__/**/*.test.js'],
            setupFiles: ['<rootDir>/tests/setupTests.js'],
            // coverageDirectory: '<rootDir>/coverage/unit',
            restoreMocks: true, // Add this to restore mocks automatically after each test
            resetMocks: false, // Don't reset mocks between tests, but restore their implementation
        },
        {
            displayName: 'integration',
            testMatch: ['**/tests/integration/**/*.test.js'],
            setupFiles: ['<rootDir>/tests/integrationSetup.js'],
            // coverageDirectory: '<rootDir>/coverage/integration',
            restoreMocks: true, // Add this to restore mocks automatically after each test
            resetMocks: false, // Don't reset mocks between tests, but restore their implementation
        },
    ],
    // Common configuration for all test types
    globalTeardown: '<rootDir>/tests/globalTeardown.js',
    collectCoverage: true,
    coverageDirectory: '<rootDir>/coverage',
    coverageThreshold: {
        global: {
            branches: 75,
            functions: 75,
            lines: 75,
            statements: 75,
        },
    },
    clearMocks: true,
    restoreMocks: true, // Global setting as a fallback
    detectOpenHandles: true,
    forceExit: true,
    verbose: true,
    injectGlobals: true,
    testTimeout: 30000, // Global timeout setting
};

module.exports = config;
