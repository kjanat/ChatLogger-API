import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { IUser } from '../models/user.model';
import { IOrganization } from '../models/organization.model';
import { IPaginatedResults } from '../middleware/pagination';
import Chat from '../models/chat.model';
import Message from '../models/message.model';
import logger from '../utils/logger';

// Define an interface to extend Express Request with optional pagination property
interface RequestWithPagination extends Request {
    pagination?: {
        page: number;
        limit: number;
        skip: number;
    };
    // Add paginatedResults if it's supposed to be attached by a middleware
    paginatedResults?: IPaginatedResults;
}

// Create a new chat session
const createChat = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, source = 'web', tags = [], metadata = {} } = req.body;
        const reqUser = req.user as IUser;
        const reqOrg = req.organization as IOrganization;

        // Get organization from request (set by middleware)
        const organizationId = reqOrg?._id ?? reqUser?.organizationId;

        if (!organizationId) {
            res.status(400).json({ message: 'Organization context is required' });
            return;
        }

        const chat = new Chat({
            userId: reqUser._id,
            organizationId,
            title,
            source,
            tags,
            metadata,
        });

        await chat.save();

        res.status(201).json({
            message: 'Chat session created successfully',
            chat,
        });
    } catch (error: any) {
        logger.error(`Create chat error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get user's chats with pagination
const getChats = async (req: RequestWithPagination, res: Response): Promise<void> => {
    try {
        const reqUser = req.user as IUser;
        const reqOrg = req.organization as IOrganization;

        if (!reqUser) {
            res.status(401).json({ message: 'User authentication required' });
            return;
        }

        const organizationId = reqOrg?._id ?? reqUser.organizationId;

        if (!organizationId) {
            res.status(400).json({ message: 'Organization context is required' });
            return;
        }

        // Define query type
        interface IChatQuery {
            userId: Types.ObjectId;
            organizationId: Types.ObjectId;
            isActive?: boolean; // Add optional isActive
        }

        const query: IChatQuery = {
            userId: reqUser._id as Types.ObjectId,
            organizationId: organizationId as Types.ObjectId,
        };

        if (req.query.isActive !== undefined) {
            query.isActive = req.query.isActive === 'true';
        }

        // Use pagination info from middleware
        const { page = 1, limit = 10, skip = 0 } = req.pagination || {};

        const totalChats = await Chat.countDocuments(query);
        const chats = await Chat.find(query)
            .limit(limit)
            .skip(skip)
            .sort({ createdAt: -1 }); // Example sort

        const paginatedResults: IPaginatedResults = {
            data: chats,
            page: page,
            limit: limit,
            totalPages: Math.ceil(totalChats / limit),
            totalResults: totalChats,
        };

        res.status(200).json(paginatedResults);

    } catch (error: any) {
        logger.error(`Get user chats error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get specific chat by ID
const getChatById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { chatId } = req.params;
        const reqUser = req.user as IUser;
        const reqOrg = req.organization as IOrganization;

        if (!reqUser) {
            res.status(401).json({ message: 'User authentication required' });
            return;
        }

        const organizationId = reqOrg?._id ?? reqUser.organizationId;

        if (!organizationId) {
            res.status(400).json({ message: 'Organization context is required' });
            return;
        }

        const chat = await Chat.findOne({
            _id: chatId,
            userId: reqUser._id,
            organizationId: organizationId,
        });

        if (!chat) {
            res.status(404).json({ message: 'Chat not found' });
            return;
        }

        res.status(200).json({ chat });
    } catch (error: any) {
        logger.error(`Get chat by ID error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update chat details
const updateChat = async (req: Request, res: Response): Promise<void> => {
    try {
        const { chatId } = req.params;
        const { title, tags, metadata, isActive } = req.body;
        const reqUser = req.user as IUser;
        const reqOrg = req.organization as IOrganization;

        if (!reqUser) {
            res.status(401).json({ message: 'User authentication required' });
            return;
        }

        const organizationId = reqOrg?._id ?? reqUser.organizationId;

        if (!organizationId) {
            res.status(400).json({ message: 'Organization context is required' });
            return;
        }

        const chat = await Chat.findOne({
            _id: chatId,
            userId: reqUser._id,
            organizationId: organizationId,
        });

        if (!chat) {
            res.status(404).json({ message: 'Chat not found' });
            return;
        }

        if (title) chat.title = title;
        if (tags) chat.tags = tags;
        if (metadata) chat.metadata = { ...chat.metadata, ...metadata };
        if (isActive !== undefined) chat.isActive = isActive;

        await chat.save();

        res.status(200).json({
            message: 'Chat updated successfully',
            chat,
        });
    } catch (error: any) {
        logger.error(`Update chat error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete a chat session and its messages
const deleteChat = async (req: Request, res: Response): Promise<void> => {
    try {
        const { chatId } = req.params;
        const reqUser = req.user as IUser;
        const reqOrg = req.organization as IOrganization;

        if (!reqUser) {
            res.status(401).json({ message: 'User authentication required' });
            return;
        }

        const organizationId = reqOrg?._id ?? reqUser.organizationId;

        if (!organizationId) {
            res.status(400).json({ message: 'Organization context is required' });
            return;
        }

        const chat = await Chat.findOne({
            _id: chatId,
            userId: reqUser._id,
            organizationId: organizationId,
        });

        if (!chat) {
            res.status(404).json({ message: 'Chat not found' });
            return;
        }

        // Delete all messages associated with this chat
        await Message.deleteMany({ chatId });

        // Delete the chat
        await Chat.findByIdAndDelete(chatId);

        res.status(200).json({
            message: 'Chat and associated messages deleted successfully',
        });
    } catch (error: any) {
        logger.error(`Delete chat error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Search chats by title or tags
const searchChats = async (req: RequestWithPagination, res: Response, _next: NextFunction): Promise<void> => {
    try {
        const reqUser = req.user as IUser;
        const reqOrg = req.organization as IOrganization;
        const organizationId = reqOrg?._id ?? reqUser?.organizationId;
        const searchQueryParam = req.query.query;

        if (!reqUser) {
            res.status(401).json({ message: 'User authentication required' });
            return;
        }

        if (!organizationId) {
            res.status(400).json({ message: 'Organization context is required' });
            return;
        }
        // Ensure searchQueryParam is a non-empty string
        if (typeof searchQueryParam !== 'string' || searchQueryParam.trim() === '') {
            res.status(400).json({ message: 'Search query parameter must be a non-empty string' });
            return;
        }

        const searchRegex = new RegExp(searchQueryParam, 'i'); // Now safe to use

        const searchQuery: any = {
            userId: reqUser._id,
            organizationId: organizationId,
            $or: [
                { title: { $regex: searchRegex, $options: 'i' } },
                { tags: { $in: [searchRegex] } }, // Correct usage for array elements
            ],
        };

        // Use pagination info from middleware
        const { page = 1, limit = 10, skip = 0 } = req.pagination || {};

        const totalChats = await Chat.countDocuments(searchQuery);
        const chats = await Chat.find(searchQuery)
            .limit(limit)
            .skip(skip)
            .sort({ createdAt: -1 }); // Example sort

        const paginatedResults: IPaginatedResults = {
            data: chats,
            page: page,
            limit: limit,
            totalPages: Math.ceil(totalChats / limit),
            totalResults: totalChats,
        };

        res.status(200).json(paginatedResults);

    } catch (error: any) {
        logger.error(`Search chats error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// For CommonJS compatibility
module.exports = {
    createChat,
    getChats,
    getChatById,
    updateChat,
    deleteChat,
    searchChats,
};

// For ES Module compatibility
export {
    createChat,
    getChats,
    getChatById,
    updateChat,
    deleteChat,
    searchChats,
};
