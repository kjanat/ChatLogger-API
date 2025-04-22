const orgTestObjects = {
    mongoose: require('mongoose'),
    request: require('supertest'),
    server: require('../../server').default,
    Organization: require('../../models/organization.model'),
    User: require('../../models/user.model'),
};

// Mock logger
jest.mock('../../utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
}));

// Mock pagination middleware
jest.mock('../../middleware/pagination', () => jest.fn(() => (req: any, res: any, next: any) => {
    // Simulate pagination by attaching dummy data if needed by test
    if (req.simulatePagination) {
         req.paginatedResults = { 
            data: req.paginationData || [], 
            currentPage: req.query?.page || 1, 
            totalPages: req.paginationTotalPages || 1,
            totalCount: req.paginationTotalCount || (req.paginationData || []).length
         };
    }
    next();
}));

describe('Organization Controller', () => {
    let superAdminToken: string;
    let adminToken: string;
    let userToken: string;
    let orgId1: string;
    let orgId2: string;
    let adminUserId: string;

    beforeAll(async () => {
        // Set up any necessary mocks or initial state if needed
        // await orgTestObjects.setupTestDB(); // Removed

        // Create Super Admin User (needs an initial org or special handling)
        // Assuming a predefined superadmin or creating one without org restrictions
        const superAdminRes = await orgTestObjects.request(orgTestObjects.server).post('/auth/local/register') // Adjust if route is different
            .send({ username: 'super', email: 'super@admin.com', password: 'Password123!', role: 'superadmin' });
        superAdminToken = superAdminRes.body.token; // Adjust based on actual response

        // Create Organization 1
        const orgRes1 = await orgTestObjects.request(orgTestObjects.server).post('/api/v1/organizations')
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({ name: 'Test Org 1', contactEmail: 'org1@test.com' });
        orgId1 = orgRes1.body.data.id;

        // Create Organization 2
        const orgRes2 = await orgTestObjects.request(orgTestObjects.server).post('/api/v1/organizations')
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({ name: 'Test Org 2', contactEmail: 'org2@test.com' });
        orgId2 = orgRes2.body.data.id;

        // Create Admin for Org 1
        const adminRes = await orgTestObjects.request(orgTestObjects.server).post('/api/v1/users') // Assuming a user creation endpoint exists
             .set('Authorization', `Bearer ${superAdminToken}`)
             .send({ username: 'org1admin', email: 'admin@org1.com', password: 'Password123!', organizationId: orgId1, role: 'admin' });
        adminUserId = adminRes.body.data.id; 
        // Log in admin to get token
        const adminLoginRes = await orgTestObjects.request(orgTestObjects.server).post('/api/v1/auth/login')
            .send({ email: 'admin@org1.com', password: 'Password123!' });
        adminToken = adminLoginRes.body.token;

        // Create User for Org 1
        const userRes = await orgTestObjects.request(orgTestObjects.server).post('/api/v1/users')
             .set('Authorization', `Bearer ${superAdminToken}`)
             .send({ username: 'org1user', email: 'user@org1.com', password: 'Password123!', organizationId: orgId1, role: 'user' });
        // Log in user to get token
        const userLoginRes = await orgTestObjects.request(orgTestObjects.server).post('/api/v1/auth/login')
            .send({ email: 'user@org1.com', password: 'Password123!' });
        userToken = userLoginRes.body.token;
    });

    afterAll(async () => {
        // Clean up mocks or state if needed
        // await orgTestObjects.setupTestDB.closeDatabase(); // Removed
    });

    describe('POST /api/v1/organizations', () => {
        it('should allow superadmin to create an organization', async () => {
            const res = await orgTestObjects.request(orgTestObjects.server)
                .post('/api/v1/organizations')
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({ name: 'New Org By Super', contactEmail: 'new@super.com' });
            expect(res.statusCode).toEqual(201);
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data.name).toBe('New Org By Super');
        });

        it('should prevent admin from creating an organization', async () => {
            const res = await orgTestObjects.request(orgTestObjects.server)
                .post('/api/v1/organizations')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Admin Created Org', contactEmail: 'admin@creation.com' });
            expect(res.statusCode).toEqual(403);
        });

        it('should prevent user from creating an organization', async () => {
             const res = await orgTestObjects.request(orgTestObjects.server)
                .post('/api/v1/organizations')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ name: 'User Created Org' });
            expect(res.statusCode).toEqual(403);
        });

         it('should return 409 if organization name already exists', async () => {
            const res = await orgTestObjects.request(orgTestObjects.server)
                .post('/api/v1/organizations')
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({ name: 'Test Org 1' }); // Duplicate name
            expect(res.statusCode).toEqual(409);
        });
    });

    describe('GET /api/v1/organizations', () => {
        it('should allow superadmin to get all organizations', async () => {
            const res = await orgTestObjects.request(orgTestObjects.server)
                .get('/api/v1/organizations')
                .set('Authorization', `Bearer ${superAdminToken}`);
                
            // Assuming pagination middleware is mocked or handled
            // If using the mock above, need to simulate pagination
            // For a real endpoint test, check for paginated structure
            expect(res.statusCode).toEqual(200);
             // Check based on mocked pagination or actual response structure
             expect(res.body.data).toBeInstanceOf(Array); 
             expect(res.body.data.length).toBeGreaterThanOrEqual(2);
        });

        it('should prevent admin from getting all organizations', async () => {
            const res = await orgTestObjects.request(orgTestObjects.server)
                .get('/api/v1/organizations')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(403);
        });

        it('should prevent user from getting all organizations', async () => {
             const res = await orgTestObjects.request(orgTestObjects.server)
                .get('/api/v1/organizations')
                .set('Authorization', `Bearer ${userToken}`);
            expect(res.statusCode).toEqual(403);
        });
    });

    describe('GET /api/v1/organizations/:id', () => {
        it('should allow superadmin to get any organization by ID', async () => {
            const res = await orgTestObjects.request(orgTestObjects.server)
                .get(`/api/v1/organizations/${orgId2}`)
                .set('Authorization', `Bearer ${superAdminToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.data).toHaveProperty('id', orgId2);
            expect(res.body.data.name).toBe('Test Org 2');
        });

        it('should allow admin to get their own organization by ID', async () => {
            const res = await orgTestObjects.request(orgTestObjects.server)
                .get(`/api/v1/organizations/${orgId1}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.data).toHaveProperty('id', orgId1);
            expect(res.body.data.name).toBe('Test Org 1');
        });

        it('should prevent admin from getting another organization by ID', async () => {
            const res = await orgTestObjects.request(orgTestObjects.server)
                .get(`/api/v1/organizations/${orgId2}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(403);
        });

        it('should prevent user from getting any organization by ID', async () => {
            const res = await orgTestObjects.request(orgTestObjects.server)
                .get(`/api/v1/organizations/${orgId1}`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(res.statusCode).toEqual(403);
        });

         it('should return 404 for non-existent organization ID', async () => {
            const nonExistentId = new orgTestObjects.mongoose.Types.ObjectId().toString();
            const res = await orgTestObjects.request(orgTestObjects.server)
                .get(`/api/v1/organizations/${nonExistentId}`)
                .set('Authorization', `Bearer ${superAdminToken}`);
            expect(res.statusCode).toEqual(404);
        });
    });

    describe('PUT /api/v1/organizations/:id', () => {
        it('should allow superadmin to update any organization', async () => {
            const res = await orgTestObjects.request(orgTestObjects.server)
                .put(`/api/v1/organizations/${orgId2}`)
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({ description: 'Updated by SuperAdmin', isActive: false });
            expect(res.statusCode).toEqual(200);
            expect(res.body.data.isActive).toBe(false);
        });

        it('should allow admin to update their own organization', async () => {
            const res = await orgTestObjects.request(orgTestObjects.server)
                .put(`/api/v1/organizations/${orgId1}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ description: 'Updated by Org1 Admin' });
            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toContain('updated successfully');
        });

         it('should prevent admin from updating another organization', async () => {
            const res = await orgTestObjects.request(orgTestObjects.server)
                .put(`/api/v1/organizations/${orgId2}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ description: 'Update Fail' });
            expect(res.statusCode).toEqual(403);
        });

        it('should prevent user from updating any organization', async () => {
            const res = await orgTestObjects.request(orgTestObjects.server)
                .put(`/api/v1/organizations/${orgId1}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ description: 'Update Fail User' });
            expect(res.statusCode).toEqual(403);
        });

        it('should return 409 if updating name to an existing name', async () => {
            const res = await orgTestObjects.request(orgTestObjects.server)
                .put(`/api/v1/organizations/${orgId1}`)
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({ name: 'Test Org 2' }); // Name collision
            expect(res.statusCode).toEqual(409);
        });
    });

    describe('DELETE /api/v1/organizations/:id', () => {
         it('should allow superadmin to delete an organization (if no users)', async () => {
             // Create an org with no users to test deletion
            const emptyOrgRes = await orgTestObjects.request(orgTestObjects.server).post('/api/v1/organizations')
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({ name: 'Empty Org For Deletion' });
            const emptyOrgId = emptyOrgRes.body.data.id;

            const res = await orgTestObjects.request(orgTestObjects.server)
                .delete(`/api/v1/organizations/${emptyOrgId}`)
                .set('Authorization', `Bearer ${superAdminToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toContain('deleted successfully');
        });

        it('should prevent superadmin from deleting organization with active users', async () => {
             const res = await orgTestObjects.request(orgTestObjects.server)
                .delete(`/api/v1/organizations/${orgId1}`)
                .set('Authorization', `Bearer ${superAdminToken}`);
            expect(res.statusCode).toEqual(400); // Or appropriate error code
            expect(res.body.message).toContain('Cannot delete organization with active user(s)');
        });

         it('should prevent admin from deleting their organization', async () => {
            const res = await orgTestObjects.request(orgTestObjects.server)
                .delete(`/api/v1/organizations/${orgId1}`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(403);
        });

        it('should prevent user from deleting any organization', async () => {
            const res = await orgTestObjects.request(orgTestObjects.server)
                .delete(`/api/v1/organizations/${orgId1}`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(res.statusCode).toEqual(403);
        });
    });

     describe('POST /api/v1/organizations/:id/regenerate-key', () => {
        it('should allow superadmin to regenerate API key for any org', async () => {
            const initialOrg = await orgTestObjects.Organization.findById(orgId2);
            const initialApiKey = initialOrg.apiKey;

            const res = await orgTestObjects.request(orgTestObjects.server)
                .post(`/api/v1/organizations/${orgId2}/regenerate-key`)
                .set('Authorization', `Bearer ${superAdminToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('apiKey');
            expect(res.body.apiKey).not.toBe(initialApiKey);
        });

         it('should allow admin to regenerate API key for their own org', async () => {
             const initialOrg = await orgTestObjects.Organization.findById(orgId1);
             const initialApiKey = initialOrg.apiKey;

             const res = await orgTestObjects.request(orgTestObjects.server)
                .post(`/api/v1/organizations/${orgId1}/regenerate-key`)
                .set('Authorization', `Bearer ${adminToken}`);

             expect(res.statusCode).toEqual(200);
             expect(res.body).toHaveProperty('apiKey');
             expect(res.body.apiKey).not.toBe(initialApiKey);
        });

         it('should prevent admin from regenerating key for another org', async () => {
            const res = await orgTestObjects.request(orgTestObjects.server)
                .post(`/api/v1/organizations/${orgId2}/regenerate-key`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(403);
        });

         it('should prevent user from regenerating key', async () => {
             const res = await orgTestObjects.request(orgTestObjects.server)
                .post(`/api/v1/organizations/${orgId1}/regenerate-key`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(res.statusCode).toEqual(403);
        });
    });

});
