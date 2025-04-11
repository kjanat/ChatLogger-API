const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Set default environment variable
const defaultenv = 'development';
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = defaultenv;
}

// Set mongoDB URI based on the environment
if (process.env.NODE_ENV === 'production') {
    process.env.MONGODB_URI = process.env.MONGODB_URI_PRD;
} else /*if (process.env.NODE_ENV === 'development') */ {
    process.env.MONGODB_URI = process.env.MONGODB_URI_DEV;
}

// Export configuration variables
module.exports = {
    port: process.env.PORT || 3000,
    mongodbUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET,
    nodeEnv: process.env.NODE_ENV || defaultenv,
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
};
