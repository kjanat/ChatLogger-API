import mongoose from 'mongoose';
import config from '../config/config';
import logger from './logger';

const connectDB = async (): Promise<void> => {
    try {
        // logger.info(`Attempting to connect to MongoDB at URI: ${config.mongodbUri}`);

        const conn = await mongoose.connect(config.mongoUri);

        logger.info(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error connecting to MongoDB: ${errorMessage}`);
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

export default connectDB;
