const userController = require('../user.controller');
const User = require('../../models/user.model');
const jwt = require('jsonwebtoken');
const config = require('../../config/config');

// Mock dependencies
jest.mock('../../models/user.model');
jest.mock('jsonwebtoken');
jest.mock('../../config/config');
jest.mock('../../utils/logger');

describe('User Controller', () => {
    let req, res;
    
    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Common request/response objects
        req = {
            body: {},
            params: {},
            query: {},
            user: { _id: 'user123', organizationId: 'org123', role: 'user' }
        };
        
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });
    
    describe('register', () => {
        beforeEach(() => {
            req.body = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                organizationId: 'org123'
            };
            
            User.findOne = jest.fn().mockResolvedValue(null);
            User.mockImplementation(() => ({
                save: jest.fn().mockResolvedValue(true),
                _id: 'newuser123',
                username: 'testuser',
                email: 'test@example.com',
                role: 'user',
                organizationId: 'org123'
            }));
            
            jwt.sign = jest.fn().mockReturnValue('fake-token');
            config.jwtSecret = 'test-secret';
        });
        
        test('should register a new user successfully', async () => {
            await userController.register(req, res);
            
            expect(User.findOne).toHaveBeenCalled();
            expect(User).toHaveBeenCalledWith(expect.objectContaining({
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            }));
            expect(jwt.sign).toHaveBeenCalledWith(
                expect.objectContaining({ userId: 'newuser123' }),
                'test-secret',
                expect.any(Object)
            );
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('registered successfully'),
                    user: expect.any(Object),
                    token: 'fake-token'
                })
            );
        });
        
        test('should return 400 when organizationId is missing', async () => {
            req.body.organizationId = undefined;
            
            await userController.register(req, res);
            
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('Organization ID is required')
                })
            );
        });
        
        test('should return 409 when user already exists', async () => {
            User.findOne = jest.fn().mockResolvedValue({
                _id: 'existinguser',
                username: 'testuser',
                email: 'test@example.com'
            });
            
            await userController.register(req, res);
            
            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('already exists')
                })
            );
        });
        
        test('should handle server errors', async () => {
            User.findOne = jest.fn().mockRejectedValue(new Error('Database error'));
            
            await userController.register(req, res);
            
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Server error'
                })
            );
        });
    });
    
    describe('login', () => {
        beforeEach(() => {
            req.body = {
                email: 'test@example.com',
                password: 'password123'
            };
            
            const mockUser = {
                _id: 'user123',
                username: 'testuser',
                email: 'test@example.com',
                role: 'user',
                organizationId: 'org123',
                comparePassword: jest.fn().mockResolvedValue(true)
            };
            
            User.findOne = jest.fn().mockResolvedValue(mockUser);
            jwt.sign = jest.fn().mockReturnValue('fake-token');
            config.jwtSecret = 'test-secret';
        });
        
        test('should login user successfully', async () => {
            await userController.login(req, res);
            
            expect(User.findOne).toHaveBeenCalledWith({
                email: 'test@example.com',
                isActive: true
            });
            expect(jwt.sign).toHaveBeenCalledWith(
                expect.objectContaining({ userId: 'user123' }),
                'test-secret',
                expect.any(Object)
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('Login successful'),
                    user: expect.any(Object),
                    token: 'fake-token'
                })
            );
        });
        
        test('should return 401 when user not found', async () => {
            User.findOne = jest.fn().mockResolvedValue(null);
            
            await userController.login(req, res);
            
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('Invalid credentials')
                })
            );
        });
        
        test('should return 401 when password is incorrect', async () => {
            const mockUser = {
                _id: 'user123',
                comparePassword: jest.fn().mockResolvedValue(false)
            };
            User.findOne = jest.fn().mockResolvedValue(mockUser);
            
            await userController.login(req, res);
            
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('Invalid credentials')
                })
            );
        });
    });
    
    describe('getProfile', () => {
        test('should return user profile', async () => {
            req.user = {
                _id: 'user123',
                username: 'testuser',
                email: 'test@example.com',
                role: 'user',
                organizationId: 'org123'
            };
            
            await userController.getProfile(req, res);
            
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    user: expect.objectContaining({
                        id: 'user123',
                        username: 'testuser',
                        email: 'test@example.com'
                    })
                })
            );
        });
    });
    
    describe('generateApiKey', () => {
        test('should generate API key for user', async () => {
            req.user = {
                generateApiKey: jest.fn().mockResolvedValue('new-api-key-123')
            };
            
            await userController.generateApiKey(req, res);
            
            expect(req.user.generateApiKey).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('generated successfully'),
                    apiKey: 'new-api-key-123'
                })
            );
        });
    });
    
    describe('getUsersInOrganization', () => {
        beforeEach(() => {
            req.user = {
                _id: 'admin123',
                role: 'admin',
                organizationId: 'org123'
            };
            
            const mockUsers = [
                { _id: 'user1', username: 'user1', email: 'user1@example.com' },
                { _id: 'user2', username: 'user2', email: 'user2@example.com' }
            ];
            
            User.find = jest.fn().mockReturnThis();
            User.sort = jest.fn().mockReturnThis();
            User.limit = jest.fn().mockReturnThis();
            User.skip = jest.fn().mockReturnThis();
            User.select = jest.fn().mockResolvedValue(mockUsers);
            User.countDocuments = jest.fn().mockResolvedValue(2);
        });
        
        test('should get users in organization for admin', async () => {
            User.find.mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                select: jest.fn().mockResolvedValue([
                    { _id: 'user1', username: 'user1', email: 'user1@example.com' },
                    { _id: 'user2', username: 'user2', email: 'user2@example.com' }
                ])
            });
            
            await userController.getUsersInOrganization(req, res);
            
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    users: expect.any(Array),
                    totalPages: expect.any(Number),
                    currentPage: expect.any(Number),
                    totalUsers: expect.any(Number)
                })
            );
        });
        
        test('should return 403 for non-admin users', async () => {
            req.user.role = 'user';
            
            await userController.getUsersInOrganization(req, res);
            
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('Admin privileges required')
                })
            );
        });
    });
    
    describe('updateUser', () => {
        beforeEach(() => {
            req.params = { id: 'user123' };
            req.body = {
                username: 'updateduser',
                email: 'updated@example.com'
            };
            req.user = {
                _id: 'user123',
                role: 'user'
            };
            
            const mockUser = {
                _id: 'user123',
                username: 'testuser',
                email: 'test@example.com',
                role: 'user',
                organizationId: 'org123',
                isActive: true,
                save: jest.fn().mockResolvedValue(true)
            };
            
            User.findById = jest.fn().mockResolvedValue(mockUser);
            User.findOne = jest.fn().mockResolvedValue(mockUser);
        });
        
        test('should update user\'s own profile', async () => {
            await userController.updateUser(req, res);
            
            expect(User.findById).toHaveBeenCalledWith('user123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('updated successfully'),
                    user: expect.any(Object)
                })
            );
        });
        
        test('should return 403 when regular user tries to update another user', async () => {
            req.params.id = 'anotheruser';
            
            await userController.updateUser(req, res);
            
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('can only update your own profile')
                })
            );
        });
        
        test('should allow admin to update user role', async () => {
            req.user = {
                _id: 'admin123',
                role: 'admin',
                organizationId: 'org123'
            };
            req.params.id = 'user123';
            req.body.role = 'editor';
            
            await userController.updateUser(req, res);
            
            expect(User.findOne).toHaveBeenCalledWith({
                _id: 'user123',
                organizationId: 'org123'
            });
            expect(res.status).toHaveBeenCalledWith(200);
        });
        
        test('should return 404 when user not found', async () => {
            User.findById = jest.fn().mockResolvedValue(null);
            
            await userController.updateUser(req, res);
            
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'User not found'
                })
            );
        });
    });
});
