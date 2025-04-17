const Chat = require('../models/chat.model');
const Message = require('../models/message.model');
const logger = require('../utils/logger');
const paginateResults = require('../middleware/pagination');

// Create a new chat session
const createChat = async (req, res) => {
    try {
        const { title, source = 'web', tags = [], metadata = {} } = req.body;

        // Get organization from request (set by middleware)
        const organizationId = req.organization ? req.organization._id : req.user.organizationId;

        if (!organizationId) {
            return res.status(400).json({ message: 'Organization context is required' });
        }

        const chat = new Chat({
            userId: req.user._id,
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
    } catch (error) {
        logger.error(`Create chat error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all chats for current user
const getUserChats = async (req, res, _next) => {
    try {
        const query = {
            userId: req.user._id,
            organizationId: req.organization ? req.organization._id : req.user.organizationId,
        };

        if (req.query.isActive !== undefined) {
            query.isActive = req.query.isActive === 'true';
        }

        await paginateResults(Chat, query)(req, res, async () => {
            res.status(200).json(req.paginatedResults);
        });
    } catch (error) {
        logger.error(`Get user chats error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get specific chat by ID
const getChatById = async (req, res) => {
    try {
        const { chatId } = req.params;

        const chat = await Chat.findOne({
            _id: chatId,
            userId: req.user._id,
            organizationId: req.organization ? req.organization._id : req.user.organizationId,
        });

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        res.status(200).json({ chat });
    } catch (error) {
        logger.error(`Get chat by ID error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update chat details
const updateChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { title, tags, metadata, isActive } = req.body;

        const chat = await Chat.findOne({
            _id: chatId,
            userId: req.user._id,
            organizationId: req.organization ? req.organization._id : req.user.organizationId,
        });

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
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
    } catch (error) {
        logger.error(`Update chat error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete a chat session and its messages
const deleteChat = async (req, res) => {
    try {
        const { chatId } = req.params;

        const chat = await Chat.findOne({
            _id: chatId,
            userId: req.user._id,
            organizationId: req.organization ? req.organization._id : req.user.organizationId,
        });

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        // Delete all messages associated with this chat
        await Message.deleteMany({ chatId });

        // Delete the chat
        await Chat.findByIdAndDelete(chatId);

        res.status(200).json({
            message: 'Chat and associated messages deleted successfully',
        });
    } catch (error) {
        logger.error(`Delete chat error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Search chats by title or tags
const searchChats = async (req, res, _next) => {
    try {
        const searchQuery = {
            userId: req.user._id,
            organizationId: req.organization ? req.organization._id : req.user.organizationId,
            $or: [
                { title: { $regex: req.query.query, $options: 'i' } },
                { tags: { $in: [new RegExp(req.query.query, 'i')] } },
            ],
        };

        await paginateResults(Chat, searchQuery)(req, res, async () => {
            res.status(200).json(req.paginatedResults);
        });
    } catch (error) {
        logger.error(`Search chats error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createChat,
    getUserChats,
    getChatById,
    updateChat,
    deleteChat,
    searchChats,
};
