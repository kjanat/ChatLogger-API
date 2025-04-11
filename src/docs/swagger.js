// filepath: c:\Users\kjana\Projects\ChatLogger\src\docs\swagger.js
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Chat Logger API',
      version: '0.1.0',
      description: 'API documentation for the Chat Logger application',
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
      contact: {
        name: 'API Support',
        email: 'support@chatlogger.example.com',
      },
    },
    servers: [
      {
        url: '/api',
        description: 'API Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
        },
      },
    },
    tags: [
      {
        name: 'Users',
        description: 'User management and authentication operations',
      },
      {
        name: 'Organizations',
        description: 'Organization management operations',
      },
      {
        name: 'Chats',
        description: 'Chat session management operations',
      },
      {
        name: 'Messages',
        description: 'Chat message operations',
      },
    ],
  },
  apis: ['./src/routes/*.js'], // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Configure Swagger middleware for Express
 * @param {Object} app - Express app
 */
const setupSwagger = (app) => {
  // Serve Swagger documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  
  // Serve swagger.json
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('Swagger API documentation available at /api-docs');
};

module.exports = setupSwagger;
