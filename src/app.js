const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { defaultLimiter } = require('./middleware/rate-limit');
const userRoutes = require('./routes/user.routes');
const chatRoutes = require('./routes/chat.routes');
const messageRoutes = require('./routes/message.routes');
const organizationRoutes = require('./routes/organization.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const exportRoutes = require('./routes/export.routes'); // Add the new export routes
const config = require('./config/config');
const { version } = require('./config/version');
const setupSwagger = require('./docs/swagger');
const logger = require('./utils/logger');

// Initialize Express app
const app = express();

// Security middleware
app.use(
    helmet(),
    // {
    //     contentSecurityPolicy: false, // Disable CSP for simplicity, customize as needed
    //     crossOriginEmbedderPolicy: false, // Disable COEP for simplicity, customize as needed
    //     crossOriginOpenerPolicy: false, // Disable COOP for simplicity, customize as needed
    //     crossOriginResourcePolicy: false, // Disable CORP for simplicity, customize as needed
    // }
);

// CORS configuration - explicitly allow all origins
app.use(
    cors(),
    // {
    //     origin: '*', // Allow all origins
    //     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allow all common HTTP methods
    //     allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'], // Allow common headers
    //     credentials: true // Allow cookies to be sent with requests
    // }
);

// Request logger middleware
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global rate limiting
app.use(defaultLimiter);

// API Routes
app.use(`/${config.apiEffectivePath}/users`, userRoutes);
app.use(`/${config.apiEffectivePath}/chats`, chatRoutes);
app.use(`/${config.apiEffectivePath}/organizations`, organizationRoutes);
app.use(`/${config.apiEffectivePath}/analytics`, analyticsRoutes);
app.use(`/${config.apiEffectivePath}/export`, exportRoutes);
app.use(`/${config.apiEffectivePath}/messages`, messageRoutes);

// Setup Swagger documentation using centralized config
setupSwagger(app);

// Root route
app.get(`/${config.apiEffectivePath}`, (req, res) => {
    res.json({
        message: 'Welcome to the ChatLogger API',
        version: version,
        documentation: {
            swagger: `${config.apiDocumentationPath}`,
            swaggerjson: `${config.apiDocumentationUrl}`,
        },
        healthz: `/${config.apiEffectivePath}/healthz`,
        // } `/${config.documentationUrlSlug}`,
        // swaggerdocs: `/${config.documentationSlug}`,
    });
});

// Health check endpoint
app.get(`/healthz`, (req, res) => {
    res.status(200).json({
        status: 'ok',
        version: version,
        uptime: process.uptime(),
        timestamp: new Date(),
    });
});

app.get(`/${config.apiEffectivePath}/healthz`, (req, res) => {
    res.status(200).json({
        status: 'ok',
        version: version,
        uptime: process.uptime(),
        timestamp: new Date(),
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, _next) => {
    logger.error(`Error: ${err.message}`);
    res.status(err.status || 500).json({
        message: err.message || 'Something went wrong on the server',
        stack: config.nodeEnv === 'development' ? err.stack : undefined,
    });
});

module.exports = app;
