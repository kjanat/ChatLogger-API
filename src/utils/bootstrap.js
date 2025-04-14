const dotenv = require('dotenv');

// Directly call dotenv.config() during module initialization
// console.log('dotenv.config is being called');
dotenv.config();

// Set default NODE_ENV if not defined
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
    console.log('[bootstrap] NODE_ENV is set to default: `development`');
}
console.log(`[bootstrap] Current environment: \`${process.env.NODE_ENV}\``);

// Export the current environment
module.exports = {
    nodeEnv: process.env.NODE_ENV
};
