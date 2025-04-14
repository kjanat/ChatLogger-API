const { 
  authenticateOrganization,
  checkOrganizationAccess,
  addOrganizationToRequest
} = require('../organization-auth');
const Organization = require('../../models/organization.model');
const logger = require('../../utils/logger');

// Mock dependencies
jest.mock('../../models/organization.model');
jest.mock('../../utils/logger');

describe('Organization Auth Middleware', () => {
  let req, res, next;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock request, response, next
    req = {
      headers: {},
      user: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    next = jest.fn();
  });
  
  describe('authenticateOrganization', () => {
    test('should authenticate with valid API key', async () => {
      // Setup
      req.headers['x-organization-api-key'] = 'valid-api-key';
      
      const mockOrg = { _id: 'org123', name: 'Test Org' };
      Organization.findOne = jest.fn().mockResolvedValue(mockOrg);
      
      // Execute
      await authenticateOrganization(req, res, next);
      
      // Assert
      expect(Organization.findOne).toHaveBeenCalledWith({ 
        apiKey: 'valid-api-key', 
        isActive: true 
      });
      expect(req.organization).toEqual(mockOrg);
      expect(next).toHaveBeenCalled();
    });
    
    test('should return 401 when API key is missing', async () => {
      // Setup - no API key in headers
      
      // Execute
      await authenticateOrganization(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('API key')
      }));
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should return 401 when API key is invalid', async () => {
      // Setup
      req.headers['x-organization-api-key'] = 'invalid-api-key';
      
      // Mock no organization found
      Organization.findOne = jest.fn().mockResolvedValue(null);
      
      // Execute
      await authenticateOrganization(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Invalid or disabled')
      }));
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should handle errors', async () => {
      // Setup
      req.headers['x-organization-api-key'] = 'valid-api-key';
      
      // Mock database error
      Organization.findOne = jest.fn().mockRejectedValue(new Error('Database error'));
      
      // Execute
      await authenticateOrganization(req, res, next);
      
      // Assert
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Organization authentication error'));
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });
  
  describe('checkOrganizationAccess', () => {
    test('should allow superadmins to access any organization', async () => {
      // Setup
      req.user = { 
        role: 'superadmin',
        organizationId: 'org123'
      };
      req.organization = { _id: 'different-org-456' };
      
      // Execute
      await checkOrganizationAccess(req, res, next);
      
      // Assert
      expect(next).toHaveBeenCalled();
    });
    
    test('should allow users to access their own organization', async () => {
      // Setup
      req.user = { 
        role: 'user',
        organizationId: {
          equals: jest.fn().mockReturnValue(true)
        }
      };
      req.organization = { _id: 'org123' };
      
      // Execute
      await checkOrganizationAccess(req, res, next);
      
      // Assert
      expect(req.user.organizationId.equals).toHaveBeenCalledWith(req.organization._id);
      expect(next).toHaveBeenCalled();
    });
    
    test('should deny access for users trying to access different organization', async () => {
      // Setup
      req.user = { 
        role: 'user',
        organizationId: {
          equals: jest.fn().mockReturnValue(false)
        }
      };
      req.organization = { _id: 'different-org' };
      
      // Execute
      await checkOrganizationAccess(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Access denied')
      }));
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should deny access when user has no organization ID', async () => {
      // Setup
      req.user = { 
        role: 'user',
        organizationId: null
      };
      req.organization = { _id: 'org123' };
      
      // Execute
      await checkOrganizationAccess(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should handle errors', async () => {
      // Setup
      req.user = { 
        role: 'user',
        organizationId: {
          equals: jest.fn().mockImplementation(() => {
            throw new Error('Unexpected error');
          })
        }
      };
      req.organization = { _id: 'org123' };
      
      // Execute
      await checkOrganizationAccess(req, res, next);
      
      // Assert
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Organization access check error'));
      expect(res.status).toHaveBeenCalledWith(500);
      expect(next).not.toHaveBeenCalled();
    });
  });
  
  describe('addOrganizationToRequest', () => {
    test('should skip if organization is already in request', () => {
      // Setup
      req.organization = { _id: 'org123' };
      
      // Execute
      addOrganizationToRequest(req, res, next);
      
      // Assert
      expect(next).toHaveBeenCalled();
    });
    
    test('should add organization to request from user context', async () => {
      // Setup
      req.user = { organizationId: 'org123' };
      
      const mockOrg = { _id: 'org123', name: 'Test Org', isActive: true };
      Organization.findById = jest.fn().mockResolvedValue(mockOrg);
      
      // Execute
      addOrganizationToRequest(req, res, next);
      
      // Wait for the promise to resolve
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Assert
      expect(Organization.findById).toHaveBeenCalledWith('org123');
      expect(req.organization).toEqual(mockOrg);
      expect(next).toHaveBeenCalled();
    });
    
    test('should not add inactive organization to request', async () => {
      // Setup
      req.user = { organizationId: 'org123' };
      
      const mockOrg = { _id: 'org123', name: 'Test Org', isActive: false };
      Organization.findById = jest.fn().mockResolvedValue(mockOrg);
      
      // Execute
      addOrganizationToRequest(req, res, next);
      
      // Wait for the promise to resolve
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Assert
      expect(Organization.findById).toHaveBeenCalledWith('org123');
      expect(req.organization).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });
    
    test('should handle errors without blocking request flow', async () => {
      // Setup
      req.user = { organizationId: 'org123' };
      
      Organization.findById = jest.fn().mockRejectedValue(new Error('Database error'));
      
      // Execute
      addOrganizationToRequest(req, res, next);
      
      // Wait for the promise to resolve
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Assert
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error retrieving organization'));
      expect(next).toHaveBeenCalled();
    });
    
    test('should continue when user or organizationId is not available', () => {
      // Setup - no user or user without organizationId
      req.user = null;
      
      // Execute
      addOrganizationToRequest(req, res, next);
      
      // Assert
      expect(next).toHaveBeenCalled();
    });
  });
});
