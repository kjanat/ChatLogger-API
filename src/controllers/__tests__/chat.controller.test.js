const chatController = require('../chat.controller');
const Chat = require('../../models/chat.model');
const Message = require('../../models/message.model');
const setupTestDB = require('../../../tests/setupTests');

// Mock dependencies
jest.unmock('../../models/chat.model');
jest.unmock('../../models/message.model');
jest.mock('../../utils/logger');
jest.mock('../../middleware/pagination', () => jest.fn(() => (req, res, next) => next()));

describe('Chat Controller', () => {
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

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Common request/response objects
        req = {
            user: { _id: 'user123', organizationId: 'org123' },
            body: {},
            params: {},
            query: {},
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    describe('createChat', () => {
        beforeEach(() => {
            req.body = {
                title: 'Test Chat',
                source: 'web',
                tags: ['test'],
                metadata: { key: 'value' },
            };

            // Mock Chat constructor
            jest.spyOn(Chat.prototype, 'save').mockResolvedValue(true);
            jest.spyOn(Chat.prototype, 'toJSON').mockReturnValue({
                _id: 'chat123',
                title: 'Test Chat',
                userId: 'user123',
                organizationId: 'org123',
            });
        });

        test('should create a new chat session', async () => {
            await chatController.createChat(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.any(String),
                    chat: expect.any(Object),
                }),
            );
        });

        test('should return error if organization is missing', async () => {
            req.user.organizationId = null;
            req.organization = null;

            await chatController.createChat(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('Organization'),
                }),
            );
        });
    });

    describe('getUserChats', () => {
        test('should get user chats with pagination', async () => {
            req.paginatedResults = {
                data: [{ title: 'Chat 1' }, { title: 'Chat 2' }],
                pagination: { total: 2 },
            };

            await chatController.getUserChats(req, res, jest.fn());

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(req.paginatedResults);
        });
    });

    describe('getChatById', () => {
        test('should get chat by ID', async () => {
            req.params.chatId = 'chat123';

            const mockChat = { _id: 'chat123', title: 'Test Chat' };
            Chat.findOne = jest.fn().mockResolvedValue(mockChat);

            await chatController.getChatById(req, res);

            expect(Chat.findOne).toHaveBeenCalledWith(expect.objectContaining({ _id: 'chat123' }));
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ chat: mockChat });
        });

        test('should return 404 if chat not found', async () => {
            req.params.chatId = 'nonexistent';

            Chat.findOne = jest.fn().mockResolvedValue(null);

            await chatController.getChatById(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('updateChat', () => {
        beforeEach(() => {
            req.params.chatId = 'chat123';
            req.body = { title: 'Updated Title' };

            const mockChat = {
                _id: 'chat123',
                title: 'Old Title',
                tags: [],
                metadata: {},
                save: jest.fn().mockResolvedValue(true),
            };
            Chat.findOne = jest.fn().mockResolvedValue(mockChat);
        });

        test('should update chat details', async () => {
            await chatController.updateChat(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('updated'),
                    chat: expect.any(Object),
                }),
            );
        });
    });

    describe('deleteChat', () => {
        beforeEach(() => {
            req.params.chatId = 'chat123';

            Chat.findOne = jest.fn().mockResolvedValue({ _id: 'chat123' });
            Message.deleteMany = jest.fn().mockResolvedValue({});
            Chat.findByIdAndDelete = jest.fn().mockResolvedValue({});
        });

        test('should delete chat and its messages', async () => {
            await chatController.deleteChat(req, res);

            expect(Message.deleteMany).toHaveBeenCalled();
            expect(Chat.findByIdAndDelete).toHaveBeenCalledWith('chat123');
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('searchChats', () => {
        test('should search chats by query', async () => {
            req.query.query = 'test';
            req.paginatedResults = {
                data: [{ title: 'Test Chat' }],
                pagination: { total: 1 },
            };

            await chatController.searchChats(req, res, jest.fn());

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(req.paginatedResults);
        });
    });
});
