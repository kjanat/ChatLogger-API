const { exportChatsAndMessages, exportUserActivity } = require('../export.controller');
const Chat = require('../../models/chat.model');
const Message = require('../../models/message.model');
const User = require('../../models/user.model');
const logger = require('../../utils/logger');

// Mock the dependencies
jest.mock('../../models/chat.model');
jest.mock('../../models/message.model');
jest.mock('../../models/user.model');
jest.mock('../../utils/logger');

// Setup logger mock functions
logger.error = jest.fn();
logger.info = jest.fn();
logger.warn = jest.fn();
logger.debug = jest.fn();

describe('Export Controller', () => {
    let mockRequest;
    let mockResponse;
    let mockNext;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Create mock request and response objects
        mockRequest = {
            query: {},
            user: { 
                _id: 'user123', 
                organizationId: 'org123' 
            },
            organization: {
                _id: 'org123'
            }
        };
        
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(),
            setHeader: jest.fn()
        };
        
        mockNext = jest.fn();
    });

    describe('exportChatsAndMessages', () => {
        it('should return 400 when date format is invalid', async () => {
            // Setup invalid dates
            mockRequest.query = {
                startDate: 'invalid-date',
                endDate: '2025-04-12'
            };
            
            await exportChatsAndMessages(mockRequest, mockResponse);
            
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ 
                message: 'Invalid date format' 
            });
        });

        it('should return 400 when format is invalid', async () => {
            // Setup valid dates but invalid format
            mockRequest.query = {
                startDate: '2025-03-12',
                endDate: '2025-04-12',
                format: 'xml' // Not supported
            };
            
            await exportChatsAndMessages(mockRequest, mockResponse);
            
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ 
                message: 'Supported formats are json and csv' 
            });
        });

        it('should return 404 if no chats found in the specified date range', async () => {
            // Setup valid query
            mockRequest.query = {
                startDate: '2025-03-12',
                endDate: '2025-04-12',
                format: 'json'
            };
            
            // Mock empty chats array
            Chat.find = jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([])
            });
            
            await exportChatsAndMessages(mockRequest, mockResponse);
            
            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({ 
                message: 'No chats found in the specified date range' 
            });
        });

        it('should return 404 for CSV format if no messages found', async () => {
            // Setup valid query with CSV format
            mockRequest.query = {
                startDate: '2025-03-12',
                endDate: '2025-04-12',
                format: 'csv'
            };
            
            // Mock chats data but no messages
            const mockChats = [{ 
                _id: 'chat1', 
                title: 'Test Chat',
                source: 'web' 
            }];
            
            Chat.find.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockChats)
            });
            
            Message.find = jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([])
            });
            
            await exportChatsAndMessages(mockRequest, mockResponse);
            
            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({ 
                message: 'No messages found for the specified chats' 
            });
        });

        it('should export data in JSON format successfully', async () => {
            // Setup valid query
            mockRequest.query = {
                startDate: '2025-03-12',
                endDate: '2025-04-12',
                format: 'json'
            };
            
            // Mock chats and messages data
            const mockChats = [
                { 
                    _id: 'chat1', 
                    title: 'Test Chat',
                    source: 'web',
                    tags: ['test'],
                    createdAt: new Date('2025-03-15'),
                    updatedAt: new Date('2025-03-15')
                }
            ];
            
            const mockMessages = [
                {
                    _id: 'msg1',
                    chatId: 'chat1',
                    role: 'user',
                    content: 'Hello',
                    tokens: 5,
                    latency: 100,
                    model: 'gpt-4',
                    createdAt: new Date('2025-03-15')
                }
            ];
            
            // Make sure lean() is properly mocked
            Chat.find.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockChats)
            });
            
            Message.find.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockMessages)
            });
            
            await exportChatsAndMessages(mockRequest, mockResponse);
            
            // Verify headers were set properly
            expect(mockResponse.setHeader).toHaveBeenCalledWith(
                'Content-Disposition', 
                expect.stringContaining('attachment; filename=chatlogger_export_')
            );
            expect(mockResponse.setHeader).toHaveBeenCalledWith(
                'Content-Type', 
                'application/json'
            );
            
            // Verify response format
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Export successful',
                metadata: expect.any(Object),
                data: expect.any(Array)
            }));
        });

        it('should export data in CSV format successfully', async () => {
            // Setup valid query with CSV format
            mockRequest.query = {
                startDate: '2025-03-12',
                endDate: '2025-04-12',
                format: 'csv'
            };
            
            // Mock chats and messages data
            const mockChats = [
                { 
                    _id: 'chat1', 
                    title: 'Test Chat',
                    source: 'web'
                }
            ];
            
            const mockMessages = [
                {
                    _id: 'msg1',
                    chatId: 'chat1',
                    role: 'user',
                    content: 'Hello, world!',
                    tokens: 5,
                    latency: 100,
                    model: 'gpt-4',
                    createdAt: new Date('2025-03-15')
                },
                {
                    _id: 'msg2',
                    chatId: 'chat1',
                    role: 'assistant',
                    content: 'Hello, how can I help you today?',
                    tokens: 10,
                    latency: 150,
                    model: 'gpt-4',
                    createdAt: new Date('2025-03-15')
                }
            ];
            
            // Make sure lean() is properly mocked
            Chat.find.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockChats)
            });
            
            Message.find.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockMessages)
            });
            
            await exportChatsAndMessages(mockRequest, mockResponse);
            
            // Verify headers were set properly
            expect(mockResponse.setHeader).toHaveBeenCalledWith(
                'Content-Disposition', 
                expect.stringContaining('attachment; filename=chatlogger_export_')
            );
            expect(mockResponse.setHeader).toHaveBeenCalledWith(
                'Content-Type', 
                'text/csv'
            );
            
            // Verify CSV format sent
            expect(mockResponse.send).toHaveBeenCalled();
        });

        it('should handle escaping special characters in CSV format', async () => {
            // Setup valid query with CSV format
            mockRequest.query = {
                format: 'csv'
            };
            
            // Mock chats and messages with special characters
            const mockChats = [
                { 
                    _id: 'chat1', 
                    title: 'Test, Chat with "quotes"',
                    source: 'web'
                }
            ];
            
            const mockMessages = [
                {
                    _id: 'msg1',
                    chatId: 'chat1',
                    role: 'user',
                    content: 'Hello, world with "quotes" and ,commas',
                    tokens: 5,
                    latency: 100,
                    model: 'gpt-4',
                    createdAt: new Date('2025-03-15')
                }
            ];
            
            // Make sure lean() is properly mocked
            Chat.find.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockChats)
            });
            
            Message.find.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockMessages)
            });
            
            await exportChatsAndMessages(mockRequest, mockResponse);
            
            // Verify CSV format sent
            expect(mockResponse.send).toHaveBeenCalled();
        });

        it('should use default dates if not specified', async () => {
            // Setup query with no dates
            mockRequest.query = {
                format: 'json'
            };
            
            // Mock successful response
            const mockChats = [{ _id: 'chat1', title: 'Test Chat' }];
            const mockMessages = [{ _id: 'msg1', chatId: 'chat1' }];
            
            // Make sure lean() is properly mocked
            Chat.find.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockChats)
            });
            
            Message.find.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockMessages)
            });
            
            await exportChatsAndMessages(mockRequest, mockResponse);
            
            // Verify Chat.find was called with appropriate date range
            expect(Chat.find).toHaveBeenCalledWith(expect.objectContaining({
                organizationId: 'org123',
                createdAt: expect.objectContaining({
                    $gte: expect.any(Date),
                    $lte: expect.any(Date)
                })
            }));
            
            // Should be successful response
            expect(mockResponse.json).toHaveBeenCalled();
        });

        it('should handle server errors gracefully', async () => {
            // Simulate a server error
            Chat.find.mockImplementation(() => {
                throw new Error('Database connection failed');
            });
            
            await exportChatsAndMessages(mockRequest, mockResponse);
            
            expect(logger.error).toHaveBeenCalledWith('Export error: Database connection failed');
            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Server error' });
        });
    });

    describe('exportUserActivity', () => {
        it('should return 400 when date format is invalid', async () => {
            // Setup invalid dates
            mockRequest.query = {
                startDate: 'invalid-date',
                endDate: '2025-04-12'
            };
            
            await exportUserActivity(mockRequest, mockResponse);
            
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ 
                message: 'Invalid date format' 
            });
        });

        it('should return 400 when format is invalid', async () => {
            // Setup valid dates but invalid format
            mockRequest.query = {
                startDate: '2025-03-12',
                endDate: '2025-04-12',
                format: 'xml' // Not supported
            };
            
            await exportUserActivity(mockRequest, mockResponse);
            
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ 
                message: 'Supported formats are json and csv' 
            });
        });

        it('should return 404 if no users found', async () => {
            // Setup valid query
            mockRequest.query = {
                startDate: '2025-03-12',
                endDate: '2025-04-12',
                format: 'json'
            };
            
            // Mock empty users array
            User.find.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([])
            });
            
            await exportUserActivity(mockRequest, mockResponse);
            
            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({ 
                message: 'No users found' 
            });
        });

        it('should return 404 for CSV format if no user activity data available', async () => {
            // Setup valid query with CSV format but mock empty activityData
            mockRequest.query = {
                format: 'csv'
            };
            
            // Mock users but with no activity data
            User.find.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([])
            });
            
            await exportUserActivity(mockRequest, mockResponse);
            
            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({ message: 'No users found' });
        });

        it('should export user activity data in JSON format successfully', async () => {
            // Setup valid query
            mockRequest.query = {
                startDate: '2025-03-12',
                endDate: '2025-04-12',
                format: 'json'
            };
            
            // Mock users data
            const mockUsers = [
                { 
                    _id: 'user1', 
                    username: 'testuser',
                    email: 'test@example.com',
                    role: 'user',
                    isActive: true,
                    createdAt: new Date('2025-01-01')
                }
            ];
            
            User.find.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockUsers)
            });
            
            // Mock chat activity data
            const mockChatActivity = [
                {
                    _id: 'user1',
                    chatCount: 5,
                    firstActivity: new Date('2025-03-15'),
                    lastActivity: new Date('2025-04-10')
                }
            ];
            
            Chat.aggregate.mockResolvedValue(mockChatActivity);
            
            await exportUserActivity(mockRequest, mockResponse);
            
            // Verify headers were set properly
            expect(mockResponse.setHeader).toHaveBeenCalledWith(
                'Content-Disposition', 
                expect.stringContaining('attachment; filename=user_activity_export_')
            );
            expect(mockResponse.setHeader).toHaveBeenCalledWith(
                'Content-Type', 
                'application/json'
            );
            
            // Verify response format
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'User activity export successful',
                metadata: expect.any(Object),
                data: expect.any(Array)
            }));
        });

        it('should export user activity data in CSV format successfully', async () => {
            // Setup valid query with CSV format
            mockRequest.query = {
                startDate: '2025-03-12',
                endDate: '2025-04-12',
                format: 'csv'
            };
            
            // Mock users data
            const mockUsers = [
                { 
                    _id: 'user1', 
                    username: 'testuser',
                    email: 'test@example.com',
                    role: 'user',
                    isActive: true,
                    createdAt: new Date('2025-01-01')
                },
                {
                    _id: 'user2',
                    username: 'anotheruser',
                    email: 'another@example.com',
                    role: 'admin',
                    isActive: true,
                    createdAt: new Date('2025-02-01')
                }
            ];
            
            User.find.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockUsers)
            });
            
            // Mock chat activity data
            const mockChatActivity = [
                {
                    _id: 'user1',
                    chatCount: 5,
                    firstActivity: new Date('2025-03-15'),
                    lastActivity: new Date('2025-04-10')
                }
            ];
            
            Chat.aggregate.mockResolvedValue(mockChatActivity);
            
            await exportUserActivity(mockRequest, mockResponse);
            
            // Verify headers were set properly
            expect(mockResponse.setHeader).toHaveBeenCalledWith(
                'Content-Disposition', 
                expect.stringContaining('attachment; filename=user_activity_export_')
            );
            expect(mockResponse.setHeader).toHaveBeenCalledWith(
                'Content-Type', 
                'text/csv'
            );
            
            // Verify CSV format sent
            expect(mockResponse.send).toHaveBeenCalled();
        });

        it('should handle users with no activity data', async () => {
            // Setup valid query
            mockRequest.query = {
                format: 'json'
            };
            
            // Mock users data
            const mockUsers = [
                { 
                    _id: 'user1', 
                    username: 'testuser',
                    email: 'test@example.com',
                    role: 'user',
                    isActive: true,
                    createdAt: new Date('2025-01-01')
                }
            ];
            
            User.find.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockUsers)
            });
            
            // Mock empty chat activity data (user has no chats)
            Chat.aggregate.mockResolvedValue([]);
            
            await exportUserActivity(mockRequest, mockResponse);
            
            // Verify the response contains the user with zero chat count
            expect(mockResponse.json).toHaveBeenCalled();
            const response = mockResponse.json.mock.calls[0][0];
            
            expect(response.data).toBeDefined();
            expect(response.data.length).toBe(1);
            expect(response.data[0].username).toBe('testuser');
            expect(response.data[0].chatCount).toBe(0);
        });

        it('should use default dates if not specified', async () => {
            // Setup query with no dates
            mockRequest.query = {
                format: 'json'
            };
            
            // Mock successful response
            const mockUsers = [{ _id: 'user1', username: 'testuser' }];
            
            User.find.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockUsers)
            });
            
            Chat.aggregate.mockResolvedValue([]);
            
            await exportUserActivity(mockRequest, mockResponse);
            
            // Verify Chat.aggregate was called with appropriate date range
            expect(Chat.aggregate).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({
                    $match: expect.objectContaining({
                        createdAt: expect.objectContaining({
                            $gte: expect.any(Date),
                            $lte: expect.any(Date)
                        })
                    })
                })
            ]));
            
            // Should be successful response
            expect(mockResponse.json).toHaveBeenCalled();
        });

        it('should handle server errors gracefully', async () => {
            // Simulate a server error
            User.find = jest.fn().mockImplementation(() => {
                throw new Error('Database connection failed');
            });
            
            await exportUserActivity(mockRequest, mockResponse);
            
            expect(logger.error).toHaveBeenCalledWith('User activity export error: Database connection failed');
            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Server error' });
        });
    });
});
