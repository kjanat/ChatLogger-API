import supertest from 'supertest';
import mongoose from 'mongoose';
import { server } from '../../server';
import ChatModel from '../../models/chat.model';
import UserModel from '../../models/user.model';
import { IChat, IMessage } from '../../models/chat.model';

const messageTestObjects = {
  server,
  mongoose,
  Chat: ChatModel,
  User: UserModel,
  request: supertest,
};

// Mock logger
jest.mock('../../utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
}));

describe('Message Controller', () => {
    let token: string;
    let userId: string;
    let organizationId: string;
    let chatId: string;
    let messageId: string;

    beforeAll(async () => {
        const org = new messageTestObjects.mongoose.Types.ObjectId();
        organizationId = org.toString();

        const userRes = await messageTestObjects.request(messageTestObjects.server)
            .post('/api/v1/users/register')
            .send({
                username: 'msgtester',
                email: 'msg@test.com',
                password: 'Password123!',
                organizationId: organizationId
            });
        
        if (userRes.status !== 201) {
             console.error('User registration failed in beforeAll:', userRes.body);
             throw new Error('Failed to register user for message tests');
        }
        token = userRes.body.token;
        userId = userRes.body.data.id;

        const chatRes = await messageTestObjects.request(messageTestObjects.server)
            .post('/api/v1/chats')
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'Message Test Chat', organizationId });
            
        if (chatRes.status !== 201) {
             console.error('Chat creation failed in beforeAll:', chatRes.body);
             throw new Error('Failed to create chat for message tests');
        }
        chatId = chatRes.body.data._id;

        const msgRes = await messageTestObjects.request(messageTestObjects.server)
            .post(`/api/v1/chats/${chatId}/messages`)
            .set('Authorization', `Bearer ${token}`)
            .send({ role: 'user', content: 'Initial message' });

        if (msgRes.status !== 201) {
             console.error('Initial message creation failed in beforeAll:', msgRes.body);
             throw new Error('Failed to create initial message for tests');
        }
        messageId = msgRes.body.data._id;
    });

    describe('POST /api/v1/chats/:chatId/messages', () => {
        it('should add a new message to a chat', async () => {
            const res = await messageTestObjects.request(messageTestObjects.server)
                .post(`/api/v1/chats/${chatId}/messages`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    role: 'assistant',
                    content: 'This is a test response.',
                    tokens: 25,
                    latency: 150,
                    metadata: { model: 'gpt-test' }
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body.message).toBe('Message added successfully');
            expect(res.body.data).toHaveProperty('_id');
            expect(res.body.data.role).toBe('assistant');
            expect(res.body.data.content).toBe('This is a test response.');
            expect(res.body.data.chatId).toBe(chatId);
            expect(res.body.data.userId).toBe(userId);
            expect(res.body.data.organizationId).toBe(organizationId);

            const chat = await messageTestObjects.Chat.findById(chatId);
            expect(chat).toBeTruthy();
            expect(chat?.updatedAt).not.toBeNull(); 
        });

        it('should return 404 if chat is not found or not accessible', async () => {
            const nonExistentChatId = new messageTestObjects.mongoose.Types.ObjectId().toString();
            const res = await messageTestObjects.request(messageTestObjects.server)
                .post(`/api/v1/chats/${nonExistentChatId}/messages`)
                .set('Authorization', `Bearer ${token}`)
                .send({ role: 'user', content: 'Won\'t be added' });
            
            expect(res.statusCode).toEqual(404);
        });

        it('should return 400 if message format is invalid', async () => {
            const invalidMessage = { role: 'user' };
            const res = await messageTestObjects.request(messageTestObjects.server)
                .post(`/api/v1/chats/${chatId}/messages`)
                .set('Authorization', `Bearer ${token}`)
                .send(invalidMessage);
            expect(res.statusCode).toEqual(400);
        });
    });

    describe('GET /api/v1/chats/:chatId/messages', () => {
        it('should get all messages for a specific chat with pagination', async () => {
            await messageTestObjects.request(messageTestObjects.server)
                 .post(`/api/v1/chats/${chatId}/messages`).set('Authorization', `Bearer ${token}`).send({ role: 'user', content: 'Test Msg 1' });
             await messageTestObjects.request(messageTestObjects.server)
                 .post(`/api/v1/chats/${chatId}/messages`).set('Authorization', `Bearer ${token}`).send({ role: 'assistant', content: 'Test Msg 2' });
            
            const res = await messageTestObjects.request(messageTestObjects.server)
                .get(`/api/v1/chats/${chatId}/messages`)
                .set('Authorization', `Bearer ${token}`)
                .query({ page: 1, limit: 5 });

            expect(res.statusCode).toEqual(200);
            expect(res.body.data).toBeInstanceOf(Array);
            expect(res.body.data.length).toBeGreaterThanOrEqual(3);
            expect(res.body.currentPage).toBe(1);
        });

         it('should return 404 if chat is not found or not accessible', async () => {
            const nonExistentChatId = new messageTestObjects.mongoose.Types.ObjectId().toString();
            const res = await messageTestObjects.request(messageTestObjects.server)
                .get(`/api/v1/chats/${nonExistentChatId}/messages`)
                .set('Authorization', `Bearer ${token}`);
            
            expect(res.statusCode).toEqual(404);
        });

        it('should return 200 and an empty array if chat has no messages', async () => {
            const res = await messageTestObjects.request(messageTestObjects.server)
                .get(`/api/v1/chats/${chatId}/messages`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.data).toEqual([]);
        });
    });

    describe('GET /api/v1/chats/:chatId/messages/:messageId', () => {
        it('should get a specific message by ID', async () => {
            const res = await messageTestObjects.request(messageTestObjects.server)
                .get(`/api/v1/chats/${chatId}/messages/${messageId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.data).toHaveProperty('_id', messageId);
            expect(res.body.data.content).toBe('Initial message');
        });

        it('should return 404 if message is not found', async () => {
            const nonExistentMsgId = new messageTestObjects.mongoose.Types.ObjectId().toString();
            const res = await messageTestObjects.request(messageTestObjects.server)
                .get(`/api/v1/chats/${chatId}/messages/${nonExistentMsgId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.statusCode).toEqual(404);
        });
    });

    describe('PUT /api/v1/chats/:chatId/messages/:messageId', () => {
        it('should update a message successfully', async () => {
            const res = await messageTestObjects.request(messageTestObjects.server)
                .put(`/api/v1/chats/${chatId}/messages/${messageId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ 
                    content: 'Updated message content',
                    metadata: { edited: true }
                 });

            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toBe('Message updated successfully');
            expect(res.body.data.content).toBe('Updated message content');
            expect(res.body.data.metadata.edited).toBe(true);
        });

        it('should return 404 if message to update is not found', async () => {
             const nonExistentMsgId = new messageTestObjects.mongoose.Types.ObjectId().toString();
             const res = await messageTestObjects.request(messageTestObjects.server)
                .put(`/api/v1/chats/${chatId}/messages/${nonExistentMsgId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ content: 'Update fail' });
             expect(res.statusCode).toEqual(404);
        });
    });

     describe('DELETE /api/v1/chats/:chatId/messages/:messageId', () => {
        it('should delete a message successfully', async () => {
            const msgToDeleteRes = await messageTestObjects.request(messageTestObjects.server)
                .post(`/api/v1/chats/${chatId}/messages`)
                .set('Authorization', `Bearer ${token}`)
                .send({ role: 'user', content: 'Message to delete' });
            const msgToDeleteId = msgToDeleteRes.body.data._id;

            const res = await messageTestObjects.request(messageTestObjects.server)
                .delete(`/api/v1/chats/${chatId}/messages/${msgToDeleteId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toBe('Message deleted successfully');

            const verifyRes = await messageTestObjects.request(messageTestObjects.server)
                 .get(`/api/v1/chats/${chatId}/messages/${msgToDeleteId}`)
                 .set('Authorization', `Bearer ${token}`);
             expect(verifyRes.statusCode).toEqual(404);
        });

         it('should return 404 if message to delete is not found', async () => {
             const nonExistentMsgId = new messageTestObjects.mongoose.Types.ObjectId().toString();
             const res = await messageTestObjects.request(messageTestObjects.server)
                 .delete(`/api/v1/chats/${chatId}/messages/${nonExistentMsgId}`)
                 .set('Authorization', `Bearer ${token}`);
             expect(res.statusCode).toEqual(404);
        });
    });

     describe('POST /api/v1/chats/:chatId/messages/batch', () => {
        it('should batch add multiple messages successfully', async () => {
             const messagesToAdd = [
                { role: 'user', content: 'Batch message 1' },
                { role: 'assistant', content: 'Batch message 2', tokens: 5 },
                { role: 'user', content: 'Batch message 3' }
            ];

            const res = await messageTestObjects.request(messageTestObjects.server)
                .post(`/api/v1/chats/${chatId}/messages/batch`)
                .set('Authorization', `Bearer ${token}`)
                .send({ messages: messagesToAdd });

            expect(res.statusCode).toEqual(201);
            expect(res.body.message).toBe('3 messages added successfully');
            expect(res.body.count).toBe(3);

             const getRes = await messageTestObjects.request(messageTestObjects.server)
                .get(`/api/v1/chats/${chatId}/messages`)
                .set('Authorization', `Bearer ${token}`);
             const allMessages = await messageTestObjects.Chat.findById(chatId).select('messages');
             expect(allMessages?.messages.length).toBeGreaterThanOrEqual(4);
        });

         it('should return 400 if messages array is missing or empty', async () => {
             const res = await messageTestObjects.request(messageTestObjects.server)
                .post(`/api/v1/chats/${chatId}/messages/batch`)
                .set('Authorization', `Bearer ${token}`)
                .send({});
             expect(res.statusCode).toEqual(400);
            
             const res2 = await messageTestObjects.request(messageTestObjects.server)
                .post(`/api/v1/chats/${chatId}/messages/batch`)
                .set('Authorization', `Bearer ${token}`)
                .send({ messages: [] });
             expect(res2.statusCode).toEqual(400);
        });

         it('should return 404 if chat is not found or not accessible for batch add', async () => {
             const nonExistentChatId = new messageTestObjects.mongoose.Types.ObjectId().toString();
             const res = await messageTestObjects.request(messageTestObjects.server)
                .post(`/api/v1/chats/${nonExistentChatId}/messages/batch`)
                .set('Authorization', `Bearer ${token}`)
                .send({ messages: [{ role: 'user', content: 'Test' }] });
             expect(res.statusCode).toEqual(404);
        });
    });
});
