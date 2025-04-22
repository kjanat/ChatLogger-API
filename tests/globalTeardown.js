/* global setTimeout */
const mongoose = require('mongoose');

// Global teardown to ensure all connections are closed
module.exports = async () => {
    console.log('\n[Global Teardown] Stopping MongoDB Memory Server...');
    // Mongoose connection should be handled/closed within tests or testEnvironmentSetup
    // await mongoose.disconnect(); // Avoid disconnecting here if tests manage connection

    if (global.__MONGOD__) {
        await global.__MONGOD__.stop();
        console.log('[Global Teardown] MongoDB Memory Server stopped.');
    } else {
        console.warn('[Global Teardown] MongoDB server instance not found.');
    }

    // Handle any other cleanup that might be needed
    // Clear any global timeouts, intervals, or event listeners

    // Give time for any remaining connections to properly close
    await new Promise(resolve => setTimeout(resolve, 500));
};
