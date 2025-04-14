const jwt = require('jsonwebtoken');
const User = require('../../models/user.model');

// Mock modules before importing the middleware
jest.mock('jsonwebtoken');
jest.mock('../../models/user.model');
jest.mock('../../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
}));

// Mock config before importing the middleware
jest.mock('../../config/config', () => ({
  jwtSecret: 'test_secret'
}));

// Import the middleware after mocks are set up
const { authenticateJWT, authenticateApiKey, requireAdmin } = require('../auth');

describe('Authentication Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create fresh request/response objects for each test
    req = {
      headers: {},
      user: null
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    next = jest.fn();
  });

  describe('authenticateJWT', () => {
    test('should pass for valid JWT token', async () => {
      // Setup
      const mockUser = { _id: 'user123', username: 'testuser', role: 'user' };
      req.headers.authorization = 'Bearer valid_token';

      // Mock jwt.verify to return userId
      jwt.verify.mockImplementation(() => ({ userId: 'user123' }));

      // Mock User.findById with a chainable select method
      const mockSelectFn = jest.fn().mockResolvedValue(mockUser);
      User.findById.mockImplementation(() => ({
        select: mockSelectFn
      }));

      // Execute
      await authenticateJWT(req, res, next);

      // Verify
      expect(jwt.verify).toHaveBeenCalledWith('valid_token', 'test_secret');
      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(mockSelectFn).toHaveBeenCalledWith('-password');
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });

    test('should reject when no authorization header is present', async () => {
      // Execute
      await authenticateJWT(req, res, next);

      // Verify
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Authentication token required' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject when header format is invalid', async () => {
      // Setup
      req.headers.authorization = 'InvalidFormat';

      // Execute
      await authenticateJWT(req, res, next);

      // Verify
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Authentication token required' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject when token is invalid', async () => {
      // Setup
      req.headers.authorization = 'Bearer invalid_token';
      
      // Mock jwt.verify to throw an error
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Execute
      await authenticateJWT(req, res, next);

      // Verify
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Invalid or expired token' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject when user is not found', async () => {
      // Setup
      req.headers.authorization = 'Bearer valid_token';
      
      // Mock jwt.verify to return userId
      jwt.verify.mockImplementation(() => ({ userId: 'nonexistent_user' }));
      
      // Mock User.findById with a chainable select method that returns null
      const mockSelectFn = jest.fn().mockResolvedValue(null);
      User.findById.mockImplementation(() => ({
        select: mockSelectFn
      }));

      // Execute
      await authenticateJWT(req, res, next);

      // Verify
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'User not found' })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('authenticateApiKey', () => {
    test('should pass for valid API key', async () => {
      // Setup
      const mockUser = { _id: 'user123', username: 'testuser', role: 'user' };
      req.headers['x-api-key'] = 'valid_api_key';

      // Mock User.findOne with a chainable select method
      const mockSelectFn = jest.fn().mockResolvedValue(mockUser);
      User.findOne.mockImplementation(() => ({
        select: mockSelectFn
      }));

      // Execute
      await authenticateApiKey(req, res, next);

      // Verify
      expect(User.findOne).toHaveBeenCalledWith({ apiKey: 'valid_api_key' });
      expect(mockSelectFn).toHaveBeenCalledWith('-password');
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });

    test('should reject when no API key is provided', async () => {
      // Execute
      await authenticateApiKey(req, res, next);

      // Verify
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'API key required' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject when API key is invalid', async () => {
      // Setup
      req.headers['x-api-key'] = 'invalid_api_key';

      // Mock User.findOne with a chainable select method that returns null
      const mockSelectFn = jest.fn().mockResolvedValue(null);
      User.findOne.mockImplementation(() => ({
        select: mockSelectFn
      }));

      // Execute
      await authenticateApiKey(req, res, next);

      // Verify
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Invalid API key' })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    test('should allow access for admin users', () => {
      // Setup
      req.user = { role: 'admin' };

      // Execute
      requireAdmin(req, res, next);

      // Verify
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should deny access for non-admin users', () => {
      // Setup
      req.user = { role: 'user' };

      // Execute
      requireAdmin(req, res, next);

      // Verify
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Access denied: Admin privileges required' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should deny access when user is not authenticated', () => {
      // Setup
      req.user = null;

      // Execute
      requireAdmin(req, res, next);

      // Verify
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Access denied: Admin privileges required' })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});
