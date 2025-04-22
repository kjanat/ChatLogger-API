import { Request, Response, NextFunction } from 'express';
const Message = require('../models/message.model');
const Chat = require('../models/chat.model');
const logger = require('../utils/logger');
import { IPaginatedResults } from '../middleware/pagination';

// Interface combining Request with pagination properties
interface RequestWithPagination extends Request {
    pagination?: {
        page: number;
        limit: number;
        skip: number;
    };
    paginatedResults?: IPaginatedResults;
}

// Add a new message to a chat
const addMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        const { chatId } = req.params;
        const {
            role,
            content,
            name,
            functionCall,
            toolCalls,
            metadata,
            tokens,
            promptTokens,
            completionTokens,
            latency,
        } = req.body;
        const userId = req.user?._id;
        const organizationId = req.organization?._id;

        // Check if chat exists and belongs to user and the correct organization
        const chat = await Chat.findOne({
            _id: chatId,
            userId: userId,
            organizationId: organizationId,
        });

        if (!chat) {
            res.status(404).json({ message: 'Chat not found or access denied' });
            return;
        }

        // Create and save new message
        const message = new Message({
            chatId,
            userId,
            organizationId,
            role,
            content,
            name,
            functionCall,
            toolCalls,
            metadata,
            tokens,
            promptTokens,
            completionTokens,
            latency,
        });

        await message.save();

        // Update chat's last activity
        chat.updatedAt = new Date();
        await chat.save();

        res.status(201).json({
            message: 'Message added successfully',
            data: message,
        });
    } catch (error: any) {
        logger.error(`Add message error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all messages for a specific chat WITH pagination logic moved inside
const getChatMessages = async (req: RequestWithPagination, res: Response): Promise<void> => {
    try {
        const { chatId } = req.params;
        const userId = req.user?._id;
        const organizationId = req.organization?._id;

        // Check if chat exists and belongs to user/organization
        const chat = await Chat.findOne({
            _id: chatId,
            organizationId: organizationId,
            ...(req.user?.role !== 'admin' && req.user?.role !== 'superadmin' ? { userId: userId } : {}),
        });

        if (!chat) {
            res.status(404).json({ message: 'Chat not found or access denied' });
            return;
        }

        // Ensure pagination middleware has run and attached properties
        if (!req.pagination) {
             logger.error('Pagination middleware did not run before getChatMessages');
             res.status(500).json({ message: 'Server configuration error: Pagination not available' });
             return;
        }

        const { page, limit, skip } = req.pagination;

        const query: any = { chatId: chatId };

        // Perform find and count using pagination parameters
        const messages = await Message.find(query)
            .sort({ createdAt: 1 })
            .limit(limit)
            .skip(skip);
        
        const totalMessages = await Message.countDocuments(query);

        const paginatedResults: IPaginatedResults = {
            data: messages,
            page: page,
            limit: limit,
            totalPages: Math.ceil(totalMessages / limit),
            totalResults: totalMessages,
        };

        res.status(200).json(paginatedResults);

    } catch (error: any) {
        logger.error(`Get chat messages error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get a specific message by ID
const getMessageById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { chatId, messageId } = req.params;
        const userId = req.user?._id;
        const organizationId = req.organization?._id;

        // Check if chat exists and belongs to user/organization
        const chat = await Chat.findOne({
            _id: chatId,
            organizationId: organizationId,
            // Only enforce userId check for non-admins
            ...(req.user?.role !== 'admin' && req.user?.role !== 'superadmin' ? { userId: userId } : {}),
        });

        if (!chat) {
            res.status(404).json({ message: 'Chat not found or access denied' });
            return;
        }

        const message = await Message.findOne({
            _id: messageId,
            chatId,
        });

        if (!message) {
            res.status(404).json({ message: 'Message not found' });
            return;
        }

        res.status(200).json({ data: message }); // Ensure data is nested under 'data' key
    } catch (error: any) {
        logger.error(`Get message by ID error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update a message
const updateMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        const { chatId, messageId } = req.params;
        const { content, metadata } = req.body;
        const userId = req.user?._id;
        const organizationId = req.organization?._id;

        // Check if chat exists and belongs to user/organization
        const chat = await Chat.findOne({
            _id: chatId,
            organizationId: organizationId,
            // Only enforce userId check for non-admins
            ...(req.user?.role !== 'admin' && req.user?.role !== 'superadmin' ? { userId: userId } : {}),
        });

        if (!chat) {
            res.status(404).json({ message: 'Chat not found or access denied' });
            return;
        }

        const message = await Message.findOne({
            _id: messageId,
            chatId,
        });

        if (!message) {
            res.status(404).json({ message: 'Message not found' });
            return;
        }

        // Update message fields
        if (content) message.content = content;
        if (metadata) message.metadata = { ...(message.metadata || {}), ...metadata };

        await message.save();

        res.status(200).json({
            message: 'Message updated successfully',
            data: message,
        });
    } catch (error: any) {
        logger.error(`Update message error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete a message
const deleteMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        const { chatId, messageId } = req.params;
        const userId = req.user?._id;
        const organizationId = req.organization?._id;

        // Check if chat exists and belongs to user/organization
        const chat = await Chat.findOne({
            _id: chatId,
            organizationId: organizationId,
            // Only enforce userId check for non-admins
            ...(req.user?.role !== 'admin' && req.user?.role !== 'superadmin' ? { userId: userId } : {}),
        });

        if (!chat) {
            res.status(404).json({ message: 'Chat not found or access denied' });
            return;
        }

        const result = await Message.deleteOne({
            _id: messageId,
            chatId,
        });

        if (result.deletedCount === 0) {
            res.status(404).json({ message: 'Message not found' });
            return;
        }

        res.status(200).json({
            message: 'Message deleted successfully',
        });
    } catch (error: any) {
        logger.error(`Delete message error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Batch add multiple messages to a chat
const batchAddMessages = async (req: Request, res: Response): Promise<void> => {
    try {
        const { chatId } = req.params;
        const { messages } = req.body;
        const userId = req.user?._id;
        const organizationId = req.organization?._id;

        if (!Array.isArray(messages) || messages.length === 0) {
            res.status(400).json({ message: 'No messages provided or invalid format' });
            return;
        }

        // Check if chat exists and belongs to user/organization
        const chat = await Chat.findOne({
            _id: chatId,
            organizationId: organizationId,
            userId: userId, // Assuming batch add requires ownership
        });

        if (!chat) {
            res.status(404).json({ message: 'Chat not found or access denied for batch operation' });
            return;
        }

        // Prepare messages for bulk insertion
        const messagesToInsert = messages.map((msg: any) => ({
            chatId,
            userId,
            organizationId,
            role: msg.role,
            content: msg.content,
            name: msg.name || null,
            functionCall: msg.functionCall || null,
            toolCalls: msg.toolCalls || null,
            metadata: msg.metadata || {},
            tokens: msg.tokens || 0,
            promptTokens: msg.promptTokens || 0,
            completionTokens: msg.completionTokens || 0,
            latency: msg.latency || 0,
        }));

        // Insert messages in bulk
        const result = await Message.insertMany(messagesToInsert);

        // Update chat's last activity
        chat.updatedAt = new Date();
        await chat.save();

        res.status(201).json({
            message: `${result.length} messages added successfully`,
            count: result.length,
        });
    } catch (error: any) {
        logger.error(`Batch add messages error: ${error.message}`);
        if (!res.headersSent) {
             res.status(500).json({ message: 'Server error during batch message add' });
        }
    }
};

module.exports = {
    addMessage,
    getChatMessages,
    getMessageById,
    updateMessage,
    deleteMessage,
    batchAddMessages,
};

// For ES Module compatibility
export {
    addMessage,
    getChatMessages,
    getMessageById,
    updateMessage,
    deleteMessage,
    batchAddMessages,
};
