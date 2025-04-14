const rateLimit = require('express-rate-limit');
const { defaultLimiter, authLimiter, apiKeyLimiter } = require('../rate-limit');
const logger = require('../../utils/logger');

// Mock the logger to avoid actual logging
jest.mock('../../utils/logger', () => ({
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
}));

// Mock express-rate-limit
jest.mock('express-rate-limit', () => {
    return jest.fn((config) => {
        // Create a middleware function that captures the config
        const middleware = (req, res, next) => {
            // For testing, we can trigger the rate limit handler by setting a special header
            if (req.headers && req.headers['x-trigger-rate-limit'] === 'true') {
                const mockOptions = {
                    statusCode: 429,
                    message: config.message
                };
                return config.handler(req, res, next, mockOptions);
            }
            
            // Otherwise proceed normally
            return next();
        };
        
        // Attach the configuration to the middleware function for inspection
        middleware.config = config;
        
        return middleware;
    });
});

describe('Rate Limit Middleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock request object
        mockReq = {
            ip: '127.0.0.1',
            headers: {}
        };
        
        // Mock response object
        mockRes = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };
        
        // Mock next function
        mockNext = jest.fn();
    });
    
    describe('defaultLimiter', () => {
        it('should have the correct default configuration', () => {
            expect(defaultLimiter.config.windowMs).toBe(15 * 60 * 1000); // 15 minutes
            expect(defaultLimiter.config.limit).toBe(100);
            expect(defaultLimiter.config.standardHeaders).toBe(true);
            expect(defaultLimiter.config.legacyHeaders).toBe(false);
        });
        
        it('should call next() when rate limit is not exceeded', () => {
            defaultLimiter(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        
        it('should handle rate limit exceeded correctly', () => {
            // Trigger rate limit exceeded
            mockReq.headers['x-trigger-rate-limit'] = 'true';
            
            defaultLimiter(mockReq, mockRes, mockNext);
            
            expect(mockRes.status).toHaveBeenCalledWith(429);
            expect(mockRes.send).toHaveBeenCalledWith({ message: 'Too many requests, please try again later.' });
            expect(logger.warn).toHaveBeenCalledWith(`Rate limit exceeded for IP: 127.0.0.1`);
            expect(mockNext).not.toHaveBeenCalled();
        });
    });
    
    describe('authLimiter', () => {
        it('should have stricter limits for authentication endpoints', () => {
            expect(authLimiter.config.windowMs).toBe(15 * 60 * 1000); // 15 minutes
            expect(authLimiter.config.limit).toBe(10); // Stricter than default
            expect(authLimiter.config.message).toEqual({ message: 'Too many login attempts, please try again later.' });
        });
        
        it('should handle auth rate limit exceeded correctly', () => {
            // Trigger rate limit exceeded
            mockReq.headers['x-trigger-rate-limit'] = 'true';
            
            authLimiter(mockReq, mockRes, mockNext);
            
            expect(mockRes.status).toHaveBeenCalledWith(429);
            expect(mockRes.send).toHaveBeenCalledWith({ message: 'Too many login attempts, please try again later.' });
            expect(logger.warn).toHaveBeenCalledWith(`Auth rate limit exceeded for IP: 127.0.0.1`);
        });
    });
    
    describe('apiKeyLimiter', () => {
        it('should have appropriate configuration for API key rate limiting', () => {
            expect(apiKeyLimiter.config.windowMs).toBe(60 * 60 * 1000); // 1 hour
            expect(apiKeyLimiter.config.limit).toBe(1000);
            expect(typeof apiKeyLimiter.config.keyGenerator).toBe('function');
        });
        
        it('should use API key as the identifier when available', () => {
            mockReq.headers['x-api-key'] = 'test-api-key';
            
            const keyGenerator = apiKeyLimiter.config.keyGenerator;
            const result = keyGenerator(mockReq);
            
            expect(result).toBe('test-api-key');
        });
        
        it('should fall back to IP when API key is not provided', () => {
            const keyGenerator = apiKeyLimiter.config.keyGenerator;
            const result = keyGenerator(mockReq);
            
            expect(result).toBe('127.0.0.1');
        });
        
        it('should handle API key rate limit exceeded correctly', () => {
            // Add API key to request
            mockReq.headers['x-api-key'] = 'test-api-key';
            // Trigger rate limit exceeded
            mockReq.headers['x-trigger-rate-limit'] = 'true';
            
            apiKeyLimiter(mockReq, mockRes, mockNext);
            
            expect(mockRes.status).toHaveBeenCalledWith(429);
            expect(mockRes.send).toHaveBeenCalledWith({ message: 'API rate limit exceeded, please try again later.' });
            expect(logger.warn).toHaveBeenCalledWith(`API rate limit exceeded for API key: test-api-key`);
        });
        
        it('should use unknown for API key when not in headers but rate limit exceeded', () => {
            // Trigger rate limit exceeded but without providing an API key
            mockReq.headers['x-trigger-rate-limit'] = 'true';
            
            apiKeyLimiter(mockReq, mockRes, mockNext);
            
            expect(logger.warn).toHaveBeenCalledWith('API rate limit exceeded for API key: unknown');
        });
    });
});
