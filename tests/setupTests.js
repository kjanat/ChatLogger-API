const dotenv = require('dotenv');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const logger = require('../src/utils/logger');

// Set required environment variables for testing if they don't exist
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests';
  logger.info('Setting JWT_SECRET for unit tests');
}

jest.mock('dotenv', () => {
    const originalModule = jest.requireActual('dotenv');
    return {
        ...originalModule,
        config: jest.fn(), // Mock the config function globally
    };
});

let mongoServer;

// Create a function to connect to the in-memory database
module.exports = async () => {
    // Make sure we don't already have an active connection
    if (mongoose.connection.readyState !== 0) {
        logger.info('MongoDB connection already established');
        return;
    }
    
    // Create the MongoDB Memory Server
    logger.info('Creating the MongoDB Memory Server');
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    try {
        await mongoose.connect(uri);
        logger.info('Connected to in-memory MongoDB server');
    } catch (error) {
        logger.error('Error connecting to in-memory MongoDB:');
        throw error;
    }
};

// Clear all collections between tests
module.exports.clearDatabase = async () => {
    if (mongoose.connection.readyState !== 1) {
        logger.info('No active connection to clear');
        return;
    }
    
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
    }
};

// Close the database and server after tests
module.exports.closeDatabase = async () => {
    if (mongoose.connection.readyState === 0) {
        logger.warn('MongoDB connection already closed');
        return;
    }
    
    try {
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
        logger.info('MongoDB connection closed');
        
        if (mongoServer) {
            await mongoServer.stop();
            logger.info('MongoDB memory server stopped');
        }
    } catch (error) {
        logger.error('Error closing MongoDB connection:');
        throw error;
    }
};
