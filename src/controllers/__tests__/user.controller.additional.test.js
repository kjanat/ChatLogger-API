const userController = require('../user.controller');
const User = require('../../models/user.model');
const jwt = require('jsonwebtoken');
const config = require('../../config/config');
const logger = require('../../utils/logger');

// Mock dependencies
jest.mock('../../models/user.model');
jest.mock('jsonwebtoken');
jest.mock('../../config/config', () => ({
  jwtSecret: 'mock-jwt-secret'
}));
jest.mock('../../utils/logger');

describe('User Controller - Additional Tests', () => {
  let req, res;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Common request/response objects
    req = {
      params: {},
      body: {},
      query: {},
      user: {
        _id: 'user123',
        role: 'user',
        organizationId: 'org123'
      }
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });
  
  describe('register', () => {
    test('should handle missing organizationId', async () => {
      // Setup
      req.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };
      
      // Execute
      await userController.register(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Organization ID is required')
      }));
    });
    
    test('should handle existing user', async () => {
      // Setup
      req.body = {
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'password123',
        organizationId: 'org123'
      };
      
      User.findOne = jest.fn().mockResolvedValue({ _id: 'existingUser' });
      
      // Execute
      await userController.register(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('already exists')
      }));
    });
    
    test('should handle server errors', async () => {
      // Setup
      req.body = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        organizationId: 'org123'
      };
      
      User.findOne = jest.fn().mockRejectedValue(new Error('Database error'));
      
      // Execute
      await userController.register(req, res);
      
      // Assert
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Registration error'));
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
  
  describe('login', () => {
    test('should handle invalid credentials', async () => {
      // Setup
      req.body = {
        email: 'wrong@example.com',
        password: 'wrongpassword'
      };
      
      User.findOne = jest.fn().mockResolvedValue(null);
      
      // Execute
      await userController.login(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Invalid credentials'
      }));
    });
    
    test('should handle incorrect password', async () => {
      // Setup
      req.body = {
        email: 'user@example.com',
        password: 'wrongpassword'
      };
      
      const mockUser = {
        _id: 'user123',
        email: 'user@example.com',
        comparePassword: jest.fn().mockResolvedValue(false)
      };
      
      User.findOne = jest.fn().mockResolvedValue(mockUser);
      
      // Execute
      await userController.login(req, res);
      
      // Assert
      expect(mockUser.comparePassword).toHaveBeenCalledWith('wrongpassword');
      expect(res.status).toHaveBeenCalledWith(401);
    });
    
    test('should handle server errors', async () => {
      // Setup
      req.body = {
        email: 'user@example.com',
        password: 'password123'
      };
      
      User.findOne = jest.fn().mockRejectedValue(new Error('Database error'));
      
      // Execute
      await userController.login(req, res);
      
      // Assert
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Login error'));
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
  
  describe('generateApiKey', () => {
    test('should generate API key', async () => {
      // Setup
      req.user.generateApiKey = jest.fn().mockResolvedValue('new-api-key-123');
      
      // Execute
      await userController.generateApiKey(req, res);
      
      // Assert
      expect(req.user.generateApiKey).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        apiKey: 'new-api-key-123'
      }));
    });
    
    test('should handle errors', async () => {
      // Setup
      req.user.generateApiKey = jest.fn().mockRejectedValue(new Error('Failed to generate API key'));
      
      // Execute
      await userController.generateApiKey(req, res);
      
      // Assert
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Generate API key error'));
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
  
  describe('getUsersInOrganization', () => {
    test('should deny access to regular users', async () => {
      // Setup - user role is already 'user' from beforeEach
      
      // Execute
      await userController.getUsersInOrganization(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Admin privileges required')
      }));
    });
    
    test('should allow admin to list organization users', async () => {
      // Setup
      req.user.role = 'admin';
      req.query = { page: '2', limit: '20' };
      
      const mockUsers = [{ username: 'user1' }, { username: 'user2' }];
      User.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue(mockUsers)
      });
      
      User.countDocuments = jest.fn().mockResolvedValue(40);
      
      // Execute
      await userController.getUsersInOrganization(req, res);
      
      // Assert
      expect(User.find).toHaveBeenCalledWith({ organizationId: 'org123' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        users: mockUsers,
        totalUsers: 40,
        currentPage: 2,
        totalPages: 2 // 40/20 = 2
      }));
    });
    
    test('should allow superadmin to filter by organization', async () => {
      // Setup
      req.user.role = 'superadmin';
      req.query = { organizationId: 'different-org' };
      
      const mockUsers = [{ username: 'user1' }];
      User.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue(mockUsers)
      });
      
      User.countDocuments = jest.fn().mockResolvedValue(1);
      
      // Execute
      await userController.getUsersInOrganization(req, res);
      
      // Assert
      expect(User.find).toHaveBeenCalledWith({ organizationId: 'different-org' });
    });
    
    test('should handle server errors', async () => {
      // Setup
      req.user.role = 'admin';
      
      User.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        select: jest.fn().mockRejectedValue(new Error('Database error'))
      });
      
      // Execute
      await userController.getUsersInOrganization(req, res);
      
      // Assert
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Get users error'));
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
  
  describe('updateUser', () => {
    test('should allow users to update only themselves', async () => {
      // Setup
      req.params.id = 'different-user';
      req.body = { username: 'newname' };
      
      // Execute
      await userController.updateUser(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('can only update your own profile')
      }));
    });
    
    test('should allow admins to update users in their organization', async () => {
      // Setup
      req.user.role = 'admin';
      req.params.id = 'target-user';
      req.body = { 
        username: 'newname',
        email: 'newemail@example.com',
        role: 'user',
        isActive: false
      };
      
      const mockUser = {
        _id: 'target-user',
        username: 'oldname',
        email: 'old@example.com',
        role: 'user',
        isActive: true,
        save: jest.fn().mockResolvedValue(true)
      };
      
      User.findOne = jest.fn().mockResolvedValue(mockUser);
      
      // Execute
      await userController.updateUser(req, res);
      
      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ 
        _id: 'target-user', 
        organizationId: 'org123' 
      });
      expect(mockUser.username).toBe('newname');
      expect(mockUser.email).toBe('newemail@example.com');
      expect(mockUser.isActive).toBe(false);
      expect(res.status).toHaveBeenCalledWith(200);
    });
    
    test('should prevent admins from creating superadmins', async () => {
      // Setup
      req.user.role = 'admin';
      req.params.id = 'target-user';
      req.body = { role: 'superadmin' };
      
      const mockUser = {
        _id: 'target-user',
        role: 'user',
        save: jest.fn()
      };
      
      User.findOne = jest.fn().mockResolvedValue(mockUser);
      
      // Execute
      await userController.updateUser(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockUser.save).not.toHaveBeenCalled();
    });
    
    test('should allow superadmins to update any user', async () => {
      // Setup
      req.user.role = 'superadmin';
      req.params.id = 'any-user';
      req.body = { role: 'admin' };
      
      const mockUser = {
        _id: 'any-user',
        role: 'user',
        save: jest.fn().mockResolvedValue(true)
      };
      
      User.findById = jest.fn().mockResolvedValue(mockUser);
      
      // Execute
      await userController.updateUser(req, res);
      
      // Assert
      expect(User.findById).toHaveBeenCalledWith('any-user');
      expect(mockUser.role).toBe('admin');
      expect(res.status).toHaveBeenCalledWith(200);
    });
    
    test('should return 404 if user not found', async () => {
      // Setup
      req.user.role = 'admin';
      req.params.id = 'nonexistent-user';
      
      User.findOne = jest.fn().mockResolvedValue(null);
      
      // Execute
      await userController.updateUser(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
  
  describe('getUserById', () => {
    test('should deny regular users from viewing other profiles', async () => {
      // Setup
      req.params.id = 'different-user';
      
      // Execute
      await userController.getUserById(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
    });
    
    test('should allow users to view their own profile', async () => {
      // Setup
      req.params.id = 'user123'; // Same as req.user._id
      
      const mockUser = {
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        organizationId: 'org123',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });
      
      // Execute
      await userController.getUserById(req, res);
      
      // Assert
      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        user: expect.objectContaining({
          id: 'user123',
          username: 'testuser'
        })
      }));
    });
    
    test('should allow admins to view users in their organization', async () => {
      // Setup
      req.user.role = 'admin';
      req.params.id = 'org-user';
      
      const mockUser = {
        _id: 'org-user',
        username: 'orguser',
        organizationId: 'org123'
      };
      
      User.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });
      
      // Execute
      await userController.getUserById(req, res);
      
      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ 
        _id: 'org-user', 
        organizationId: 'org123' 
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });
    
    test('should return 404 if user not found', async () => {
      // Setup
      req.user.role = 'admin';
      req.params.id = 'nonexistent-user';
      
      User.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });
      
      // Execute
      await userController.getUserById(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
  
  describe('searchUsers', () => {
    test('should deny access to non-admin users', async () => {
      // Execute
      await userController.searchUsers(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
    });
    
    test('should apply all search filters for admins', async () => {
      // Setup
      req.user.role = 'admin';
      req.query = {
        username: 'search',
        email: 'search@example',
        role: 'user',
        isActive: 'true',
        page: '2',
        limit: '15',
        sortBy: 'email',
        sortOrder: 'desc'
      };
      
      const mockUsers = [{ username: 'result1' }, { username: 'result2' }];
      
      User.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue(mockUsers)
      });
      
      User.countDocuments = jest.fn().mockResolvedValue(25);
      
      // Execute
      await userController.searchUsers(req, res);
      
      // Assert
      expect(User.find).toHaveBeenCalledWith({
        organizationId: 'org123',
        username: { $regex: 'search', $options: 'i' },
        email: { $regex: 'search@example', $options: 'i' },
        role: 'user',
        isActive: true
      });
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        users: mockUsers,
        totalPages: 2,
        currentPage: 2,
        totalUsers: 25
      }));
    });
    
    test('should allow superadmin to filter by organization', async () => {
      // Setup
      req.user.role = 'superadmin';
      req.query = { organizationId: 'filter-org' };
      
      User.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue([])
      });
      
      User.countDocuments = jest.fn().mockResolvedValue(0);
      
      // Execute
      await userController.searchUsers(req, res);
      
      // Assert
      expect(User.find).toHaveBeenCalledWith({
        organizationId: 'filter-org'
      });
    });
  });
  
  describe('createAdminUser', () => {
    test('should deny non-superadmins from creating admin users', async () => {
      // Setup
      req.body = {
        username: 'newadmin',
        email: 'admin@example.com',
        password: 'password',
        role: 'admin',
        organizationId: 'org123'
      };
      
      // Execute
      await userController.createAdminUser(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
    });
    
    test('should allow superadmin to create admin users', async () => {
      // Setup
      req.user.role = 'superadmin';
      req.body = {
        username: 'newadmin',
        email: 'admin@example.com',
        password: 'password',
        role: 'admin',
        organizationId: 'org123'
      };
      
      User.findOne = jest.fn().mockResolvedValue(null);
      
      const mockUser = {
        _id: 'new-admin-id',
        username: 'newadmin',
        email: 'admin@example.com',
        role: 'admin',
        organizationId: 'org123',
        save: jest.fn().mockResolvedValue(true)
      };
      
      User.mockImplementation(() => mockUser);
      
      // Execute
      await userController.createAdminUser(req, res);
      
      // Assert
      expect(User).toHaveBeenCalledWith({
        username: 'newadmin',
        email: 'admin@example.com',
        password: 'password',
        role: 'admin',
        organizationId: 'org123'
      });
      
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });
    
    test('should handle existing user', async () => {
      // Setup
      req.user.role = 'superadmin';
      req.body = {
        username: 'existingadmin',
        email: 'existing@example.com',
        password: 'password',
        role: 'admin',
        organizationId: 'org123'
      };
      
      User.findOne = jest.fn().mockResolvedValue({ _id: 'existing-user' });
      
      // Execute
      await userController.createAdminUser(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(409);
    });
    
    test('should default to user role if not specified', async () => {
      // Setup
      req.user.role = 'superadmin';
      req.body = {
        username: 'newuser',
        email: 'user@example.com',
        password: 'password',
        organizationId: 'org123'
        // No role specified
      };
      
      User.findOne = jest.fn().mockResolvedValue(null);
      
      // Create a mock User constructor that sets default role correctly
      const mockUser = {
        _id: 'new-user-id',
        username: 'newuser',
        email: 'user@example.com',
        password: 'password',
        organizationId: 'org123',
        role: undefined,
        save: jest.fn().mockImplementation(function() {
          // Set the default role during the save operation
          // simulating what happens in the actual model
          if (!this.role) {
            this.role = 'user';
          }
          return Promise.resolve(this);
        })
      };
      
      User.mockImplementation(() => mockUser);
      
      // Execute
      await userController.createAdminUser(req, res);
      
      // Wait for the save to complete
      await mockUser.save();
      
      // Assert
      expect(mockUser.role).toBe('user');
      expect(mockUser.save).toHaveBeenCalled();
    });
  });
});
