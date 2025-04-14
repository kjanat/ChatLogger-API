const dotenv = require('dotenv');

jest.mock('dotenv', () => {
    const originalModule = jest.requireActual('dotenv');
    return {
        ...originalModule,
        config: jest.fn(), // Mock the config function
    };
});

// Import the module after mocking
const bootstrap = require('../bootstrap');

describe('Bootstrap Module', () => {
    beforeEach(() => {
        delete process.env.NODE_ENV; // Reset NODE_ENV before each test
        jest.resetModules(); // Clear module cache to ensure fresh imports
        // console.log('dotenv module cache:', require.cache[require.resolve('dotenv')]); // Debug log for module cache
        jest.mock('dotenv', () => {
            const originalModule = jest.requireActual('dotenv');
            return {
                ...originalModule,
                config: jest.fn(), // Mock the config function
            };
        }); // Reapply the mock after resetting modules
        jest.clearAllMocks(); // Clear mock calls before each test
    });

    test('should call dotenv.config on import', () => {
        jest.isolateModules(() => {
            const dotenv = require('dotenv');
            jest.mock('dotenv', () => ({
                config: jest.fn(),
            }));

            const bootstrap = require('../bootstrap'); // Import after mocking
            expect(dotenv.config).toHaveBeenCalled(); // Verify the mock tracks the call
        });
    });

    test('should set default NODE_ENV to development if not defined', () => {
        jest.isolateModules(() => {
            delete process.env.NODE_ENV; // Ensure NODE_ENV is undefined
            const bootstrap = require('../bootstrap'); // Re-import the module fresh for each test
            const { nodeEnv } = bootstrap;

            expect(nodeEnv).toBe('development');
        });
    });

    test('should preserve existing NODE_ENV value', () => {
        jest.isolateModules(() => {
            process.env.NODE_ENV = 'test'; // Set a custom NODE_ENV
            const bootstrap = require('../bootstrap'); // Re-import the module fresh for each test
            const { nodeEnv } = bootstrap;

            expect(nodeEnv).toBe('test');
        });
    });

    test('should export nodeEnv matching process.env.NODE_ENV', () => {
        jest.isolateModules(() => {
            process.env.NODE_ENV = 'production'; // Set NODE_ENV to production
            const bootstrap = require('../bootstrap'); // Re-import the module fresh for each test
            const { nodeEnv } = bootstrap;

            expect(nodeEnv).toBe('production');
        });
    });
});
