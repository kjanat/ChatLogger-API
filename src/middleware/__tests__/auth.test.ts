import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose'; // Import Types
import { IUser } from '../../models/user.model'; // Import IUser

const { authenticateJWT, requireAdmin, requireSuperAdmin } = require('../auth');
const jwt = require('jsonwebtoken');
const User = require('../../models/user.model');
const config = require('../../config/config');
const logger = require('../../utils/logger'); // Import logger

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../models/user.model');
jest.mock('../../config/config', () => ({
    jwtSecret: 'test-secret'
}));
jest.mock('../../utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn()
}));

// Helper to create a basic mock ObjectId
const mockObjectId = (id: string): Types.ObjectId => new Types.ObjectId(id);

// Helper to create a basic mock User (more complete)
const mockUser = (id: string, role: 'user' | 'admin' | 'superadmin'): IUser => ({
    _id: mockObjectId(id),
    role: role,
    username: `test_${role}`,
    email: `${role}@test.com`,
    password: 'hashedPassword', // Placeholder
    isActive: true,
    organizationId: mockObjectId('defaultOrg'), // Default org, adjust if needed
    apiKey: `key-${id}`,
    firstName: 'Test',
    lastName: role.charAt(0).toUpperCase() + role.slice(1),
    createdAt: new Date(),
    updatedAt: new Date(),
    // Mock methods - return dummy values or jest.fn()
    comparePassword: jest.fn().mockResolvedValue(true),
    generateApiKey: jest.fn().mockReturnValue(`new-key-${id}`),
    // Need to cast to any to satisfy Document properties/methods if not mocking all
}) as any; // Use 'as any' for simplicity if not mocking all Document props

