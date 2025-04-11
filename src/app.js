const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { defaultLimiter } = require('./middleware/rate-limit');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const userRoutes = require('./routes/user.routes');
const chatRoutes = require('./routes/chat.routes');
const messageRoutes = require('./routes/message.routes');
const organizationRoutes = require('./routes/organization.routes');
const config = require('./config/config');
const logger = require('./utils/logger');

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Request logger middleware
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global rate limiting
app.use(defaultLimiter);

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api', messageRoutes);

// Swagger documentation setup
const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'ChatLogger API',
            version: '0.1.1',
            description: 'API for storing and retrieving chat interactions',
        },
        servers: [
            {
                url: `http://localhost:${config.port}/api`,
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter JWT token'
                },
                apiKeyAuth: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'x-api-key',
                    description: 'Enter API key'
                }
            }
        },
        security: [
            {
                bearerAuth: [],
                apiKeyAuth: []
            }
        ]
    },
    apis: ['./src/routes/*.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to the ChatLogger API',
        docs: `/api-docs`,
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    logger.error(`Error: ${err.message}`);
    res.status(err.status || 500).json({
        message: err.message || 'Something went wrong on the server',
        stack: config.nodeEnv === 'development' ? err.stack : undefined,
    });
});

module.exports = app;
