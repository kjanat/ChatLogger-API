const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const logger = require('../src/utils/logger'); // Assuming logger works here

module.exports = async () => {
    console.log('\n[Global Setup] Starting MongoDB Memory Server...');
    const mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    // Store URI and server instance globally for teardown
    global.__MONGOD__ = mongoServer;
    process.env.MONGO_URI_TEST = uri; // Use a specific env var for test URI

    try {
        await mongoose.connect(uri); // Connect mongoose instance for setup if needed
        console.log(`[Global Setup] MongoDB connected at ${uri}`);
        await mongoose.disconnect(); // Disconnect immediately after checking connection
        console.log('[Global Setup] Initial connection check successful, disconnected.');
    } catch (error) {
        console.error('[Global Setup] Error connecting to in-memory MongoDB:', error);
        // Stop the server if connection failed
        await mongoServer.stop(); 
        throw error;
    }
}; 
