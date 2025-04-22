import app from './app';
import connectDB from './utils/db';
import config from './config/config';
import logger from './utils/logger';

let server: import('http').Server;

async function startServer() {
    // Connect to MongoDB
    await connectDB();

    // Start server - listen on all available network interfaces (e.g. 0.0.0.0)
    server = app.listen(config.port, () => {
        logger.info(`Server is up and running!`);
        logger.info(`Environment: ${config.nodeEnv}`);
        logger.info(`Base URL: ${config.protocol}://${config.host}:${config.port}`);
        logger.info(`API Docs: ${config.protocol}://${config.host}:${config.port}${config.apiDocumentationUrl}`);
        logger.info(`Swagger Docs: ${config.protocol}://${config.host}:${config.port}${config.apiDocumentationPath}`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err: Error) => {
        logger.error(`Error: ${err.message}`);
        // Close server & exit process
        server.close(() => process.exit(1));
    });
}

// Initialize the connection promise
const connectionPromise: Promise<void> = startServer();

// Export the server instance and the connection promise
export { server, connectionPromise };
