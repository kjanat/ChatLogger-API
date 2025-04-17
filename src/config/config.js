const dotenv = require('dotenv');
const logger = require('../utils/logger');

// Load environment variables
dotenv.config();

// Set default NODE_ENV if not defined
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
    console.log('[config] NODE_ENV is set to default: `development`');
}
console.log(`[config] Current environment: \`${process.env.NODE_ENV}\``);

const getMongoDbUri = () => {
    const nodeEnv = process.env.NODE_ENV || 'development';
    logger.info(`NODE_ENV: ${nodeEnv}`);

    // Map NODE_ENV to corresponding suffix
    const envSuffixMap = {
        production: 'PRD',
        staging: 'STG',
        development: 'DEV',
        testing: 'TST',
        test: 'TEST', // Allow 'test' as alias
    };

    const suffix = envSuffixMap[nodeEnv];
    const envSpecificUriVar = suffix ? `MONGODB_URI_${suffix}` : null;

    logger.info(`Environment: ${nodeEnv}`);
    logger.info(`MongoDB URI variable: ${envSpecificUriVar}`);

    // Use base URI if environment-specific one is not defined
    const mongoUri = process.env[envSpecificUriVar] || process.env.MONGODB_URI;
    logger.info(`MongoDB URI: ${mongoUri}`);

    if (nodeEnv === 'test' && !mongoUri) {
        return 'mongodb://127.0.0.1:27017/chatlogger_test';
    }

    if (!mongoUri) {
        const errorMsg = `MongoDB URI is not set. Please configure MONGODB_URI${suffix ? ` or ${envSpecificUriVar}` : ''} in .env file.`;
        logger.error(errorMsg);
        throw new Error(errorMsg);
    }

    logger.info(`Using MongoDB URI from ${envSpecificUriVar || 'MONGODB_URI'}`);
    return mongoUri;
};

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        logger.error('JWT_SECRET is not set. Please configure it in your environment.');
        throw new Error('JWT_SECRET is not set. Please configure it in your environment.');
    }

    logger.debug('Using JWT secret from environment variable');
    return secret;
};

const config = {
    protocol: process.env.PROTOCOL || 'http',
    host: process.env.HOST || 'localhost',
    port: parseInt(process.env.PORT, 10) || 3000,
    mongodbUri: getMongoDbUri(),
    jwtSecret: getJwtSecret(),
    nodeEnv: process.env.NODE_ENV || 'development',
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || (15 * 60 * 1000), // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    apiBasePath: process.env.API_BASE_PATH || 'api',
    apiVersion: process.env.API_VERSION || 'v1',
};

config.apiEffectivePath = `${config.apiBasePath}/${config.apiVersion}`;
config.documentationSlug = process.env.DOCS_PATH || 'docs';
config.documentationUrlSlug = `${config.documentationSlug}.json`;
config.apiDocumentationPath = `/${config.apiBasePath}/${config.documentationSlug}`;
config.apiDocumentationUrl = `${config.apiDocumentationPath}.json`;

if (process.env.NODE_ENV === 'test') {
    config.resetConfigForTests = function () {
        this.mongodbUri = getMongoDbUri();
        this.jwtSecret = getJwtSecret();
        logger.debug('Config reset for tests:', {
            mongodbUriSet: !!this.mongodbUri,
            jwtSecretSet: !!this.jwtSecret,
        });
        return this;
    };
}

logger.debug('Final config loaded:', {
    protocol: config.protocol,
    host: config.host,
    port: config.port,
    nodeEnv: config.nodeEnv,
    apiBasePath: config.apiBasePath,
    apiVersion: config.apiVersion,
    rateLimitWindowMs: config.rateLimitWindowMs,
    rateLimitMax: config.rateLimitMax,
    apiDocumentationPath: config.apiDocumentationPath,
    apiDocumentationUrl: config.apiDocumentationUrl,
    mongodbUriSet: !!config.mongodbUri,
    jwtSecretSet: !!config.jwtSecret,
});

module.exports = config;
