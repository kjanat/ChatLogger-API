const app = require('./app');
const connectDB = require('./utils/db');
const config = require('./config/config');
const logger = require('./utils/logger');

// Connect to MongoDB
connectDB();

// var http = require('http')
// var https = require('https')
// var express = require('express')
// var app = express();
// http.createServer(app).listen(80);
// https.createServer({ ... }, app).listen(443);


// Start server - listen on all available network interfaces (e.g. 0.0.0.0), `${config.host}`
const server = app.listen(config.port, () => {
    logger.info(`Server is up and running!`);
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info(`Base URL: ${config.protocol}://${config.host}:${config.port}`);
    logger.info(`API Docs: ${config.protocol}://${config.host}:${config.port}${config.apiDocumentationUrl}`);
    logger.info(`Swagger Docs: ${config.protocol}://${config.host}:${config.port}${config.apiDocumentationPath}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    logger.error(`Error: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
});

module.exports = server;
