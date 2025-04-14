const messageController = require('../message.controller');
const Message = require('../../models/message.model');
const Chat = require('../../models/chat.model');

// Mock dependencies
jest.mock('../../models/message.model');
jest.mock('../../models/chat.model');
jest.mock('../../utils/logger');
jest.mock('../../middleware/pagination', () => jest.fn(() => (req, res, next) => next()));

describe('Message Controller', () => {
    let req, res, next;
    
    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Common request/response objects
        req = {
            params: { chatId: 'chat123', messageId: 'message123' },
            body: {},
            user: { _id: 'user123', organizationId: 'org123' },
            organization: null
        };
        
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        
        next = jest.fn();
    });
    
    describe('addMessage', () => {
        beforeEach(() => {
            req.body = {
                role: 'user',
                content: 'Test message',
                tokens: 10
            };
            
            const mockChat = {
                _id: 'chat123',
                userId: 'user123',
                organizationId: 'org123',
                updatedAt: new Date(),
                save: jest.fn().mockResolvedValue(true)
            };
            
            Chat.findOne = jest.fn().mockResolvedValue(mockChat);
            
            Message.mockImplementation(() => ({
                _id: 'message123',
                chatId: 'chat123',
                role: 'user',
                content: 'Test message',
                tokens: 10,
                save: jest.fn().mockResolvedValue(true)
            }));
        });
        
        test('should add a message to a chat', async () => {
            await messageController.addMessage(req, res);
            
            expect(Chat.findOne).toHaveBeenCalledWith({
                _id: 'chat123',
                userId: 'user123',
                organizationId: 'org123'
            });
            
            expect(Message).toHaveBeenCalledWith(expect.objectContaining({
                chatId: 'chat123',
                role: 'user',
                content: 'Test message'
            }));
            
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('added successfully'),
                    data: expect.any(Object)
                })
            );
        });
        
        test('should return 404 when chat not found', async () => {
            Chat.findOne = jest.fn().mockResolvedValue(null);
            
            await messageController.addMessage(req, res);
            
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Chat not found'
                })
            );
        });
        
        test('should handle server errors', async () => {
            Chat.findOne = jest.fn().mockRejectedValue(new Error('Database error'));
            
            await messageController.addMessage(req, res);
            
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Server error'
                })
            );
        });
    });
    
    describe('getChatMessages', () => {
        beforeEach(() => {
            req.paginatedResults = {
                data: [
                    { _id: 'message1', content: 'Hello' },
                    { _id: 'message2', content: 'World' }
                ],
                pagination: { total: 2 }
            };
        });
        
        test('should get messages for a chat with pagination', async () => {
            await messageController.getChatMessages(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(req.paginatedResults);
        });
        
        test('should handle server errors', async () => {
            const mockError = new Error('Pagination error');
            const paginationMiddleware = (req, res, next) => {
                next(mockError);
            };
            
            jest.mock('../../middleware/pagination', () => jest.fn(() => paginationMiddleware));
            
            try {
                await messageController.getChatMessages(req, res, next);
            } catch (error) {
                expect(error).toBe(mockError);
            }
        });
    });
    
    describe('getMessageById', () => {
        beforeEach(() => {
            const mockChat = {
                _id: 'chat123',
                userId: 'user123',
                organizationId: 'org123'
            };
            
            const mockMessage = {
                _id: 'message123',
                chatId: 'chat123',
                role: 'user',
                content: 'Test message'
            };
            
            Chat.findOne = jest.fn().mockResolvedValue(mockChat);
            Message.findOne = jest.fn().mockResolvedValue(mockMessage);
        });
        
        test('should get a specific message by ID', async () => {
            await messageController.getMessageById(req, res);
            
            expect(Chat.findOne).toHaveBeenCalled();
            expect(Message.findOne).toHaveBeenCalledWith({
                _id: 'message123',
                chatId: 'chat123'
            });
            
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.objectContaining({
                        _id: 'message123',
                        content: 'Test message'
                    })
                })
            );
        });
        
        test('should return 404 when chat not found', async () => {
            Chat.findOne = jest.fn().mockResolvedValue(null);
            
            await messageController.getMessageById(req, res);
            
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Chat not found'
                })
            );
        });
        
        test('should return 404 when message not found', async () => {
            Message.findOne = jest.fn().mockResolvedValue(null);
            
            await messageController.getMessageById(req, res);
            
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Message not found'
                })
            );
        });
    });
    
    describe('updateMessage', () => {
        beforeEach(() => {
            req.body = {
                content: 'Updated message content',
                metadata: { key: 'value' }
            };
            
            const mockChat = {
                _id: 'chat123',
                userId: 'user123',
                organizationId: 'org123'
            };
            
            const mockMessage = {
                _id: 'message123',
                chatId: 'chat123',
                content: 'Original content',
                metadata: {},
                save: jest.fn().mockResolvedValue(true)
            };
            
            Chat.findOne = jest.fn().mockResolvedValue(mockChat);
            Message.findOne = jest.fn().mockResolvedValue(mockMessage);
        });
        
        test('should update a message', async () => {
            await messageController.updateMessage(req, res);
            
            expect(Chat.findOne).toHaveBeenCalled();
            expect(Message.findOne).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('updated successfully')
                })
            );
        });
        
        test('should return 404 when chat not found', async () => {
            Chat.findOne = jest.fn().mockResolvedValue(null);
            
            await messageController.updateMessage(req, res);
            
            expect(res.status).toHaveBeenCalledWith(404);
        });
        
        test('should return 404 when message not found', async () => {
            Message.findOne = jest.fn().mockResolvedValue(null);
            
            await messageController.updateMessage(req, res);
            
            expect(res.status).toHaveBeenCalledWith(404);
        });
    });
    
    describe('deleteMessage', () => {
        beforeEach(() => {
            const mockChat = {
                _id: 'chat123',
                userId: 'user123',
                organizationId: 'org123'
            };
            
            const mockMessage = {
                _id: 'message123',
                chatId: 'chat123'
            };
            
            Chat.findOne = jest.fn().mockResolvedValue(mockChat);
            Message.findOne = jest.fn().mockResolvedValue(mockMessage);
            Message.findByIdAndDelete = jest.fn().mockResolvedValue({});
        });
        
        test('should delete a message', async () => {
            await messageController.deleteMessage(req, res);
            
            expect(Chat.findOne).toHaveBeenCalled();
            expect(Message.findOne).toHaveBeenCalled();
            expect(Message.findByIdAndDelete).toHaveBeenCalledWith('message123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('deleted successfully')
                })
            );
        });
        
        test('should return 404 when chat not found', async () => {
            Chat.findOne = jest.fn().mockResolvedValue(null);
            
            await messageController.deleteMessage(req, res);
            
            expect(res.status).toHaveBeenCalledWith(404);
        });
        
        test('should return 404 when message not found', async () => {
            Message.findOne = jest.fn().mockResolvedValue(null);
            
            await messageController.deleteMessage(req, res);
            
            expect(res.status).toHaveBeenCalledWith(404);
        });
    });
    
    describe('batchAddMessages', () => {
        beforeEach(() => {
            req.body = {
                messages: [
                    { role: 'user', content: 'Message 1' },
                    { role: 'system', content: 'Message 2' }
                ]
            };
            
            const mockChat = {
                _id: 'chat123',
                userId: 'user123',
                organizationId: 'org123',
                updatedAt: new Date(),
                save: jest.fn().mockResolvedValue(true)
            };
            
            Chat.findOne = jest.fn().mockResolvedValue(mockChat);
            Message.insertMany = jest.fn().mockResolvedValue([
                { _id: 'message1' },
                { _id: 'message2' }
            ]);
        });
        
        test('should add multiple messages in batch', async () => {
            await messageController.batchAddMessages(req, res);
            
            expect(Chat.findOne).toHaveBeenCalled();
            expect(Message.insertMany).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('messages added successfully'),
                    count: 2
                })
            );
        });
        
        test('should return 400 when no messages provided', async () => {
            req.body.messages = [];
            
            await messageController.batchAddMessages(req, res);
            
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'No messages provided'
                })
            );
        });
        
        test('should return 404 when chat not found', async () => {
            Chat.findOne = jest.fn().mockResolvedValue(null);
            
            await messageController.batchAddMessages(req, res);
            
            expect(res.status).toHaveBeenCalledWith(404);
        });
    });
});
