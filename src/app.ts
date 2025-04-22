import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { defaultLimiter } from './middleware/rate-limit';
import userRoutes from './routes/user.routes';
import chatRoutes from './routes/chat.routes';
import messageRoutes from './routes/message.routes';
import organizationRoutes from './routes/organization.routes';
import analyticsRoutes from './routes/analytics.routes';
import exportRoutes from './routes/export.routes';
import config from './config/config';
import { version } from './config/version';
import setupSwagger from './docs/swagger';
import logger from './utils/logger';

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - explicitly allow all origins
app.use(cors());

// Request logger middleware
app.use(morgan('combined', { stream: { write: (message: string) => logger.info(message.trim()) } }));

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
app.get(`/${config.apiEffectivePath}`, (req: Request, res: Response) => {
    res.json({
        message: 'Welcome to the ChatLogger API',
        version: version,
        documentation: {
            swagger: `${config.apiDocumentationPath}`,
            swaggerjson: `${config.apiDocumentationUrl}`,
        },
        healthz: `/${config.apiEffectivePath}/healthz`,
    });
});

// Health check endpoint
app.get(`/healthz`, (req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        version: version,
        uptime: process.uptime(),
        timestamp: new Date(),
    });
});

app.get(`/${config.apiEffectivePath}/healthz`, (req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        version: version,
        uptime: process.uptime(),
        timestamp: new Date(),
    });
});

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({ message: 'Route not found' });
});

// Error handler
interface ErrorWithStatus extends Error {
    status?: number;
}

app.use((err: ErrorWithStatus, req: Request, res: Response, _next: NextFunction) => {
    logger.error(`Error: ${err.message}`);
    res.status(err.status || 500).json({
        message: err.message || 'Something went wrong on the server',
        stack: config.nodeEnv === 'development' ? err.stack : undefined,
    });
});

export default app;
