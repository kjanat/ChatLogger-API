const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Chat = require('../../src/models/chat.model');
const User = require('../../src/models/user.model');
const logger = require('../../src/utils/logger');
const { setupDatabase, clearDatabase, teardownDatabase } = require('../integrationSetup');

// Create actual MongoDB ObjectIds for test user and organization
const TEST_USER_ID = new mongoose.Types.ObjectId();
const TEST_ORG_ID = new mongoose.Types.ObjectId();

const generateToken = () => {
    // Use the JWT_SECRET directly from process.env to ensure it matches what the app uses
    return jwt.sign(
        { 
            userId: TEST_USER_ID.toString(),
            organizationId: TEST_ORG_ID.toString()
        }, 
        process.env.JWT_SECRET, 
        { expiresIn: '1h' }
    );
};

// Use a single test token
let token;
let testUser;

beforeAll(async () => {
    // Setup the in-memory database
    await setupDatabase();
    
    // Create test user
    testUser = await User.create({
        _id: TEST_USER_ID,
        username: 'testuser',
        email: 'testuser@example.com',
        password: 'Password123!',
        role: 'user',
        organizationId: TEST_ORG_ID
    });
    
    // Verify user was created successfully
    logger.debug(`Test user created with ID: ${testUser._id}`);

    // Generate token after user is created
    token = generateToken();
    logger.debug('Generated test authentication token');
});

afterAll(async () => {
    await teardownDatabase();
});

describe('Chat Integration Tests', () => {
    beforeEach(async () => {
        // Only clear chats, not users
        await Chat.deleteMany({});
    });

    test('should create a new chat', async () => {
        const response = await request(app)
            .post('/api/v1/chats')
            .send({
                title: 'Test Chat',
            })
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(201);
        // The actual response has a nested "chat" object
        expect(response.body).toHaveProperty('chat');
        expect(response.body.chat).toHaveProperty('_id');
        expect(response.body.chat.title).toBe('Test Chat');
        expect(response.body).toHaveProperty('message', 'Chat session created successfully');
    });

    test('should fetch all chats', async () => {
        // Seed the database with some chats
        const chat1 = await Chat.create({ title: 'Chat 1', organizationId: TEST_ORG_ID, userId: TEST_USER_ID });
        const chat2 = await Chat.create({ title: 'Chat 2', organizationId: TEST_ORG_ID, userId: TEST_USER_ID });

        const response = await request(app)
            .get('/api/v1/chats')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('results');
        expect(response.body.results).toHaveLength(2);
        
        // Instead of checking specific order, verify that both chats are present
        const titles = response.body.results.map(chat => chat.title);
        expect(titles).toContain('Chat 1');
        expect(titles).toContain('Chat 2');
    });

    test('should fetch a single chat by ID', async () => {
        const chat = await Chat.create({ title: 'Chat 1', organizationId: TEST_ORG_ID, userId: TEST_USER_ID });

        const response = await request(app)
            .get(`/api/v1/chats/${chat._id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        // Response has a "chat" property containing the chat object
        expect(response.body).toHaveProperty('chat');
        expect(response.body.chat).toHaveProperty('_id', chat._id.toString());
        expect(response.body.chat.title).toBe('Chat 1');
    });

    test('should delete a chat by ID', async () => {
        const chat = await Chat.create({ title: 'Chat 1', organizationId: TEST_ORG_ID, userId: TEST_USER_ID });

        const response = await request(app)
            .delete(`/api/v1/chats/${chat._id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        // Updated the expected message to match the actual response
        expect(response.body).toHaveProperty('message', 'Chat and associated messages deleted successfully');

        const deletedChat = await Chat.findById(chat._id);
        expect(deletedChat).toBeNull();
    });
});
