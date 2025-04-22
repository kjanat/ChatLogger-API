import { Request, Response } from 'express';
const Chat = require('../models/chat.model');
const Message = require('../models/message.model');
const logger = require('../utils/logger');

/**
 * Get chat activity metrics per day within a date range
 */
const getChatActivityByDate = async (req: Request, res: Response): Promise<void> => {
    try {
        const { startDate, endDate } = req.query;
        const organizationId = req.organization ? req.organization._id : req.user?.organizationId;

        // Validate date inputs
        const start = startDate
            ? new Date(startDate as string)
            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
        const end = endDate ? new Date(endDate as string) : new Date();

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            res.status(400).json({ message: 'Invalid date format' });
            return;
        }

        // Aggregate chat activity by date
        const chatActivity = await Chat.aggregate([
            {
                $match: {
                    organizationId: organizationId,
                    createdAt: { $gte: start, $lte: end },
                },
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' },
                    },
                    count: { $sum: 1 },
                },
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
            },
            {
                $project: {
                    _id: 0,
                    date: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: {
                                $dateFromParts: {
                                    year: '$_id.year',
                                    month: '$_id.month',
                                    day: '$_id.day',
                                },
                            },
                        },
                    },
                    count: 1,
                },
            },
        ]);

        res.status(200).json({
            message: 'Chat activity retrieved successfully',
            data: chatActivity,
            metadata: {
                startDate: start,
                endDate: end,
                totalDays: Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)),
                totalChats: chatActivity.reduce((sum: number, item: any) => sum + item.count, 0),
            },
        });
    } catch (error: any) {
        logger.error(`Get chat activity error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get message statistics grouped by role
 */
const getMessageStatsByRole = async (req: Request, res: Response): Promise<void> => {
    try {
        const { startDate, endDate } = req.query;
        const organizationId = req.organization ? req.organization._id : req.user?.organizationId;

        // Validate date inputs
        const start = startDate
            ? new Date(startDate as string)
            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
        const end = endDate ? new Date(endDate as string) : new Date();

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            res.status(400).json({ message: 'Invalid date format' });
            return;
        }

        // First, get all chat IDs for this organization
        const chats = await Chat.find({
            organizationId: organizationId,
            createdAt: { $gte: start, $lte: end },
        }).select('_id');

        const chatIds = chats.map((chat: any) => chat._id);

        // Then aggregate message stats by role
        const messageStats = await Message.aggregate([
            {
                $match: {
                    chatId: { $in: chatIds },
                    createdAt: { $gte: start, $lte: end },
                },
            },
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 },
                    avgTokens: { $avg: '$tokens' },
                    totalTokens: { $sum: '$tokens' },
                    avgLatency: { $avg: '$latency' },
                },
            },
            {
                $project: {
                    _id: 0,
                    role: '$_id',
                    count: 1,
                    avgTokens: { $round: ['$avgTokens', 2] },
                    totalTokens: 1,
                    avgLatency: { $round: ['$avgLatency', 2] },
                },
            },
        ]);

        res.status(200).json({
            message: 'Message statistics retrieved successfully',
            data: messageStats,
            metadata: {
                startDate: start,
                endDate: end,
                totalChats: chatIds.length,
                totalMessages: messageStats.reduce((sum: number, item: any) => sum + item.count, 0),
                totalTokens: messageStats.reduce((sum: number, item: any) => sum + item.totalTokens, 0),
            },
        });
    } catch (error: any) {
        logger.error(`Get message stats error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get top users by chat count
 */
const getTopUsersByActivity = async (req: Request, res: Response): Promise<void> => {
    try {
        const { limit = 10, startDate, endDate } = req.query;
        const organizationId = req.organization ? req.organization._id : req.user?.organizationId;

        // Validate date inputs
        const start = startDate
            ? new Date(startDate as string)
            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
        const end = endDate ? new Date(endDate as string) : new Date();

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            res.status(400).json({ message: 'Invalid date format' });
            return;
        }

        // Aggregate top users by chat count
        const topUsers = await Chat.aggregate([
            {
                $match: {
                    organizationId: organizationId,
                    createdAt: { $gte: start, $lte: end },
                },
            },
            {
                $group: {
                    _id: '$userId',
                    chatCount: { $sum: 1 },
                    lastActivity: { $max: '$updatedAt' },
                },
            },
            {
                $sort: { chatCount: -1 },
            },
            {
                $limit: parseInt(limit as string),
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            {
                $unwind: '$user',
            },
            {
                $project: {
                    _id: 0,
                    userId: '$_id',
                    username: '$user.username',
                    email: '$user.email',
                    chatCount: 1,
                    lastActivity: 1,
                },
            },
        ]);

        res.status(200).json({
            message: 'Top users retrieved successfully',
            data: topUsers,
            metadata: {
                startDate: start,
                endDate: end,
                limit: parseInt(limit as string),
            },
        });
    } catch (error: any) {
        logger.error(`Get top users error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getChatActivityByDate,
    getMessageStatsByRole,
    getTopUsersByActivity,
};

// For ES Module compatibility
export {
    getChatActivityByDate,
    getMessageStatsByRole,
    getTopUsersByActivity,
};
