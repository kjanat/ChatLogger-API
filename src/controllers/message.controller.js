const Message = require('../models/message.model');
const Chat = require('../models/chat.model');
const logger = require('../utils/logger');
const paginateResults = require('../middleware/pagination');

// Add a new message to a chat
const addMessage = async (req, res) => {
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

        // Check if chat exists and belongs to user and the correct organization
        const chat = await Chat.findOne({
            _id: chatId,
            userId: req.user._id,
            organizationId: req.organization ? req.organization._id : req.user.organizationId,
        });

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        // Create and save new message
        const message = new Message({
            chatId,
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
    } catch (error) {
        logger.error(`Add message error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all messages for a specific chat
const getChatMessages = async (req, res, _next) => {
    try {
        const query = { chatId: req.params.chatId };

        await paginateResults(Message, query, { sort: { createdAt: 1 } })(req, res, async () => {
            res.status(200).json(req.paginatedResults);
        });
    } catch (error) {
        logger.error(`Get chat messages error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get a specific message by ID
const getMessageById = async (req, res) => {
    try {
        const { chatId, messageId } = req.params;

        // Check if chat exists and belongs to user and the correct organization
        const chat = await Chat.findOne({
            _id: chatId,
            userId: req.user._id,
            organizationId: req.organization ? req.organization._id : req.user.organizationId,
        });

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        const message = await Message.findOne({
            _id: messageId,
            chatId,
        });

        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        res.status(200).json({ message });
    } catch (error) {
        logger.error(`Get message by ID error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update a message
const updateMessage = async (req, res) => {
    try {
        const { chatId, messageId } = req.params;
        const { content, metadata } = req.body;

        // Check if chat exists and belongs to user and the correct organization
        const chat = await Chat.findOne({
            _id: chatId,
            userId: req.user._id,
            organizationId: req.organization ? req.organization._id : req.user.organizationId,
        });

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        const message = await Message.findOne({
            _id: messageId,
            chatId,
        });

        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        // Update message fields
        if (content) message.content = content;
        if (metadata) message.metadata = { ...message.metadata, ...metadata };

        await message.save();

        res.status(200).json({
            message: 'Message updated successfully',
            data: message,
        });
    } catch (error) {
        logger.error(`Update message error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete a message
const deleteMessage = async (req, res) => {
    try {
        const { chatId, messageId } = req.params;

        // Check if chat exists and belongs to user and the correct organization
        const chat = await Chat.findOne({
            _id: chatId,
            userId: req.user._id,
            organizationId: req.organization ? req.organization._id : req.user.organizationId,
        });

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        const message = await Message.findOne({
            _id: messageId,
            chatId,
        });

        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        await Message.findByIdAndDelete(messageId);

        res.status(200).json({
            message: 'Message deleted successfully',
        });
    } catch (error) {
        logger.error(`Delete message error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Batch add multiple messages to a chat
const batchAddMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { messages } = req.body;

        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ message: 'No messages provided' });
        }

        // Check if chat exists and belongs to user and the correct organization
        const chat = await Chat.findOne({
            _id: chatId,
            userId: req.user._id,
            organizationId: req.organization ? req.organization._id : req.user.organizationId,
        });

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        // Prepare messages for bulk insertion
        const messagesToInsert = messages.map(msg => ({
            chatId,
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
    } catch (error) {
        logger.error(`Batch add messages error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
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
