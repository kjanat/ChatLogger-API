const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/user.model');
const logger = require('../utils/logger');

// Middleware to authenticate with JWT
const authenticateJWT = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Authentication token required' });
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, config.jwtSecret);
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        logger.error(`JWT authentication error: ${error.message}`);
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// Middleware to authenticate with API key
const authenticateApiKey = async (req, res, next) => {
    try {
        // Look for x-api-key in headers
        const apiKey = req.headers['x-api-key'];

        if (!apiKey) {
            return res.status(401).json({ message: 'API key required' });
        }

        const user = await User.findOne({ apiKey }).select('-password');

        if (!user) {
            return res.status(401).json({ message: 'Invalid API key' });
        }

        req.user = user;
        next();
    } catch (error) {
        logger.error(`API key authentication error: ${error.message}`);
        return res.status(401).json({ message: 'Authentication error' });
    }
};

// Middleware to require admin role
const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return next();
    }

    return res.status(403).json({ message: 'Access denied: Admin privileges required' });
};

module.exports = {
    authenticateJWT,
    authenticateApiKey,
    requireAdmin
};
