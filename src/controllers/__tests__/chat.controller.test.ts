const chatTestObjects = {
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

describe('Chat Controller', () => {
    let token: string;
    let userId: string;
    let organizationId: string;
    let chatId: string;

    beforeAll(async () => {
        // await chatTestObjects.setupTestDB(); // Removed

        // Create user and organization
        const org = new chatTestObjects.mongoose.Types.ObjectId();
        organizationId = org.toString();

        const userRes = await chatTestObjects.request(chatTestObjects.server)
            .post('/api/v1/users/register')
            .send({
                username: 'chattester',
                email: 'chat@test.com',
                password: 'Password123!',
                organizationId: organizationId
            });
        token = userRes.body.token;
        userId = userRes.body.data.id;

        // Create a chat for testing
        const chatRes = await chatTestObjects.request(chatTestObjects.server)
            .post('/api/v1/chats')
            .set('Authorization', `Bearer ${token}`)
            .send({ 
                title: 'Test Chat Main',
                organizationId: organizationId
            });
        chatId = chatRes.body.data._id;
    });

    afterAll(async () => {
        // await chatTestObjects.setupTestDB.closeDatabase(); // Removed
    });

    describe('GET /api/v1/chats', () => {
        it('should get a list of chats for the user', async () => {
            const res = await chatTestObjects.request(chatTestObjects.server)
                .get('/api/v1/chats')
                .set('Authorization', `Bearer ${token}`)
                .query({ organizationId });

            expect(res.statusCode).toEqual(200);
            expect(res.body.data).toBeInstanceOf(Array);
            expect(res.body.data.length).toBeGreaterThanOrEqual(1);
            expect(res.body.data[0].title).toBe('Test Chat Main');
        });

        it('should return 401 if not authenticated', async () => {
            const res = await chatTestObjects.request(chatTestObjects.server)
                .get('/api/v1/chats')
                .query({ organizationId });

            expect(res.statusCode).toEqual(401);
        });
    });

    // Add more tests for other chat controller functions (getById, update, delete)
    // similar to the ones in chat.controller.additional.test.ts 
    // if they aren't covered sufficiently there.
});
