const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const logger = require('../src/utils/logger');
require('dotenv').config();

// Set required environment variables for testing if they don't exist
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests';
  logger.info('Setting JWT_SECRET for integration tests');
}

// Ensure we're in test environment
process.env.NODE_ENV = 'test';

let mongoServer;

// Setup function to be called in beforeAll
const setupDatabase = async () => {
  logger.info('Creating the MongoDB Memory Server');
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Use the in-memory MongoDB server URI
  process.env.MONGODB_URI = mongoUri;
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri);
  logger.info('Connected to in-memory MongoDB server');
  return mongoUri;
};

// Clean up function to be called in beforeEach
const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
};

// Teardown function to be called in afterAll
const teardownDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('Disconnected from in-memory MongoDB server');
  }
  if (mongoServer) {
    await mongoServer.stop();
    logger.info('Stopped MongoDB Memory Server');
  }
};

// Export functions to be used in tests
module.exports = {
  setupDatabase,
  clearDatabase,
  teardownDatabase
};
