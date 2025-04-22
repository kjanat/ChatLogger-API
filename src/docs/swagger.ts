import { Express, Request, Response } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
// const yaml = require('js-yaml');
const YAML = require('yaml');
const fs = require('fs');
const path = require('path');
import config from '../config/config';
import { version } from '../config/version';
import logger from '../utils/logger';

// Load base Swagger definition from YAML file
const definitionPath = path.join(__dirname, 'swagger', 'definition.yaml');
let swaggerDefinition;

try {
    // swaggerDefinition = yaml.load(fs.readFileSync(definitionPath, 'utf8'));
    swaggerDefinition = YAML.parse(fs.readFileSync(definitionPath, 'utf8'));
} catch (error: any) {
    logger.error(`Error loading Swagger definition from ${definitionPath}: ${error.message}`);
    process.exit(1);
}

// Add dynamic properties to the definition
swaggerDefinition.info.version = version;

// Add server configurations
swaggerDefinition.servers = [
    {
        url: `${config.protocol}://${config.host}:${config.port}/${config.apiEffectivePath}`,
        description: 'Development server',
    },
    {
        url: `https://api.chatlogger.io/${config.apiEffectivePath}`,
        description: 'Production server',
    },
];

// Swagger options
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'ChatLogger API',
            version: version,
            description: 'API for storing and retrieving chat interactions',
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT',
            },
            contact: {
                name: 'API Support',
                email: 'support@chatlogger.io',
            },
        },
        servers: [
            {
                url: `${config.protocol}://${config.host}:${config.port}/${config.apiEffectivePath}`,
                description: 'Development server',
            },
            {
                url: `https://api.chatlogger.io/${config.apiEffectivePath}`,
                description: 'Production server',
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
                organizationApiKeyAuth: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'x-organization-api-key',
                },
            },
        },
        security: [
            { bearerAuth: [] },
            { apiKeyAuth: [] },
        ],
    },
    apis: ['./src/docs/swagger/**/*.yaml', './src/routes/*.js', './src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Configure and set up Swagger documentation for the API
 * @param app Express application instance
 */
const setupSwagger = (app: Express): void => {
    // Setup swagger docs route
    app.use(
        `/${config.apiDocumentationPath}`,
        swaggerUi.serve,
        swaggerUi.setup(swaggerSpec, {
            explorer: true,
            customCss: '.swagger-ui .topbar { display: none }',
            customSiteTitle: 'ChatLogger API Documentation',
        })
    );

    // Serve swagger spec as JSON
    app.get(`/${config.apiDocumentationUrl}`, (req: Request, res: Response) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });

    logger.info(`Swagger documentation available at: /${config.apiDocumentationPath}`);
};

export default setupSwagger;
