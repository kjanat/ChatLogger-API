import supertest from 'supertest';
import mongoose from 'mongoose';
import { server } from '../../server';
import UserModel from '../../models/user.model'; // Use default import
import OrgModel from '../../models/organization.model'; // Use default import

const userTestObjects = {
    request: supertest,
    server: server,
    User: UserModel, // Assign imported model
    Organization: OrgModel, // Assign imported model
    mongoose: mongoose
};

// Mock the app's listen method for supertest
// userTestObjects.server.listen = jest.fn(); // Removed as we are passing the actual server

// Mock logger
jest.mock('../../utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
}));

describe('User Controller', () => {
    let token: string;
    let userId: string;
    let organizationId: string;

    beforeAll(async () => {
        // await userTestObjects.setupTestDB(); // Removed

        // Create organization first
        const orgData = { name: 'Test Org Main', apiKey: 'dummy-key-main' };
        const org = await new userTestObjects.Organization(orgData).save();
        if (!org || !org._id) {
            throw new Error('Organization creation failed in beforeAll');
        }
        organizationId = org._id.toString();

        // Register a user for testing protected routes
        const res = await userTestObjects.request(userTestObjects.server)
            .post('/api/v1/users/register') // Assuming this is your registration route
            .send({
                username: 'testuser',
                email: 'test@example.com',
                password: 'Password123!',
                organizationId: organizationId
            });
        
        if (res.statusCode !== 201) {
            console.error('Registration failed:', res.body);
            throw new Error('User registration failed in beforeAll hook');
        }

        userId = res.body.data.id;
        token = res.body.token;
    });

    afterAll(async () => {
        // await userTestObjects.setupTestDB.closeDatabase(); // Removed
    });

    describe('POST /api/v1/users/register', () => {
        it('should register a new user successfully', async () => {
            const res = await userTestObjects.request(userTestObjects.server)
                .post('/api/v1/users/register')
                .send({
                    username: 'newuser',
                    email: 'new@example.com',
                    password: 'Password456!',
                    organizationId: organizationId
                });
            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('token');
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data.username).toBe('newuser');
        });

        it('should return 409 if username or email already exists', async () => {
            const res = await userTestObjects.request(userTestObjects.server)
                .post('/api/v1/users/register')
                .send({
                    username: 'testuser', // Existing username
                    email: 'another@example.com',
                    password: 'Password789!',
                     organizationId: organizationId
                });
            expect(res.statusCode).toEqual(409);
        });
    });

    describe('POST /api/v1/auth/login', () => {
        it('should login an existing user successfully', async () => {
            const res = await userTestObjects.request(userTestObjects.server)
                .post('/api/v1/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'Password123!',
                });
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body.data.id).toBe(userId);
        });

        it('should return 401 for invalid credentials', async () => {
            const res = await userTestObjects.request(userTestObjects.server)
                .post('/api/v1/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'WrongPassword!',
                });
            expect(res.statusCode).toEqual(401);
        });
    });

    describe('GET /api/v1/users/profile', () => {
        it('should get the current user profile', async () => {
            const res = await userTestObjects.request(userTestObjects.server)
                .get('/api/v1/users/profile')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.data).toHaveProperty('id', userId);
            expect(res.body.data.email).toBe('test@example.com');
        });

        it('should return 401 if not authenticated', async () => {
            const res = await userTestObjects.request(userTestObjects.server)
                .get('/api/v1/users/profile');
            expect(res.statusCode).toEqual(401);
        });
    });

    describe('POST /api/v1/users/api-key', () => {
        it('should generate an API key for the authenticated user', async () => {
            const res = await userTestObjects.request(userTestObjects.server)
                .post('/api/v1/users/api-key')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('apiKey');
            expect(typeof res.body.apiKey).toBe('string');
            expect(res.body.apiKey.length).toBeGreaterThan(16);
        });

        it('should return 401 if not authenticated', async () => {
            const res = await userTestObjects.request(userTestObjects.server)
                .post('/api/v1/users/api-key');
            expect(res.statusCode).toEqual(401);
        });
    });

    describe('PUT /api/v1/users/:id', () => {
        it('should allow a user to update their own profile', async () => {
            const res = await userTestObjects.request(userTestObjects.server)
                .put(`/api/v1/users/${userId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ username: 'updatedtestuser' });

            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toBe('User updated successfully');
            expect(res.body.data.username).toBe('updatedtestuser');
        });

         it('should prevent a user from updating another user\'s profile', async () => {
             // Create another user
             const otherUserRes = await userTestObjects.request(userTestObjects.server)
                .post('/api/v1/users/register')
                .send({ username: 'otheruser', email: 'other@example.com', password: 'Password!@#', organizationId });
             const otherUserId = otherUserRes.body.data.id;

            const res = await userTestObjects.request(userTestObjects.server)
                .put(`/api/v1/users/${otherUserId}`)
                .set('Authorization', `Bearer ${token}`) // Authenticated as 'testuser'
                .send({ username: 'updatefail' });

            expect(res.statusCode).toEqual(403);
        });
    });

     describe('GET /api/v1/users/:id', () => {
        it('should allow a user to get their own profile by ID', async () => {
            const res = await userTestObjects.request(userTestObjects.server)
                .get(`/api/v1/users/${userId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.data).toHaveProperty('id', userId);
        });

         it('should prevent a user from getting another user\'s profile by ID', async () => {
             const otherUserRes = await userTestObjects.request(userTestObjects.server)
                .post('/api/v1/users/register')
                .send({ username: 'otherget', email: 'otherget@example.com', password: 'Password!@#', organizationId });
             const otherUserId = otherUserRes.body.data.id;

            const res = await userTestObjects.request(userTestObjects.server)
                .get(`/api/v1/users/${otherUserId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toEqual(403);
        });

         it('should return 404 for non-existent user ID', async () => {
            const nonExistentId = new userTestObjects.mongoose.Types.ObjectId().toString();
            const res = await userTestObjects.request(userTestObjects.server)
                 .get(`/api/v1/users/${nonExistentId}`)
                 .set('Authorization', `Bearer ${token}`);
             expect(res.statusCode).toEqual(404);
        });
    });
});
