import { Request, Response, NextFunction } from 'express';
import mongoose, { Types } from 'mongoose'; // Import Types
import { IOrganization } from '../../models/organization.model'; // Import IOrganization
import { IUser } from '../../models/user.model'; // Import IUser
// import Organization from '../../models/organization.model'; // Removed duplicate import
const User = require('../../models/user.model');
const logger = require('../../utils/logger');

// const Organization = require('../../models/organization.model'); // Re-add require before mock <--- REMOVE THIS LINE

// Mock dependencies
jest.mock('../../models/organization.model');
jest.mock('../../models/user.model');
jest.mock('../../utils/logger', () => ({
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
}));

// Helper to create a basic mock ObjectId
const mockObjectId = (id: string): Types.ObjectId => new Types.ObjectId(id);

// Helper to create a basic mock Organization (more complete)
const mockOrg = (id: string, overrides: Partial<IOrganization> = {}): IOrganization => ({
    _id: mockObjectId(id),
    name: `Test Org ${id}`,
    isActive: true,
    apiKey: `key-${id}`,
    settings: new Map(),
    contactEmail: `contact@org${id}.com`,
    description: `Description for Org ${id}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
}) as any; // Use 'as any' for simplicity if not mocking all Document props

// Helper to create a basic mock User (more complete)
const mockUser = (id: string, orgId: string | undefined, overrides: Partial<IUser> = {}): IUser => ({
    _id: mockObjectId(id),
    username: `user-${id}`,
    organizationId: orgId ? mockObjectId(orgId) : undefined, // Use undefined instead of null
    role: 'user', // Default role
    email: `user${id}@test.com`,
    password: 'hashedPassword',
    isActive: true,
    apiKey: `key-${id}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    comparePassword: jest.fn().mockResolvedValue(true),
    generateApiKey: jest.fn().mockReturnValue(`new-key-${id}`),
    ...overrides,
}) as any; // Use 'as any' for simplicity

