import { Request, Response } from 'express';
import { Types } from 'mongoose';
import Papa from 'papaparse';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

import { IUser } from '../models/user.model';
import { IOrganization } from '../models/organization.model';
const Chat = require('../models/chat.model');
const Message = require('../models/message.model');
const User = require('../models/user.model');
const logger = require('../utils/logger');

/**
 * Formats provided chats and messages data for export
 * @param {Array} chats - Array of chat objects
 * @param {Array} messages - Array of message objects
 * @param {Object} format - Format specification object
 * @returns {Object} Formatted data object
 */
const formatExportData = (chats: any[], format: string) => {
    const data = chats.flatMap(chat => 
        chat.messages.map((message: any) => ({
            chatId: chat._id,
            chatTitle: chat.title,
            chatCreatedAt: chat.createdAt,
            chatUserId: chat.userId,
            chatSource: chat.source,
            chatTags: chat.tags?.join(';') || '',
            chatMetadata: JSON.stringify(chat.metadata || {}),
            messageId: message._id,
            messageCreatedAt: message.createdAt,
            role: message.role,
            content: message.content,
            name: message.name || '',
            functionCall: JSON.stringify(message.functionCall || {}),
            toolCalls: JSON.stringify(message.toolCalls || []),
            tokens: message.tokens || 0,
            promptTokens: message.promptTokens || 0,
            completionTokens: message.completionTokens || 0,
            latency: message.latency || 0,
            messageMetadata: JSON.stringify(message.metadata || {}),
        }))
    );

    if (format === 'csv') {
        if (data.length === 0) return ''; // Return empty string for empty data
        return Papa.unparse(data);
    } else {
        // Default to JSON, structure can be the raw chats with messages
        return chats; // Return original structured data for JSON
    }
};

/**
 * Export chats and messages within a specified date range
 */
export const exportChatsWithMessages = async (req: Request, res: Response): Promise<void> => {
    try {
        const { startDate, endDate, format = 'json' } = req.query;
        const reqUser = req.user as IUser;
        const reqOrg = req.organization as IOrganization;

        // Check permissions - Only admin or superadmin
        if (reqUser?.role !== 'admin' && reqUser?.role !== 'superadmin') {
            res.status(403).json({ message: 'Access denied: Admin privileges required' });
            return;
        }

        // Determine the target organization ID
        let organizationId = reqOrg?._id;
        // If superadmin provides organizationId in query, use that
        if (reqUser?.role === 'superadmin' && req.query.organizationId) {
            if (!Types.ObjectId.isValid(req.query.organizationId as string)) {
                res.status(400).json({ message: 'Invalid organizationId format in query' });
                return;
            }
            organizationId = new Types.ObjectId(req.query.organizationId as string);
        } else if (reqUser?.role === 'admin') {
            // Admin should use their own organizationId
            organizationId = reqUser.organizationId;
        }

        // If no organizationId could be determined (e.g., superadmin without query param)
        if (!organizationId) {
            res.status(400).json({ message: 'Organization context is required or must be provided in query for superadmin' });
            return;
        }

        // Validate date inputs
        let start: Date | undefined;
        let end: Date | undefined;

        if (startDate && typeof startDate === 'string') {
            const parsedStart = dayjs.utc(startDate);
            if (!parsedStart.isValid()) {
                res.status(400).json({ message: 'Invalid startDate format' });
                return;
            }
            start = parsedStart.toDate();
        }

        if (endDate && typeof endDate === 'string') {
            const parsedEnd = dayjs.utc(endDate);
            if (!parsedEnd.isValid()) {
                res.status(400).json({ message: 'Invalid endDate format' });
                return;
            }
            // Set end date to the end of the day for inclusive range
            end = parsedEnd.endOf('day').toDate();
        }

        // Validate format
        const supportedFormats = ['json', 'csv'];
        if (typeof format !== 'string' || !supportedFormats.includes(format)) {
            res.status(400).json({ message: `Invalid format. Supported formats: ${supportedFormats.join(', ')}` });
            return;
        }

        // Build query
        const query: any = { organizationId };
        if (start || end) {
            query.createdAt = {};
            if (start) query.createdAt.$gte = start;
            if (end) query.createdAt.$lte = end;
        }

        // Fetch chats and populate messages
        const chats = await Chat.find(query)
            .populate({
                path: 'messages',
                options: { sort: { createdAt: 1 } } // Sort messages chronologically
            })
            .sort({ createdAt: 1 }); // Sort chats chronologically

        const formattedData = formatExportData(chats, format);

        // Set headers and send response
        const timestamp = dayjs().format('YYYYMMDD_HHmmss');
        const filename = `chat_export_${timestamp}.${format}`;

        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.status(200).send(formattedData);
        } else {
            // JSON format
            res.setHeader('Content-Type', 'application/json');
             // Optionally add content-disposition for JSON download
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.status(200).json({ 
                message: "Export successful",
                filename: filename,
                count: chats.length,
                data: formattedData 
            });
        }

    } catch (error: any) {
        logger.error(`Export chats error: ${error.message}`);
        if (!res.headersSent) {
             res.status(500).json({ message: 'Server error during chat export' });
        }
    }
};

