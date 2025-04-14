const analyticsController = require('../analytics.controller');
const Chat = require('../../models/chat.model');
const Message = require('../../models/message.model');

// Mock dependencies
jest.mock('../../models/chat.model');
jest.mock('../../models/message.model');
jest.mock('../../utils/logger');

describe('Analytics Controller', () => {
    let req, res;
    
    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Common request/response objects
        req = {
            user: { _id: 'user123', organizationId: 'org123' },
            organization: null,
            query: {}
        };
        
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('getChatActivityByDate', () => {
        beforeEach(() => {
            const mockAggregate = jest.fn().mockResolvedValue([
                { date: '2025-04-01', count: 5 },
                { date: '2025-04-02', count: 7 }
            ]);
            
            Chat.aggregate = mockAggregate;
        });
        
        test('should return chat activity for a date range', async () => {
            req.query = {
                startDate: '2025-04-01',
                endDate: '2025-04-10'
            };
            
            await analyticsController.getChatActivityByDate(req, res);
            
            expect(Chat.aggregate).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.arrayContaining([
                    expect.objectContaining({ date: expect.any(String), count: expect.any(Number) })
                ])
            }));
        });
        
        test('should handle invalid date formats', async () => {
            req.query = {
                startDate: 'invalid-date',
                endDate: '2025-04-10'
            };
            
            await analyticsController.getChatActivityByDate(req, res);
            
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining('Invalid date')
            }));
        });
        
        test('should use default dates when not provided', async () => {
            req.query = {}; // No dates provided
            
            await analyticsController.getChatActivityByDate(req, res);
            
            expect(Chat.aggregate).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('getMessageStatsByRole', () => {
        beforeEach(() => {
            // Fix: Mock Chat.find properly
            Chat.find = jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue([
                    { _id: 'chat1' },
                    { _id: 'chat2' }
                ])
            });
            
            // Fix: Setup Message.aggregate mock correctly
            Message.aggregate = jest.fn().mockResolvedValue([
                { role: 'user', count: 10, avgTokens: 15.5, totalTokens: 155, avgLatency: 0 },
                { role: 'assistant', count: 9, avgTokens: 120.3, totalTokens: 1083, avgLatency: 550.2 }
            ]);
        });
        
        test('should return message statistics grouped by role', async () => {
            req.query = {
                startDate: '2025-04-01',
                endDate: '2025-04-10'
            };
            
            await analyticsController.getMessageStatsByRole(req, res);
            
            expect(Chat.find).toHaveBeenCalled();
            expect(Message.aggregate).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.any(Array)
            }));
        });
    });

    describe('getTopUsersByActivity', () => {
        beforeEach(() => {
            Chat.aggregate = jest.fn().mockResolvedValue([
                { 
                    userId: 'user1',
                    username: 'testuser1',
                    email: 'test1@example.com',
                    chatCount: 25,
                    lastActivity: new Date()
                },
                {
                    userId: 'user2',
                    username: 'testuser2',
                    email: 'test2@example.com',
                    chatCount: 18,
                    lastActivity: new Date()
                }
            ]);
        });
        
        test('should return top users by activity', async () => {
            req.query = {
                limit: 5,
                startDate: '2025-04-01',
                endDate: '2025-04-10'
            };
            
            await analyticsController.getTopUsersByActivity(req, res);
            
            expect(Chat.aggregate).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.arrayContaining([
                    expect.objectContaining({ 
                        userId: expect.any(String),
                        username: expect.any(String),
                        chatCount: expect.any(Number)
                    })
                ])
            }));
        });
        
        test('should use default limit when not provided', async () => {
            req.query = {
                startDate: '2025-04-01',
                endDate: '2025-04-10'
            };
            
            await analyticsController.getTopUsersByActivity(req, res);
            
            expect(Chat.aggregate).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});
