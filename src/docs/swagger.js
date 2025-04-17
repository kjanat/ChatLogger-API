// filepath: c:\Users\kjana\Projects\ChatLogger\src\docs\swagger.js
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
// const yaml = require('js-yaml');
const YAML = require('yaml');
const fs = require('fs');
const path = require('path');
const { version } = require('../config/version');
const config = require('../config/config');
const logger = require('../utils/logger');

// Load base Swagger definition from YAML file
const definitionPath = path.join(__dirname, 'swagger', 'definition.yaml');
let swaggerDefinition;

try {
    // swaggerDefinition = yaml.load(fs.readFileSync(definitionPath, 'utf8'));
    swaggerDefinition = YAML.parse(fs.readFileSync(definitionPath, 'utf8'));
} catch (error) {
    logger.error(`Error loading Swagger definition from ${definitionPath}: ${error.message}`);
    process.exit(1);
}

// Add dynamic properties to the definition
swaggerDefinition.info.version = version;

// Add server configurations
swaggerDefinition.servers = [
    {
        url: `/${config.apiEffectivePath}`,
        description: 'The current API server',
    },
    {
        url: `https://{environment}.chatlogger.kjanat.com/${config.apiVersion}`,
        description: 'The production API server',
        variables: {
            environment: {
                enum: [
                    'api', // Production server
                    'api.dev', // Development server
                    'api.staging', // Staging server
                ],
                default: 'api',
                description: 'The environment for the API server',
            },
        },
    },
];

// Swagger options
const swaggerOptions = {
    definition: swaggerDefinition,
    apis: ['./src/docs/swagger/*.yaml'], // Path to the API YAML files
    explorer: true,
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Configure Swagger middleware for Express
 * @param {Object} app - Express app
 */
const setupSwagger = app => {
    // Serve Swagger documentation
    app.use(config.apiDocumentationPath, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    /* app.use('/api-docs', function(req, res, next){
        swaggerSpec.host = req.get('host');
        req.swaggerDoc = swaggerSpec;
        next();
    }, swaggerUi.serveFiles(swaggerSpec, swaggerOptions), swaggerUi.setup(swaggerSpec)); */

    app.use(
        '/api-docs',
        function (req, res, next) {
            swaggerSpec.host = req.get('host');
            req.swaggerDoc = swaggerSpec;
            next();
        },
        swaggerUi.serve,
        swaggerUi.setup(swaggerSpec),
    );

    // Serve swagger.json
    app.get(config.apiDocumentationUrl, (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });

    // logger.info(`Swagger API documentation available at ${config.apiDocumentationPath}`);
};

module.exports = setupSwagger;
