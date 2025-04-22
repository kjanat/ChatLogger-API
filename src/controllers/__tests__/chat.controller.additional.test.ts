import supertest from 'supertest';
import mongoose from 'mongoose';
import { server } from '../../server';
import ChatModel from '../../models/chat.model';
import MsgModel from '../../models/message.model'; // Use different name to avoid conflict
import UserModel from '../../models/user.model';

const chatAddTestObjects = {
    request: supertest,
    server: server,
    Chat: ChatModel,
    Message: MsgModel,
    User: UserModel,
    mongoose: mongoose
};

// Mock logger
jest.mock('../../utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
}));

describe('Chat Controller - Additional Tests', () => {
    let token: string;
    let userId: string;
    let organizationId: string;
    let chatId: string;

    beforeAll(async () => {
        // await chatAddTestObjects.setupTestDB(); // Removed

        // Create user and organization
        const org = new chatAddTestObjects.mongoose.Types.ObjectId();
        organizationId = org.toString();

        const userRes = await chatAddTestObjects.request(chatAddTestObjects.server)
            .post('/api/v1/users/register')
            .send({
                username: 'chataddtester',
                email: 'chatadd@test.com',
                password: 'Password123!',
                organizationId: organizationId
            });
        token = userRes.body.token;
        userId = userRes.body.data.id;

        // Create a chat for testing getById, update, delete
        const chatRes = await chatAddTestObjects.request(chatAddTestObjects.server)
            .post('/api/v1/chats')
            .set('Authorization', `Bearer ${token}`)
            .send({ 
                title: 'Existing Test Chat',
                organizationId: organizationId
            });
        chatId = chatRes.body.data._id;
    });

    afterAll(async () => {
        // await chatAddTestObjects.setupTestDB.closeDatabase(); // Removed
    });

    describe('POST /api/v1/chats', () => {
        it('should create a new chat session successfully', async () => {
            const res = await chatAddTestObjects.request(chatAddTestObjects.server)
                .post('/api/v1/chats')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    title: 'My New Chat Session',
                    source: 'api',
                    tags: ['testing', 'api'],
                    metadata: { client: 'supertest' },
                    organizationId: organizationId
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body.message).toBe('Chat created successfully');
            expect(res.body.data).toHaveProperty('_id');
            expect(res.body.data.title).toBe('My New Chat Session');
            expect(res.body.data.userId).toBe(userId);
            expect(res.body.data.organizationId).toBe(organizationId);
        });

        it('should return 400 if title is missing', async () => {
             const res = await chatAddTestObjects.request(chatAddTestObjects.server)
                .post('/api/v1/chats')
                .set('Authorization', `Bearer ${token}`)
                .send({ 
                    organizationId: organizationId 
                }); // Missing title
            expect(res.statusCode).toEqual(400);
        });
    });

    describe('GET /api/v1/chats/:id', () => {
        it('should get a specific chat by ID', async () => {
            const res = await chatAddTestObjects.request(chatAddTestObjects.server)
                .get(`/api/v1/chats/${chatId}`)
                .set('Authorization', `Bearer ${token}`)
                .query({ organizationId });

            expect(res.statusCode).toEqual(200);
            expect(res.body.data).toHaveProperty('_id', chatId);
            expect(res.body.data.title).toBe('Existing Test Chat');
        });

        it('should return 404 for non-existent chat ID', async () => {
            const nonExistentId = new chatAddTestObjects.mongoose.Types.ObjectId().toString();
            const res = await chatAddTestObjects.request(chatAddTestObjects.server)
                .get(`/api/v1/chats/${nonExistentId}`)
                .set('Authorization', `Bearer ${token}`)
                 .query({ organizationId });
            expect(res.statusCode).toEqual(404);
        });
    });

     describe('PUT /api/v1/chats/:id', () => {
        it('should update a chat successfully', async () => {
            const res = await chatAddTestObjects.request(chatAddTestObjects.server)
                .put(`/api/v1/chats/${chatId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    title: 'Updated Chat Title',
                    tags: ['updated'],
                    isActive: false,
                    organizationId: organizationId 
                });

            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toBe('Chat updated successfully');
            expect(res.body.data.title).toBe('Updated Chat Title');
            expect(res.body.data.tags).toContain('updated');
            expect(res.body.data.isActive).toBe(false);
        });

        it('should return 404 for updating non-existent chat ID', async () => {
            const nonExistentId = new chatAddTestObjects.mongoose.Types.ObjectId().toString();
            const res = await chatAddTestObjects.request(chatAddTestObjects.server)
                .put(`/api/v1/chats/${nonExistentId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ title: 'Won\'t Update', organizationId: organizationId });
            expect(res.statusCode).toEqual(404);
        });
    });

     describe('DELETE /api/v1/chats/:id', () => {
        it('should delete a chat successfully', async () => {
             // Create a chat to delete
            const chatToDeleteRes = await chatAddTestObjects.request(chatAddTestObjects.server)
                .post('/api/v1/chats')
                .set('Authorization', `Bearer ${token}`)
                .send({ title: 'Chat To Delete', organizationId: organizationId });
            const chatToDeleteId = chatToDeleteRes.body.data._id;

            const res = await chatAddTestObjects.request(chatAddTestObjects.server)
                .delete(`/api/v1/chats/${chatToDeleteId}`)
                .set('Authorization', `Bearer ${token}`)
                 .query({ organizationId });

            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toBe('Chat deleted successfully');

            // Verify it's gone
            const verifyRes = await chatAddTestObjects.request(chatAddTestObjects.server)
                 .get(`/api/v1/chats/${chatToDeleteId}`)
                 .set('Authorization', `Bearer ${token}`)
                 .query({ organizationId });
             expect(verifyRes.statusCode).toEqual(404);
        });

        it('should return 404 for deleting non-existent chat ID', async () => {
             const nonExistentId = new chatAddTestObjects.mongoose.Types.ObjectId().toString();
             const res = await chatAddTestObjects.request(chatAddTestObjects.server)
                 .delete(`/api/v1/chats/${nonExistentId}`)
                 .set('Authorization', `Bearer ${token}`)
                 .query({ organizationId });
             expect(res.statusCode).toEqual(404);
        });
    });

     describe('GET /api/v1/chats (Pagination & Filtering)', () => {
        beforeAll(async () => {
            // Add more chats for testing pagination/filtering
            await new chatAddTestObjects.Chat({ title: 'Filter Chat 1', userId, organizationId, tags: ['filter', 'one'], source: 'web' }).save();
            await new chatAddTestObjects.Chat({ title: 'Filter Chat 2', userId, organizationId, tags: ['filter', 'two'], source: 'api' }).save();
            await new chatAddTestObjects.Chat({ title: 'Filter Chat 3', userId, organizationId, tags: ['another'], source: 'web' }).save();
        });

        it('should paginate chats correctly', async () => {
            const res = await chatAddTestObjects.request(chatAddTestObjects.server)
                .get('/api/v1/chats')
                .set('Authorization', `Bearer ${token}`)
                .query({ page: 1, limit: 2, organizationId });

            expect(res.statusCode).toEqual(200);
            expect(res.body.data.length).toBe(2);
            expect(res.body.currentPage).toBe(1);
            expect(res.body.totalPages).toBeGreaterThanOrEqual(2);
        });

        it('should filter chats by tags', async () => {
            const res = await chatAddTestObjects.request(chatAddTestObjects.server)
                .get('/api/v1/chats')
                .set('Authorization', `Bearer ${token}`)
                .query({ tags: 'filter', organizationId });

            expect(res.statusCode).toEqual(200);
            expect(res.body.data.length).toBe(2);
            expect(res.body.data.every((chat: any) => chat.tags.includes('filter'))).toBe(true);
        });

         it('should filter chats by source', async () => {
            const res = await chatAddTestObjects.request(chatAddTestObjects.server)
                .get('/api/v1/chats')
                .set('Authorization', `Bearer ${token}`)
                .query({ source: 'web', organizationId });

            expect(res.statusCode).toEqual(200);
            expect(res.body.data.length).toBe(2);
            expect(res.body.data.every((chat: any) => chat.source === 'web')).toBe(true);
        });

        it('should sort chats by title ascending', async () => {
             const res = await chatAddTestObjects.request(chatAddTestObjects.server)
                .get('/api/v1/chats')
                .set('Authorization', `Bearer ${token}`)
                .query({ sortBy: 'title', sortOrder: 'asc', organizationId });

            expect(res.statusCode).toEqual(200);
            // Add check to verify titles are in ascending order
            const titles = res.body.data.map((chat: any) => chat.title);
            expect(titles).toEqual([...titles].sort());
        });
    });

    describe('GET /api/v1/chats (Additional scenarios)', () => {
        // Additional scenarios can be added here
    });

});