describe('Organization Auth Middleware', () => {
    // Require the module under test inside describe, after mocks
    const {
        authenticateOrganizationApiKey,
        checkOrganizationAccess,
        addOrganizationToRequest,
    } = require('../organization-auth');

    // Need access to the mocked Organization model within the tests
    const Organization = require('../../models/organization.model');

    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Mock request object
        mockReq = {
            headers: {},
            user: undefined,
            organization: undefined,
            params: {},
            query: {},
            body: {}
        };

        // Mock response object
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        // Mock next function
        mockNext = jest.fn();
    });

    describe('authenticateOrganizationApiKey', () => {
        it('should authenticate with valid API key', async () => {
            mockReq.headers = mockReq.headers ?? {};
            mockReq.headers['x-organization-api-key'] = 'valid-api-key';
            const mockOrgData = mockOrg('org1', { apiKey: 'valid-api-key' }); // Use helper
            (Organization.findOne as jest.Mock).mockResolvedValue(mockOrgData);

            await authenticateOrganizationApiKey(mockReq as Request, mockRes as Response, mockNext);

            expect(Organization.findOne).toHaveBeenCalledWith({ apiKey: 'valid-api-key', isActive: true });
            expect(mockReq.organization).toEqual(mockOrgData);
            expect(mockNext).toHaveBeenCalledTimes(1);
        });

        it('should return 401 when API key is missing', async () => {
            await authenticateOrganizationApiKey(mockReq as Request, mockRes as Response, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Organization API key required' });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 401 when API key is invalid or org not found', async () => {
            mockReq.headers = mockReq.headers ?? {}; // Ensure headers exist
            mockReq.headers['x-organization-api-key'] = 'invalid-key';
            (Organization.findOne as jest.Mock).mockResolvedValue(null);

            await authenticateOrganizationApiKey(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid organization API key' });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should handle database errors during authentication', async () => {
            mockReq.headers = mockReq.headers ?? {}; // Ensure headers exist
            mockReq.headers['x-organization-api-key'] = 'key-causing-error';
            const dbError = new Error('DB went boom');
            (Organization.findOne as jest.Mock).mockRejectedValue(dbError);

            await authenticateOrganizationApiKey(mockReq as Request, mockRes as Response, mockNext);

            expect(logger.error).toHaveBeenCalledWith(`Organization API key authentication error: ${dbError.message}`);
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Organization authentication error' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('checkOrganizationAccess', () => {
        it('should allow superadmins to access any organization', async () => {
            mockReq.user = mockUser('super1', 'org1', { role: 'superadmin' });
            mockReq.organization = mockOrg('org2'); // Different org ID

            await checkOrganizationAccess(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalledTimes(1);
        });

        it('should allow users to access their own organization', async () => {
            const orgId = 'org123';
            mockReq.user = mockUser('user1', orgId);
            mockReq.organization = mockOrg(orgId);

            await checkOrganizationAccess(mockReq as Request, mockRes as Response, mockNext);

            // Check by comparing string IDs (safer with potential undefined)
            expect(mockReq.user?.organizationId?.toString()).toEqual(mockReq.organization?._id?.toString());
            expect(mockNext).toHaveBeenCalledTimes(1);
        });

        it('should deny access for users trying to access different organization', async () => {
            mockReq.user = mockUser('user1', 'org1');
            mockReq.organization = mockOrg('org2'); // Different org

            await checkOrganizationAccess(mockReq as Request, mockRes as Response, mockNext);

            // Add null check for organization before accessing _id
            expect(mockReq.user?.organizationId?.toString()).not.toEqual(mockReq.organization?._id?.toString());
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access denied to this organization' });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should deny access when user has no organization ID', async () => {
            mockReq.user = mockUser('userNoOrg', undefined); // User without orgId (use undefined)
            mockReq.organization = mockOrg('org1');

            await checkOrganizationAccess(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access denied: User not associated with an organization' });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should handle errors during access check', async () => {
            const orgId = 'orgError';
            mockReq.user = mockUser('userError', orgId);
            mockReq.organization = mockOrg(orgId);
            const checkError = new Error('Comparison failed');

            // Simulate error by making organizationId access throw
            Object.defineProperty(mockReq.user, 'organizationId', {
                get: () => { throw checkError; },
                // Add configurable: true if needed, depending on Jest/environment
                configurable: true
            });

            await checkOrganizationAccess(mockReq as Request, mockRes as Response, mockNext);

            expect(logger.error).toHaveBeenCalledWith(`Organization access check error: ${checkError.message}`);
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Internal server error during access check' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('addOrganizationToRequest', () => {
        beforeEach(() => {
            // (Organization.findById as jest.Mock).mockClear(); <-- This should work now
             Organization.findById.mockClear(); // Clear the mock directly
        });

        it('should skip if req.organization is already set', async () => {
            mockReq.organization = mockOrg('org1');
            await addOrganizationToRequest(mockReq as Request, mockRes as Response, mockNext);
            expect(Organization.findById).not.toHaveBeenCalled();
            expect(mockNext).toHaveBeenCalledTimes(1);
        });

        it('should add organization from authenticated user (req.user.organizationId)', async () => {
            const orgId = 'orgUser1';
            const orgIdObj = mockObjectId(orgId);
            mockReq.user = mockUser('user1', orgId);
            const mockOrgData = mockOrg(orgId);
            // (Organization.findById as jest.Mock).mockResolvedValue(mockOrgData);
            Organization.findById.mockResolvedValue(mockOrgData);

            await addOrganizationToRequest(mockReq as Request, mockRes as Response, mockNext);

            expect(Organization.findById).toHaveBeenCalledWith(orgIdObj);
            expect(mockReq.organization).toEqual(mockOrgData);
            expect(mockNext).toHaveBeenCalledTimes(1);
        });

        it('should add organization from query parameter (req.query.organizationId)', async () => {
            const orgIdString = '605c72ef1c9d440000a1b2c4';
            const orgIdObj = mockObjectId(orgIdString);
            mockReq.query = { organizationId: orgIdString };
            const mockOrgData = mockOrg(orgIdString);
            // (Organization.findById as jest.Mock).mockResolvedValue(mockOrgData);
            Organization.findById.mockResolvedValue(mockOrgData);

            await addOrganizationToRequest(mockReq as Request, mockRes as Response, mockNext);

            expect(Organization.findById).toHaveBeenCalledWith(orgIdObj);
            expect(mockReq.organization).toEqual(mockOrgData);
            expect(mockNext).toHaveBeenCalledTimes(1);
        });

        it('should add organization from request body (req.body.organizationId)', async () => {
            const orgIdString = '605c72ef1c9d440000a1b2c5';
            const orgIdObj = mockObjectId(orgIdString);
            mockReq.body = { organizationId: orgIdString };
            const mockOrgData = mockOrg(orgIdString);
             // (Organization.findById as jest.Mock).mockResolvedValue(mockOrgData);
             Organization.findById.mockResolvedValue(mockOrgData);

            await addOrganizationToRequest(mockReq as Request, mockRes as Response, mockNext);

            expect(Organization.findById).toHaveBeenCalledWith(orgIdObj);
            expect(mockReq.organization).toEqual(mockOrgData);
            expect(mockNext).toHaveBeenCalledTimes(1);
        });

        it('should add organization from route parameters (req.params.organizationId)', async () => {
            const orgIdString = '605c72ef1c9d440000a1b2c6';
            const orgIdObj = mockObjectId(orgIdString);
            mockReq.params = { organizationId: orgIdString };
            const mockOrgData = mockOrg(orgIdString);
            // (Organization.findById as jest.Mock).mockResolvedValue(mockOrgData);
            Organization.findById.mockResolvedValue(mockOrgData);

            await addOrganizationToRequest(mockReq as Request, mockRes as Response, mockNext);

            expect(Organization.findById).toHaveBeenCalledWith(orgIdObj);
            expect(mockReq.organization).toEqual(mockOrgData);
            expect(mockNext).toHaveBeenCalledTimes(1);
        });

        it('should return 404 if Organization.findById returns null', async () => {
             const orgId = 'orgNotFound';
             const orgIdObj = mockObjectId(orgId);
             mockReq.user = mockUser('user2', orgId);
            // (Organization.findById as jest.Mock).mockResolvedValue(null);
             Organization.findById.mockResolvedValue(null);

            await addOrganizationToRequest(mockReq as Request, mockRes as Response, mockNext);

             expect(Organization.findById).toHaveBeenCalledWith(orgIdObj);
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Organization not found for the provided ID' });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 400 if no organization ID can be determined', async () => {
            // Setup: mockReq has no user, query, body, or params with organizationId
            mockReq.user = undefined;
            mockReq.query = {};
            mockReq.body = {};
            mockReq.params = {};

            await addOrganizationToRequest(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Could not determine Organization ID for the request' });
            expect(mockNext).not.toHaveBeenCalled();
        });

         it('should handle database errors during findById', async () => {
             const orgId = 'orgError';
             const orgIdObj = mockObjectId(orgId);
             mockReq.user = mockUser('user3', orgId);
             const dbError = new Error('Find failed');
             // (Organization.findById as jest.Mock).mockRejectedValue(dbError);
             Organization.findById.mockRejectedValue(dbError);

            await addOrganizationToRequest(mockReq as Request, mockRes as Response, mockNext);

            expect(logger.error).toHaveBeenCalledWith(`Error adding organization to request: ${dbError.message}`);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Error processing organization information' });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should ignore invalid ObjectId strings from query/body/params', async () => {
             mockReq.query = { organizationId: 'invalid-query-id' };
             mockReq.body = { organizationId: 'invalid-body-id' };
             mockReq.params = { organizationId: 'invalid-param-id' };
             // No user attached

            await addOrganizationToRequest(mockReq as Request, mockRes as Response, mockNext);

            // Should eventually fall through to the 400 "Could not determine" case
            expect(Organization.findById).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Could not determine Organization ID for the request' });
            expect(mockNext).not.toHaveBeenCalled();
        });

    });
});
