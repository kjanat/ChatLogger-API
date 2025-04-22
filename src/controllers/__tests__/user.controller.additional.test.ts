import supertest from 'supertest';
import mongoose from 'mongoose';
import { server } from '../../server';
import UserModel from '../../models/user.model';
import OrgModel from '../../models/organization.model';

const userAddTestObjects = {
    request: supertest,
    server: server,
    User: UserModel,
    Organization: OrgModel,
    mongoose: mongoose
};

// Mock logger
jest.mock('../../utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
}));

describe('User Controller - Additional Tests', () => {
    let superAdminToken: string;
    let adminToken: string;
    let userToken: string;
    let orgId: string;
    let adminUserId: string;
    let regularUserId: string;

    beforeAll(async () => {
        // await userAddTestObjects.setupTestDB(); // Removed

        // Create Organization
        const orgData = { name: 'User Test Org Additional', apiKey: 'dummy-key-add' };
        const org = await new userAddTestObjects.Organization(orgData).save();
        if (!org || !org._id) {
            throw new Error('Organization creation failed in beforeAll');
        }
        orgId = org._id.toString();

        // Create Super Admin User 
        const superAdminRes = await userAddTestObjects.request(userAddTestObjects.server).post('/auth/local/register') // Assuming route
             .send({ username: 'superadd', email: 'superadd@test.com', password: 'Password123!', role: 'superadmin' });
        superAdminToken = superAdminRes.body.token; // Adjust based on actual response structure

        // Create Admin for the Org
        const adminRegRes = await userAddTestObjects.request(userAddTestObjects.server).post('/api/v1/users')
             .set('Authorization', `Bearer ${superAdminToken}`)
             .send({ username: 'adminadd', email: 'adminadd@test.com', password: 'Password123!', organizationId: orgId, role: 'admin' });
        adminUserId = adminRegRes.body.data.id;
        const adminLoginRes = await userAddTestObjects.request(userAddTestObjects.server).post('/api/v1/auth/login')
            .send({ email: 'adminadd@test.com', password: 'Password123!' });
        adminToken = adminLoginRes.body.token;

        // Create Regular User for the Org
        const userRegRes = await userAddTestObjects.request(userAddTestObjects.server).post('/api/v1/users')
             .set('Authorization', `Bearer ${superAdminToken}`)
             .send({ username: 'useradd', email: 'useradd@test.com', password: 'Password123!', organizationId: orgId, role: 'user' });
        regularUserId = userRegRes.body.data.id;
        const userLoginRes = await userAddTestObjects.request(userAddTestObjects.server).post('/api/v1/auth/login')
            .send({ email: 'useradd@test.com', password: 'Password123!' });
        userToken = userLoginRes.body.token;
    });

    afterAll(async () => {
        // await userAddTestObjects.setupTestDB.closeDatabase(); // Removed
    });

    describe('GET /api/v1/users (Get Users in Organization)', () => {
         it('should allow admin to get users in their organization', async () => {
            const res = await userAddTestObjects.request(userAddTestObjects.server)
                .get('/api/v1/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ organizationId: orgId }); // Optional if middleware handles it

            expect(res.statusCode).toEqual(200);
            expect(res.body.data).toBeInstanceOf(Array);
            expect(res.body.data.length).toBeGreaterThanOrEqual(2); // Admin + User
        });

         it('should allow superadmin to get users in any organization', async () => {
             const res = await userAddTestObjects.request(userAddTestObjects.server)
                .get('/api/v1/users')
                .set('Authorization', `Bearer ${superAdminToken}`)
                .query({ organizationId: orgId });

            expect(res.statusCode).toEqual(200);
            expect(res.body.data).toBeInstanceOf(Array);
            expect(res.body.data.length).toBeGreaterThanOrEqual(2);
        });

         it('should prevent regular user from getting users list', async () => {
             const res = await userAddTestObjects.request(userAddTestObjects.server)
                .get('/api/v1/users')
                .set('Authorization', `Bearer ${userToken}`)
                .query({ organizationId: orgId });

            expect(res.statusCode).toEqual(403);
        });

        it('should filter users by role', async () => {
            const res = await userAddTestObjects.request(userAddTestObjects.server)
                .get('/api/v1/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ role: 'admin', organizationId: orgId });

             expect(res.statusCode).toEqual(200);
             expect(res.body.data.length).toBe(1);
             expect(res.body.data[0].role).toBe('admin');
        });

        it('should filter users by isActive status', async () => {
             // Deactivate the regular user first
             await userAddTestObjects.request(userAddTestObjects.server)
                .put(`/api/v1/users/${regularUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ isActive: false });

            const res = await userAddTestObjects.request(userAddTestObjects.server)
                .get('/api/v1/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ isActive: 'false', organizationId: orgId });

             expect(res.statusCode).toEqual(200);
             expect(res.body.data.length).toBe(1);
             expect(res.body.data[0].isActive).toBe(false);

             // Reactivate for other tests
             await userAddTestObjects.request(userAddTestObjects.server)
                .put(`/api/v1/users/${regularUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ isActive: true });
        });
    });

     describe('GET /api/v1/users/search', () => {
         it('should allow admin to search users within their organization', async () => {
            const res = await userAddTestObjects.request(userAddTestObjects.server)
                .get('/api/v1/users/search')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ username: 'adminadd', organizationId: orgId }); // Search for the admin

            expect(res.statusCode).toEqual(200);
            expect(res.body.data).toBeInstanceOf(Array);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].username).toBe('adminadd');
        });

        it('should allow superadmin to search users across organizations or filter by one', async () => {
             // Search within specific org
             const res1 = await userAddTestObjects.request(userAddTestObjects.server)
                .get('/api/v1/users/search')
                .set('Authorization', `Bearer ${superAdminToken}`)
                .query({ email: 'useradd@test.com', organizationId: orgId });
            expect(res1.statusCode).toEqual(200);
            expect(res1.body.data.length).toBe(1);

             // Search across all orgs (if supported by endpoint logic)
             // const res2 = await userAddTestObjects.request(userAddTestObjects.server)
             //    .get('/api/v1/users/search')
             //    .set('Authorization', `Bearer ${superAdminToken}`)
             //    .query({ email: 'test.com' }); // Find multiple potentially
             // expect(res2.statusCode).toEqual(200);
             // expect(res2.body.data.length).toBeGreaterThanOrEqual(2);
        });

        it('should prevent regular user from searching users', async () => {
             const res = await userAddTestObjects.request(userAddTestObjects.server)
                .get('/api/v1/users/search')
                .set('Authorization', `Bearer ${userToken}`)
                .query({ username: 'any' });
            expect(res.statusCode).toEqual(403);
        });

         it('should handle various search filters (role, isActive)', async () => {
             const res = await userAddTestObjects.request(userAddTestObjects.server)
                .get('/api/v1/users/search')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ role: 'user', isActive: 'true', organizationId: orgId });

            expect(res.statusCode).toEqual(200);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].role).toBe('user');
            expect(res.body.data[0].isActive).toBe(true);
        });
    });

    describe('POST /api/v1/users (Admin/Superadmin Creation)', () => {
         it('should allow superadmin to create an admin user', async () => {
             const res = await userAddTestObjects.request(userAddTestObjects.server)
                .post('/api/v1/users')
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({
                    username: 'newadminbysuper',
                    email: 'newadmin@super.com',
                    password: 'Password123!',
                    organizationId: orgId,
                    role: 'admin'
                });
             expect(res.statusCode).toEqual(201);
             expect(res.body.data.role).toBe('admin');
             expect(res.body.data.organizationId).toBe(orgId);
        });

        it('should allow superadmin to create a superadmin user', async () => {
            // Creating a superadmin might not require an organization ID
            const res = await userAddTestObjects.request(userAddTestObjects.server)
                .post('/api/v1/users')
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({
                    username: 'newsuperadmin',
                    email: 'newsuper@super.com',
                    password: 'Password123!',
                    // organizationId: orgId, // Optional for superadmin? Check logic
                    role: 'superadmin'
                });
             expect(res.statusCode).toEqual(201);
             expect(res.body.data.role).toBe('superadmin');
        });

        it('should prevent admin from creating admin/superadmin users', async () => {
             const resAdmin = await userAddTestObjects.request(userAddTestObjects.server)
                .post('/api/v1/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    username: 'adminbyadmin',
                    email: 'adminbyadmin@test.com',
                    password: 'Password123!',
                    organizationId: orgId,
                    role: 'admin' // Attempting to create admin
                });
             expect(resAdmin.statusCode).toEqual(403);

            const resSuper = await userAddTestObjects.request(userAddTestObjects.server)
                .post('/api/v1/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    username: 'superbyadmin',
                    email: 'superbyadmin@test.com',
                    password: 'Password123!',
                    organizationId: orgId,
                    role: 'superadmin' // Attempting to create superadmin
                });
             expect(resSuper.statusCode).toEqual(403);
        });

         it('should return 400 if role is invalid or missing for admin creation', async () => {
             const res = await userAddTestObjects.request(userAddTestObjects.server)
                .post('/api/v1/users')
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({
                    username: 'invalidroleuser',
                    email: 'invalid@role.com',
                    password: 'Password123!',
                    organizationId: orgId,
                    role: 'editor' // Invalid role for this endpoint maybe?
                });
             expect(res.statusCode).toEqual(400);
        });

         it('should return 409 if username/email already exists during admin creation', async () => {
             const res = await userAddTestObjects.request(userAddTestObjects.server)
                .post('/api/v1/users')
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({
                    username: 'adminadd', // Existing username
                    email: 'newadmin@collision.com',
                    password: 'Password123!',
                    organizationId: orgId,
                    role: 'admin'
                });
             expect(res.statusCode).toEqual(409);
        });
    });
});