describe('Auth Middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

  beforeEach(() => {
        // Reset mocks for each test
    jest.clearAllMocks();

        // Setup common mock objects
        mockReq = {
      headers: {},
            user: undefined // Ensure user is undefined initially
    };
        mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
        mockNext = jest.fn();
  });

  describe('authenticateJWT', () => {
        it('should call next() and attach user if token is valid', async () => {
            const fakeUserId = 'user123';
            const fakeUserData = mockUser(fakeUserId, 'user');
            mockReq.headers = mockReq.headers ?? {}; // Ensure headers exist
            mockReq.headers['authorization'] = 'Bearer validtoken';

            (jwt.verify as jest.Mock).mockImplementation((token: string, secret: string, callback: (err: any, decoded: any) => void) => {
                callback(null, { userId: fakeUserId });
            });
            (User.findById as jest.Mock).mockResolvedValue(fakeUserData);

            await authenticateJWT(mockReq as Request, mockRes as Response, mockNext);

            expect(jwt.verify).toHaveBeenCalledWith('validtoken', 'test-secret', expect.any(Function));
            expect(User.findById).toHaveBeenCalledWith(fakeUserId);
            // Add null check before accessing user properties
            expect(mockReq.user).toBeDefined();
            // Add explicit check before accessing properties on potentially undefined user
            if (mockReq.user) {
                // Explicitly cast _id before calling toString()
                expect(((mockReq.user as IUser)._id as Types.ObjectId).toString()).toEqual(fakeUserId);
                expect((mockReq.user as IUser).role).toEqual('user');
            }
            expect(mockNext).toHaveBeenCalledTimes(1);
            expect(mockRes.status).not.toHaveBeenCalled();
        });

        it('should call next() without attaching user if no authorization header', async () => {
            await authenticateJWT(mockReq as Request, mockRes as Response, mockNext);

            expect(jwt.verify).not.toHaveBeenCalled();
            expect(User.findById).not.toHaveBeenCalled();
            expect(mockReq.user).toBeUndefined();
            expect(mockNext).toHaveBeenCalledTimes(1);
        });

        it('should call next() without attaching user if header is not Bearer token', async () => {
            mockReq.headers = mockReq.headers ?? {}; // Ensure headers exist
            mockReq.headers['authorization'] = 'Basic somecredentials';
            await authenticateJWT(mockReq as Request, mockRes as Response, mockNext);

            expect(jwt.verify).not.toHaveBeenCalled();
            expect(mockReq.user).toBeUndefined();
            expect(mockNext).toHaveBeenCalledTimes(1);
        });

        it('should call next() without user if token is invalid/expired', async () => {
            mockReq.headers = mockReq.headers ?? {}; // Ensure headers exist
            mockReq.headers['authorization'] = 'Bearer invalidtoken';
            const tokenError = new Error('Invalid token');
            (jwt.verify as jest.Mock).mockImplementation((token: string, secret: string, callback: (err: any, decoded: any) => void) => {
                callback(tokenError, null);
            });

            await authenticateJWT(mockReq as Request, mockRes as Response, mockNext);

            expect(mockReq.user).toBeUndefined();
            expect(mockNext).toHaveBeenCalledTimes(1);
            expect(logger.warn).toHaveBeenCalledWith(`JWT verification failed: ${tokenError.message}`); // Check logger warning
        });

        it('should call next() without user if User.findById fails', async () => {
            const fakeUserId = 'user456';
            mockReq.headers = mockReq.headers ?? {}; // Ensure headers exist
            mockReq.headers['authorization'] = 'Bearer validtoken2';
            (jwt.verify as jest.Mock).mockImplementation((token: string, secret: string, callback: (err: any, decoded: any) => void) => {
                callback(null, { userId: fakeUserId });
            });
            const dbError = new Error('DB error');
            (User.findById as jest.Mock).mockRejectedValue(dbError);

            await authenticateJWT(mockReq as Request, mockRes as Response, mockNext);

            expect(mockReq.user).toBeUndefined();
            expect(mockNext).toHaveBeenCalledTimes(1);
            expect(logger.error).toHaveBeenCalledWith(`Error fetching user during JWT auth: ${dbError.message}`); // Check logger error
        });

         it('should call next() without user if user not found in DB', async () => {
             const fakeUserId = 'user789';
             mockReq.headers = mockReq.headers ?? {}; // Ensure headers exist
            mockReq.headers['authorization'] = 'Bearer validtoken3';
            (jwt.verify as jest.Mock).mockImplementation((token: string, secret: string, callback: (err: any, decoded: any) => void) => {
                callback(null, { userId: fakeUserId });
            });
            (User.findById as jest.Mock).mockResolvedValue(null); // User not found

            await authenticateJWT(mockReq as Request, mockRes as Response, mockNext);

            expect(mockReq.user).toBeUndefined();
            expect(mockNext).toHaveBeenCalledTimes(1);
            // Optionally log a warning here if desired
            expect(logger.warn).toHaveBeenCalledWith(`User not found for ID: ${fakeUserId} during JWT auth`);
        });

    });

    describe('requireAdmin', () => {
        it('should call next() if user is admin', () => {
            mockReq.user = mockUser('admin123', 'admin');
            requireAdmin(mockReq as Request, mockRes as Response, mockNext);
            expect(mockNext).toHaveBeenCalledTimes(1);
            expect(mockRes.status).not.toHaveBeenCalled();
        });

        it('should call next() if user is superadmin', () => {
            mockReq.user = mockUser('super123', 'superadmin');
            requireAdmin(mockReq as Request, mockRes as Response, mockNext);
            expect(mockNext).toHaveBeenCalledTimes(1);
        });

        it('should return 403 if user is not admin or superadmin', () => {
            mockReq.user = mockUser('user123', 'user');
            requireAdmin(mockReq as Request, mockRes as Response, mockNext);
            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access denied: Admin privileges required' });
        });

        it('should return 401 if user is not authenticated', () => {
            mockReq.user = undefined;
            requireAdmin(mockReq as Request, mockRes as Response, mockNext);
            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Authentication required' });
        });
    });

    describe('requireSuperAdmin', () => {
        it('should call next() if user is superadmin', () => {
            mockReq.user = mockUser('super123', 'superadmin');
            requireSuperAdmin(mockReq as Request, mockRes as Response, mockNext);
            expect(mockNext).toHaveBeenCalledTimes(1);
        });

        it('should return 403 if user is admin', () => {
            mockReq.user = mockUser('admin123', 'admin');
            requireSuperAdmin(mockReq as Request, mockRes as Response, mockNext);
            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access denied: Super Admin privileges required' });
        });

        it('should return 403 if user is regular user', () => {
             mockReq.user = mockUser('user123', 'user');
            requireSuperAdmin(mockReq as Request, mockRes as Response, mockNext);
            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access denied: Super Admin privileges required' }); // Ensure consistent message
        });

        it('should return 401 if user is not authenticated', () => {
            mockReq.user = undefined;
            requireSuperAdmin(mockReq as Request, mockRes as Response, mockNext);
            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Authentication required' });
        });
  });
});
