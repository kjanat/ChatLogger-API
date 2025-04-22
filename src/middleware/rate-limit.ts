import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger';

interface RateLimitOptions {
  statusCode: number;
  message: { message: string };
}

// Default rate limit configuration
const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { message: 'Too many requests, please try again later.' },
  handler: (req: Request, res: Response, next: NextFunction, options: RateLimitOptions) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).send(options.message);
  }
});

// Stricter rate limit for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // Limit each IP to 10 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later.' },
  handler: (req: Request, res: Response, next: NextFunction, options: RateLimitOptions) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).send(options.message);
  }
});

// API key rate limit for third-party integrations
const apiKeyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 1000, // Limit each API key to 1000 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    return (req.headers['x-api-key'] as string) || req.ip || 'unknown';
  },
  message: { message: 'API rate limit exceeded, please try again later.' },
  handler: (req: Request, res: Response, next: NextFunction, options: RateLimitOptions) => {
    const apiKey = req.headers['x-api-key'] || 'unknown';
    logger.warn(`API rate limit exceeded for API key: ${apiKey}`);
    res.status(options.statusCode).send(options.message);
  }
});

export {
  defaultLimiter,
  authLimiter,
  apiKeyLimiter
};
