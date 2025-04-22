import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/config';
import User from '../models/user.model';
import logger from '../utils/logger';
import { IUser } from '../models/user.model';

interface DecodedToken {
    userId: string;
    iat: number;
    exp: number;
}

// Middleware to authenticate with JWT
const authenticateJWT = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ message: 'Authentication token required' });
            return;
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, config.jwtSecret) as DecodedToken;
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            res.status(401).json({ message: 'User not found' });
            return;
        }

        req.user = user as IUser;
        next();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`JWT authentication error: ${errorMessage}`);
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// Middleware to authenticate with API key
const authenticateApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Look for x-api-key in headers
        const apiKey = req.headers['x-api-key'] as string;

        if (!apiKey) {
            res.status(401).json({ message: 'API key required' });
            return;
        }

        const user = await User.findOne({ apiKey }).select('-password');

        if (!user) {
            res.status(401).json({ message: 'Invalid API key' });
            return;
        }

        req.user = user as IUser;
        next();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`API key authentication error: ${errorMessage}`);
        res.status(401).json({ message: 'Authentication error' });
    }
};

// Middleware to require admin role
const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
        next();
        return;
    }

    res.status(403).json({ message: 'Access denied: Admin privileges required' });
};

const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
    // ... (implementation) ...
};

// Export functions
module.exports = {
    authenticateJWT,
    authenticateApiKey,
    requireAdmin,
    requireSuperAdmin
};

// Add ES Module exports as well if needed elsewhere
export {
    authenticateJWT,
    authenticateApiKey,
    requireAdmin,
    requireSuperAdmin
};
