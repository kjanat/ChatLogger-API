const mongoose = require('mongoose');
const config = require('../config/config');
const logger = require('./logger');

const connectDB = async () => {
    try {
        // logger.info(`Attempting to connect to MongoDB at URI: ${config.mongodbUri}`);

        const conn = await mongoose.connect(config.mongodbUri);

        logger.info(`MongoDB Connected: '${conn.connection.host}'`);
        return conn;
    } catch (error) {
        logger.error(`Error connecting to MongoDB at URI: '${config.mongodbUri}'`);
        logger.error(`Connection error: ${error.message}`);
        process.exit(1);
    }
};

mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB connection disconnected');
});

mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB connection reestablished');
});

mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB connection error: ${err.message}`);
});

module.exports = connectDB;
