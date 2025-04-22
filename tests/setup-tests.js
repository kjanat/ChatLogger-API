const mongoose = require('mongoose');
const { connectionPromise } = require('../src/server');

// Set required environment variables for testing if they don't exist
if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests';
    console.log('[Test Env Setup] Setting JWT_SECRET for unit tests');
}

jest.mock('dotenv', () => {
    const originalModule = jest.requireActual('dotenv');
    console.log('[Test Env Setup] Mocking dotenv.config()');
    return {
        ...originalModule,
        config: jest.fn(), // Mock the config function globally
    };
});

// Connect to the in-memory database before all tests in a suite
beforeAll(async () => {
    console.log('[Test Env Setup] Waiting for server and DB connection...');
    await connectionPromise; // Wait for the server and DB to be ready
    console.log('[Test Env Setup] Server and DB connection ready.');

    // Optional: Verify connection state after awaiting
    if (mongoose.connection.readyState === 1) {
        console.log('[Test Env Setup] Mongoose connection confirmed.');
    } else {
        console.error(`[Test Env Setup] Mongoose connection failed! State: ${mongoose.connection.readyState}`);
        // Optionally throw an error if connection is critical
        // throw new Error('Mongoose connection failed in setup-tests.js');
    }
});

// Clear all collections after each test
afterEach(async () => {
    if (mongoose.connection.readyState !== 1) {
        console.warn('[Test Env Setup] No Mongoose connection to clear after test.');
        return;
    }
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        try {
            await collections[key].deleteMany({});
        } catch (error) {
             console.error(`[Test Env Setup] Error clearing collection ${key}:`, error);
             // Decide if you want to throw or just warn
        }
    }
    // console.log('[Test Env Setup] Cleared collections after test.');
});

// Disconnect Mongoose after all tests in a suite
afterAll(async () => {
    // The connection is managed by the server import now.
    // We might not need to explicitly disconnect here if the server teardown handles it,
    // but it shouldn't hurt if done carefully.
    if (mongoose.connection.readyState === 1) {
        await mongoose.disconnect();
        console.log('[Test Env Setup] Mongoose disconnected via setup-tests.js afterAll.');
    } else {
        console.warn('[Test Env Setup] Mongoose connection already closed before afterAll in setup-tests.js.');
    }
});

console.log('[Test Env Setup] setupFilesAfterEnv script finished executing its top-level code.');
