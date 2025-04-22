/**
 * Jest configuration file.
 */
module.exports = {
    testEnvironment: 'node',
    globalSetup: '<rootDir>/tests/globalSetup.js',
    globalTeardown: '<rootDir>/tests/globalTeardown.js',
    coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
    testMatch: ['**/__tests__/**/*.test.(js|ts)'],
    // Add TypeScript support
    preset: 'ts-jest',
    transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest',
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    // Ignore specific directories
    transformIgnorePatterns: ['/node_modules/'],
    // Set coverage thresholds
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
        },
    },
    // Coverage reporting options
    collectCoverageFrom: [
        'src/**/*.{js,ts}', 
        '!src/**/*.d.ts',
        '!src/config/**',
        '!**/node_modules/**',
        '!**/coverage/**',
        '!**/tests/**',
        '!**/__tests__/**',
    ],
    // Setup files
    setupFilesAfterEnv: ['<rootDir>/tests/setup-tests.js'], // Restored
    // Extension for test files
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1', // Enables import aliases
    },
};