/**
 * Export user activity data
 */
export const exportUserActivity = async (req: Request, res: Response): Promise<void> => {
    try {
        const { format = 'json' } = req.query;
        const reqUser = req.user as IUser;
        const reqOrg = req.organization as IOrganization;

        // Check permissions
        if (reqUser?.role !== 'admin' && reqUser?.role !== 'superadmin') {
            res.status(403).json({ message: 'Access denied: Admin privileges required' });
            return;
        }

        // Determine target organization ID
        let organizationId = reqOrg?._id;
        if (reqUser?.role === 'superadmin' && req.query.organizationId) {
             if (!Types.ObjectId.isValid(req.query.organizationId as string)) {
                res.status(400).json({ message: 'Invalid organizationId format in query' });
                return;
            }
            organizationId = new Types.ObjectId(req.query.organizationId as string);
        } else if (reqUser?.role === 'admin') {
            organizationId = reqUser.organizationId;
        }

        if (!organizationId) {
            res.status(400).json({ message: 'Organization context is required or must be provided in query for superadmin' });
            return;
        }

        // Validate format
        const supportedFormats = ['json', 'csv'];
        if (typeof format !== 'string' || !supportedFormats.includes(format)) {
            res.status(400).json({ message: `Invalid format. Supported formats: ${supportedFormats.join(', ')}` });
            return;
        }

        // Fetch users for the organization
        const users = await User.find({ organizationId }).select('-password -apiKey'); // Exclude sensitive fields

        // Get chat counts for each user
        const userActivityData = await Promise.all(
            users.map(async (user: any) => {
                const chatCount = await Chat.countDocuments({ userId: user._id, organizationId });
                return {
                    userId: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    isActive: user.isActive,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                    firstName: user.firstName || '',
                    lastName: user.lastName || '',
                    chatCount: chatCount,
                };
            })
        );

        // Format data
        let formattedData: string | object[];
        if (format === 'csv') {
            if (userActivityData.length === 0) {
                formattedData = '';
            } else {
                formattedData = Papa.unparse(userActivityData);
            }
        } else {
            formattedData = userActivityData; // JSON format
        }

        // Set headers and send response
        const timestamp = dayjs().format('YYYYMMDD_HHmmss');
        const filename = `user_activity_export_${timestamp}.${format}`;

        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.status(200).send(formattedData);
        } else {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.status(200).json({ 
                message: "User activity export successful",
                filename: filename,
                count: userActivityData.length,
                data: formattedData 
            });
        }

    } catch (error: any) {
        logger.error(`Export user activity error: ${error.message}`);
        if (!res.headersSent) {
             res.status(500).json({ message: 'Server error during user activity export' });
        }
    }
};
