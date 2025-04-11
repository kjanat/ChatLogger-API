const app = require('./app');
const connectDB = require('./utils/db');
const config = require('./config/config');
const logger = require('./utils/logger');

// Connect to MongoDB
connectDB();

// Start server
const server = app.listen(config.port, () => {
    logger.info(`Server running in ${config.nodeEnv} mode on port ${config.port}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    logger.error(`Error: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
});

module.exports = server;
