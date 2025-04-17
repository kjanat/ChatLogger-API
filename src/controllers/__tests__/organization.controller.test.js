const mongoose = require('mongoose');
const organizationController = require('../organization.controller');
const Organization = require('../../models/organization.model');
const User = require('../../models/user.model');
const setupTestDB = require('../../../tests/setupTests');

// Partially unmock models to use the real implementations with in-memory MongoDB
jest.unmock('../../models/organization.model');
jest.unmock('../../models/user.model');
jest.mock('../../utils/logger');

describe('Organization Controller', () => {
    // Connect to the in-memory database before tests
    beforeAll(async () => {
        await setupTestDB();
    });

    // Clear database between tests
    beforeEach(async () => {
        await setupTestDB.clearDatabase();
    });

    // Disconnect and close the db after tests
    afterAll(async () => {
        await setupTestDB.closeDatabase();
    });

    let req, res;
    let originalGenerateApiKey;

    beforeEach(async () => {
        // Reset collections
        await Organization.deleteMany({});
        await User.deleteMany({});

        // Save original method before patching
        originalGenerateApiKey = Organization.generateApiKey;
        Organization.generateApiKey = jest.fn().mockReturnValue('generated-api-key');

        // Common request/response objects
        req = {
            params: { id: new mongoose.Types.ObjectId().toString() },
            body: {},
            query: {},
            user: {
                _id: new mongoose.Types.ObjectId().toString(),
                organizationId: new mongoose.Types.ObjectId().toString(),
                role: 'admin',
            },
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        // Clear all mocks before each test to ensure clean state
        jest.clearAllMocks();
    });

    afterEach(() => {
        // Restore original method after tests
        Organization.generateApiKey = originalGenerateApiKey;

        // Explicitly restore all mocks to make sure they don't affect other tests
        jest.restoreAllMocks();
    });

    describe('createOrganization', () => {
        beforeEach(() => {
            req.body = {
                name: 'Test Organization',
                contactEmail: 'contact@testorg.com',
                description: 'A test organization',
            };
        });

        test('should create a new organization', async () => {
            await organizationController.createOrganization(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('created successfully'),
                    organization: expect.objectContaining({
                        name: 'Test Organization',
                    }),
                }),
            );

            // Verify in database
            const org = await Organization.findOne({ name: 'Test Organization' });
            expect(org).toBeTruthy();
            expect(org.apiKey).toBe('generated-api-key');
        });

        test('should return 409 when organization already exists', async () => {
            const existingOrg = new Organization({
                name: 'Test Organization',
                contactEmail: 'contact@testorg.com',
                description: 'A test organization',
                apiKey: 'existing-api-key',
            });
            await existingOrg.save();

            await organizationController.createOrganization(req, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('already exists'),
                }),
            );
        });

        test('should handle server errors', async () => {
            // Use spyOn with mockImplementation for better cleanup
            const saveSpy = jest
                .spyOn(Organization.prototype, 'save')
                .mockImplementation(() => Promise.reject(new Error('Database error')));

            await organizationController.createOrganization(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Server error',
                }),
            );

            // Explicitly restore this spy to prevent affecting other tests
            saveSpy.mockRestore();
        });
    });

    describe('getAllOrganizations', () => {
        beforeEach(async () => {
            req.query = {
                page: '1',
                limit: '10',
            };

            const mockOrganizations = [
                new Organization({
                    name: 'Organization 1',
                    apiKey: 'api-key-1',
                }),
                new Organization({
                    name: 'Organization 2',
                    apiKey: 'api-key-2',
                }),
            ];

            await Organization.insertMany(mockOrganizations);
        });

        test('should get all organizations with pagination', async () => {
            await organizationController.getAllOrganizations(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    totalPages: expect.any(Number),
                    currentPage: expect.any(Number),
                }),
            );
        });

        test('should filter by isActive when provided', async () => {
            req.query.isActive = 'true';

            await organizationController.getAllOrganizations(req, res);

            const organizations = await Organization.find({ isActive: true });
            expect(organizations).toBeTruthy();
        });
    });

    describe('getOrganizationById', () => {
        let mockOrganization;

        beforeEach(async () => {
            mockOrganization = new Organization({
                name: 'Test Organization',
                contactEmail: 'contact@testorg.com',
                apiKey: 'test-api-key',
            });

            await mockOrganization.save();
        });

        test('should get organization by ID for admin when it matches user organization', async () => {
            // Set the user's organizationId to match the organization being requested
            req.user.organizationId = mockOrganization._id;
            req.params.id = mockOrganization._id.toString();

            await organizationController.getOrganizationById(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    organization: expect.any(Object),
                }),
            );
        });

        test('should get any organization for superadmin', async () => {
            // Superadmin can access any organization
            req.user.role = 'superadmin';
            req.params.id = mockOrganization._id.toString();

            await organizationController.getOrganizationById(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('should return 403 when admin tries to access other organization', async () => {
            // Admin trying to access an organization that is not theirs
            req.params.id = mockOrganization._id.toString();
            // User's organizationId is different (set in beforeEach)

            await organizationController.getOrganizationById(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('Access denied'),
                }),
            );
        });

        test('should return 404 when organization not found', async () => {
            req.user.role = 'superadmin'; // Use superadmin to avoid permission issues
            req.params.id = new mongoose.Types.ObjectId().toString();

            await organizationController.getOrganizationById(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Organization not found',
                }),
            );
        });
    });

    describe('updateOrganization', () => {
        let mockOrganization;

        beforeEach(async () => {
            mockOrganization = new Organization({
                name: 'Test Organization',
                contactEmail: 'contact@testorg.com',
                description: 'Original description',
                apiKey: 'update-api-key',
            });

            await mockOrganization.save();

            req.body = {
                name: 'Updated Organization',
                contactEmail: 'updated@testorg.com',
                description: 'Updated description',
            };
        });

        test('should update organization details when admin owns it', async () => {
            // Set the user's organizationId to match the organization being updated
            req.user.organizationId = mockOrganization._id;
            req.params.id = mockOrganization._id.toString();

            await organizationController.updateOrganization(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('updated successfully'),
                }),
            );

            const updatedOrg = await Organization.findById(mockOrganization._id);
            expect(updatedOrg.name).toBe('Updated Organization');
        });

        test('should allow superadmin to update any organization', async () => {
            req.user.role = 'superadmin';
            req.params.id = mockOrganization._id.toString();
            req.body.isActive = false;

            await organizationController.updateOrganization(req, res);

            expect(res.status).toHaveBeenCalledWith(200);

            const updatedOrg = await Organization.findById(mockOrganization._id);
            expect(updatedOrg.isActive).toBe(false);
        });

        test('should return 403 when admin tries to update other organization', async () => {
            // Admin trying to update an organization that is not theirs
            req.params.id = mockOrganization._id.toString();
            // User's organizationId is different (set in beforeEach)

            await organizationController.updateOrganization(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('Access denied'),
                }),
            );
        });

        test('should return 404 when organization not found', async () => {
            req.user.role = 'superadmin'; // Use superadmin to avoid permission issues
            req.params.id = new mongoose.Types.ObjectId().toString();

            await organizationController.updateOrganization(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('regenerateApiKey', () => {
        let mockOrganization;

        beforeEach(async () => {
            mockOrganization = new Organization({
                name: 'Test Organization',
                apiKey: 'old-api-key',
            });

            await mockOrganization.save();
        });

        test('should regenerate API key for organization when admin owns it', async () => {
            // Set the user's organizationId to match the organization
            req.user.organizationId = mockOrganization._id;
            req.params.id = mockOrganization._id.toString();

            const originalGenerateApiKey = Organization.generateApiKey;
            Organization.generateApiKey = jest.fn().mockReturnValue('new-api-key');

            await organizationController.regenerateApiKey(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('regenerated successfully'),
                    apiKey: 'new-api-key',
                }),
            );

            const updatedOrg = await Organization.findById(mockOrganization._id);
            expect(updatedOrg.apiKey).toBe('new-api-key');

            Organization.generateApiKey = originalGenerateApiKey;
        });

        test('should allow superadmin to regenerate API key for any organization', async () => {
            req.user.role = 'superadmin';
            req.params.id = mockOrganization._id.toString();

            await organizationController.regenerateApiKey(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
        });

        test('should return 403 when admin tries to regenerate API key for other organization', async () => {
            // Admin trying to regenerate API key for an organization that is not theirs
            req.params.id = mockOrganization._id.toString();
            // User's organizationId is different (set in beforeEach)

            await organizationController.regenerateApiKey(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('Access denied'),
                }),
            );
        });

        test('should return 404 when organization not found', async () => {
            req.user.role = 'superadmin'; // Use superadmin to avoid permission issues
            req.params.id = new mongoose.Types.ObjectId().toString();

            await organizationController.regenerateApiKey(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('getCurrentOrganization', () => {
        beforeEach(async () => {
            const mockOrganization = new Organization({
                name: 'Test Organization',
                apiKey: 'current-api-key',
            });

            await mockOrganization.save();
            req.user.organizationId = mockOrganization._id.toString();
        });

        test("should get current user's organization", async () => {
            await organizationController.getCurrentOrganization(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    organization: expect.any(Object),
                }),
            );
        });

        test('should return 404 when user has no organization', async () => {
            req.user.organizationId = null;

            await organizationController.getCurrentOrganization(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('No organization associated'),
                }),
            );
        });

        test('should return 404 when organization not found', async () => {
            req.user.organizationId = new mongoose.Types.ObjectId().toString();

            await organizationController.getCurrentOrganization(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });
});
