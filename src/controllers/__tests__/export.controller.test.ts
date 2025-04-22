const exportTestObjects = {
    request: require('supertest'),
    server: require('../../server').default,
    Chat: require('../../models/chat.model'),
    Message: require('../../models/message.model'),
    User: require('../../models/user.model'),
    mongoose: require('mongoose')
};

// Mock logger
jest.mock('../../utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
}));

describe('Export Controller', () => {
    let adminToken: string;
    let userToken: string;
    let userId: string;
    let organizationId: string;
    let chatId1: string;
    let chatId2: string;

    beforeAll(async () => {
        // Create organization
        const org = new exportTestObjects.mongoose.Types.ObjectId();
        organizationId = org.toString();

        // Create Admin User
        const adminRes = await exportTestObjects.request(exportTestObjects.server)
            .post('/api/v1/users/register') // Use a distinct endpoint or logic for creating admin if needed
            .send({
                username: 'exportadmin',
                email: 'exportadmin@test.com',
                password: 'Password123!',
                organizationId: organizationId,
                role: 'admin' // Assuming registration can set role, or update separately
            });
        // If registration doesn't set role, update it (requires a user update endpoint)
        // await exportTestObjects.request(exportTestObjects.server).put(`/api/v1/users/${adminRes.body.data.id}`).set('Authorization', `Bearer ${SUPERADMIN_TOKEN}`).send({ role: 'admin' });
        adminToken = adminRes.body.token;

        // Create Regular User
        const userRes = await exportTestObjects.request(exportTestObjects.server)
            .post('/api/v1/users/register')
            .send({
                username: 'exportuser',
                email: 'exportuser@test.com',
                password: 'Password123!',
                organizationId: organizationId
            });
        userToken = userRes.body.token;
        userId = userRes.body.data.id;

        // Create Chats and Messages
        const chat1Res = await exportTestObjects.request(exportTestObjects.server).post('/api/v1/chats').set('Authorization', `Bearer ${userToken}`).send({ title: 'Export Chat 1', organizationId });
        chatId1 = chat1Res.body.data._id;
        await exportTestObjects.request(exportTestObjects.server).post(`/api/v1/chats/${chatId1}/messages`).set('Authorization', `Bearer ${userToken}`).send({ role: 'user', content: 'Message 1.1' });
        await exportTestObjects.request(exportTestObjects.server).post(`/api/v1/chats/${chatId1}/messages`).set('Authorization', `Bearer ${userToken}`).send({ role: 'assistant', content: 'Message 1.2' });

        const chat2Res = await exportTestObjects.request(exportTestObjects.server).post('/api/v1/chats').set('Authorization', `Bearer ${userToken}`).send({ title: 'Export Chat 2', organizationId });
        chatId2 = chat2Res.body.data._id;
        await exportTestObjects.request(exportTestObjects.server).post(`/api/v1/chats/${chatId2}/messages`).set('Authorization', `Bearer ${userToken}`).send({ role: 'user', content: 'Message 2.1' });
    });

    describe('GET /api/v1/export/chats', () => {
        it('should export chats and messages as JSON by default', async () => {
            const res = await exportTestObjects.request(exportTestObjects.server)
                .get('/api/v1/export/chats')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ organizationId });

            expect(res.statusCode).toEqual(200);
            expect(res.headers['content-type']).toMatch(/application\/json/);
            expect(res.body.message).toBe('Export successful');
            expect(res.body.data).toBeInstanceOf(Array);
            expect(res.body.data.length).toBeGreaterThanOrEqual(2);
            expect(res.body.data[0]).toHaveProperty('messages');
            expect(res.body.data[0].messages.length).toBeGreaterThanOrEqual(2);
        });

        it('should export chats and messages as CSV', async () => {
            const res = await exportTestObjects.request(exportTestObjects.server)
                .get('/api/v1/export/chats')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ format: 'csv', organizationId });

            expect(res.statusCode).toEqual(200);
            expect(res.headers['content-type']).toMatch(/text\/csv/);
            expect(res.headers['content-disposition']).toContain('.csv');
            expect(res.text).toContain('chatId,chatTitle,messageId,role,content'); // Check for CSV header
            expect(res.text).toContain(chatId1);
        });

        it('should filter export by date range', async () => {
            // Assuming chats were created recently
            const startDate = new Date(Date.now() - 60 * 1000).toISOString(); // 1 minute ago
            const endDate = new Date().toISOString();

            const res = await exportTestObjects.request(exportTestObjects.server)
                .get('/api/v1/export/chats')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ startDate, endDate, organizationId });

            expect(res.statusCode).toEqual(200);
            expect(res.body.data.length).toBeGreaterThanOrEqual(2); // Should include recently created chats
        });

        it('should return 403 if user is not an admin', async () => {
            const res = await exportTestObjects.request(exportTestObjects.server)
                .get('/api/v1/export/chats')
                .set('Authorization', `Bearer ${userToken}`)
                .query({ organizationId });

            expect(res.statusCode).toEqual(403);
        });

         it('should return 400 for invalid format', async () => {
            const res = await exportTestObjects.request(exportTestObjects.server)
                .get('/api/v1/export/chats')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ format: 'xml', organizationId }); // Invalid format

            expect(res.statusCode).toEqual(400);
        });
    });

    describe('GET /api/v1/export/users/activity', () => {
        it('should export user activity as JSON by default', async () => {
            const res = await exportTestObjects.request(exportTestObjects.server)
                .get('/api/v1/export/users/activity')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ organizationId });

            expect(res.statusCode).toEqual(200);
            expect(res.headers['content-type']).toMatch(/application\/json/);
            expect(res.body.message).toBe('User activity export successful');
            expect(res.body.data).toBeInstanceOf(Array);
            expect(res.body.data.length).toBeGreaterThanOrEqual(2); // admin + user
            expect(res.body.data[0]).toHaveProperty('userId');
             expect(res.body.data[0]).toHaveProperty('chatCount');
        });

        it('should export user activity as CSV', async () => {
            const res = await exportTestObjects.request(exportTestObjects.server)
                .get('/api/v1/export/users/activity')
                .set('Authorization', `Bearer ${adminToken}`)
                .query({ format: 'csv', organizationId });

            expect(res.statusCode).toEqual(200);
            expect(res.headers['content-type']).toMatch(/text\/csv/);
            expect(res.headers['content-disposition']).toContain('.csv');
             expect(res.text).toContain('userId,username,email,role,isActive,chatCount'); // Check header
        });

        it('should return 403 if user is not an admin', async () => {
            const res = await exportTestObjects.request(exportTestObjects.server)
                .get('/api/v1/export/users/activity')
                .set('Authorization', `Bearer ${userToken}`)
                .query({ organizationId });

            expect(res.statusCode).toEqual(403);
        });
    });
});
