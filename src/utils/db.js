const mongoose = require('mongoose');
const config = require('../config/config');
const logger = require('./logger');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(config.mongodbUri, {
            // MongoDB driver options
        });

        logger.info(`MongoDB Connected: ${conn.connection.host}`);

        // Log when connection is disconnected
        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB connection disconnected');
        });

        // Log when connection is reconnected
        mongoose.connection.on('reconnected', () => {
            logger.info('MongoDB connection reestablished');
        });

        // Log when connection throws an error
        mongoose.connection.on('error', (err) => {
            logger.error(`MongoDB connection error: ${err.message}`);
        });

        return conn;
    } catch (error) {
        logger.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
