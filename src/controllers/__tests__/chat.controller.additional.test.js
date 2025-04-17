const chatController = require('../chat.controller');
const Chat = require('../../models/chat.model');
// Removing unused import
// const Message = require('../../models/message.model');
const logger = require('../../utils/logger');
const paginateResults = require('../../middleware/pagination');

// Mock dependencies
jest.mock('../../models/chat.model');
jest.mock('../../models/message.model');
jest.mock('../../utils/logger');
jest.mock('../../middleware/pagination');

describe('Chat Controller - Additional Tests', () => {
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

    describe('createChat - Error Handling', () => {
        test('should handle server errors', async () => {
            req.body = {
                title: 'Test Chat',
            };

            // Mock error scenario
            Chat.mockImplementation(() => ({
                save: jest.fn().mockRejectedValue(new Error('Database connection error')),
            }));

            await chatController.createChat(req, res);

            expect(logger.error).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getUserChats - Error Handling', () => {
        test('should handle server errors', async () => {
            // Create an error that will be thrown during execution
            const mockError = new Error('Database error');

            // Make paginateResults throw the error when called
            paginateResults.mockImplementation(() => {
                throw mockError;
            });

            await chatController.getUserChats(req, res);

            expect(logger.error).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
        });

        test('should filter by isActive flag when provided', async () => {
            req.query.isActive = 'true';
            req.paginatedResults = {
                data: [{ title: 'Active Chat' }],
                pagination: { total: 1 },
            };

            // Mock paginateResults to execute the callback
            paginateResults.mockImplementation(() => (req, res, next) => next());

            await chatController.getUserChats(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(req.paginatedResults);
        });
    });

    describe('getChatById - Error Handling', () => {
        test('should handle server errors', async () => {
            req.params.chatId = 'chat123';

            // Mock error scenario
            Chat.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

            await chatController.getChatById(req, res);

            expect(logger.error).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
        });

        test('should use organization from request object if available', async () => {
            req.params.chatId = 'chat123';
            req.organization = { _id: 'org456' };

            const mockChat = { _id: 'chat123', title: 'Test Chat' };
            Chat.findOne = jest.fn().mockResolvedValue(mockChat);

            await chatController.getChatById(req, res);

            expect(Chat.findOne).toHaveBeenCalledWith(
                expect.objectContaining({
                    organizationId: 'org456',
                }),
            );
        });
    });

    describe('updateChat - Error Handling', () => {
        test('should handle server errors', async () => {
            req.params.chatId = 'chat123';
            req.body = { title: 'Updated Title' };

            // Mock error scenario
            Chat.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

            await chatController.updateChat(req, res);

            expect(logger.error).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
        });

        test('should update isActive status when provided', async () => {
            req.params.chatId = 'chat123';
            req.body = { isActive: false };

            const mockChat = {
                _id: 'chat123',
                isActive: true,
                save: jest.fn().mockResolvedValue(true),
            };

            Chat.findOne = jest.fn().mockResolvedValue(mockChat);

            await chatController.updateChat(req, res);

            expect(mockChat.isActive).toBe(false);
            expect(mockChat.save).toHaveBeenCalled();
        });
    });

    describe('deleteChat - Error Handling', () => {
        test('should handle server errors', async () => {
            req.params.chatId = 'chat123';

            // Mock error scenario
            Chat.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

            await chatController.deleteChat(req, res);

            expect(logger.error).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('searchChats - Error Handling', () => {
        test('should handle server errors', async () => {
            req.query.query = 'test';

            // Create an error that will be thrown during execution
            const mockError = new Error('Database error');

            // Make paginateResults throw the error when called
            paginateResults.mockImplementation(() => {
                throw mockError;
            });

            await chatController.searchChats(req, res);

            expect(logger.error).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
