const analyticsTestObjects = {
    request: require('supertest'),
    Chat: require('../../models/chat.model'),
    Message: require('../../models/message.model'),
    User: require('../../models/user.model'),
    server: require('../../server').default, // Use server instance
    analyticsController: require('../../controllers/analytics.controller'),
    mongoose: require('mongoose')
};

// Mock the app's listen method for supertest
// analyticsTestObjects.app.listen = jest.fn(); // Removed

// Mock logger
jest.mock('../../utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
}));

describe('Analytics Controller', () => {
    let token: string;
    let userId: string;
    let organizationId: string;

    beforeAll(async () => {
        // await analyticsTestObjects.setupTestDB(); // Removed

        // Create user and organization for tests
        const org = new analyticsTestObjects.mongoose.Types.ObjectId();
        organizationId = org.toString();

        const userRes = await analyticsTestObjects.request(analyticsTestObjects.server)
            .post('/api/v1/users/register')
            .send({
                username: 'analyticstester',
                email: 'analytics@test.com',
                password: 'Password123!',
                organizationId: organizationId
            });
        token = userRes.body.token;
        userId = userRes.body.data.id;

        // Add some test data
        const chat1 = new analyticsTestObjects.Chat({ title: 'Analytics Chat 1', userId, organizationId });
        await chat1.save();
        const chat2 = new analyticsTestObjects.Chat({ title: 'Analytics Chat 2', userId, organizationId });
        await chat2.save();

        const message1 = new analyticsTestObjects.Message({ chatId: chat1._id, userId, organizationId, role: 'user', content: 'Msg 1', tokens: 10, latency: 100 });
        await message1.save();
        const message2 = new analyticsTestObjects.Message({ chatId: chat1._id, userId, organizationId, role: 'assistant', content: 'Msg 2', tokens: 20, latency: 200 });
        await message2.save();
    });

    afterAll(async () => {
        // await analyticsTestObjects.setupTestDB.closeDatabase(); // Removed
    });

    describe('GET /api/v1/analytics/activity', () => {
        it('should get chat activity data', async () => {
            const res = await analyticsTestObjects.request(analyticsTestObjects.server)
                .get('/api/v1/analytics/activity')
                .set('Authorization', `Bearer ${token}`)
                .query({ organizationId }); // Pass orgId for admin context

            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toContain('Chat activity retrieved successfully');
            expect(res.body.data).toBeInstanceOf(Array);
            // Add more specific data checks if needed
        });
    });

    describe('GET /api/v1/analytics/messages/stats', () => {
        it('should get message statistics by role', async () => {
            const res = await analyticsTestObjects.request(analyticsTestObjects.server)
                .get('/api/v1/analytics/messages/stats')
                .set('Authorization', `Bearer ${token}`)
                .query({ organizationId });

            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toContain('Message statistics retrieved successfully');
            expect(res.body.data).toBeInstanceOf(Array);
            expect(res.body.data.length).toBeGreaterThan(0);
            // Add checks for specific roles (user, assistant)
        });
    });

    describe('GET /api/v1/analytics/users/top', () => {
        it('should get top users by activity', async () => {
            const res = await analyticsTestObjects.request(analyticsTestObjects.server)
                .get('/api/v1/analytics/users/top')
                .set('Authorization', `Bearer ${token}`)
                .query({ organizationId });

            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toContain('Top users retrieved successfully');
            expect(res.body.data).toBeInstanceOf(Array);
             expect(res.body.data.length).toBeGreaterThan(0);
            // Add checks for the specific user created
        });
    });
});
