// filepath: c:\Users\kjana\Projects\ChatLogger\src\controllers\export.controller.js
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
const formatExportData = (chats, messages, format) => {
    // For CSV format, flatten the data structure
    if (format === 'csv') {
        return messages.map(msg => ({
            chatId: msg.chatId,
            chatTitle: chats.find(c => c._id.toString() === msg.chatId.toString())?.title || 'Unknown',
            messageId: msg._id,
            role: msg.role,
            content: msg.content,
            tokens: msg.tokens,
            latency: msg.latency,
            created: msg.createdAt,
            model: msg.model,
            source: chats.find(c => c._id.toString() === msg.chatId.toString())?.source || 'Unknown'
        }));
    }
    
    // For JSON format, maintain hierarchical structure
    return chats.map(chat => ({
        _id: chat._id,
        title: chat.title,
        source: chat.source,
        tags: chat.tags,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        messages: messages
            .filter(msg => msg.chatId.toString() === chat._id.toString())
            .map(msg => ({
                _id: msg._id,
                role: msg.role,
                content: msg.content,
                tokens: msg.tokens,
                latency: msg.latency,
                model: msg.model,
                createdAt: msg.createdAt
            }))
    }));
};

/**
 * Export chats and messages within a specified date range
 */
const exportChatsAndMessages = async (req, res) => {
    try {
        const { startDate, endDate, format = 'json' } = req.query;
        const organizationId = req.organization ? req.organization._id : req.user.organizationId;
        
        // Validate date inputs
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
        const end = endDate ? new Date(endDate) : new Date();
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }
        
        // Validate format
        if (!['json', 'csv'].includes(format.toLowerCase())) {
            return res.status(400).json({ message: 'Supported formats are json and csv' });
        }
        
        // Get all chats for this organization in the date range
        const chats = await Chat.find({
            organizationId: organizationId,
            createdAt: { $gte: start, $lte: end }
        }).lean();
        
        if (chats.length === 0) {
            return res.status(404).json({ message: 'No chats found in the specified date range' });
        }
        
        // Get all chat IDs
        const chatIds = chats.map(chat => chat._id);
        
        // Get all messages for these chats
        const messages = await Message.find({
            chatId: { $in: chatIds }
        }).lean();
        
        // Format the data according to the specified format
        const exportData = formatExportData(chats, messages, format.toLowerCase());
        
        // Generate filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `chatlogger_export_${timestamp}.${format.toLowerCase()}`;
        
        // Set appropriate headers for the response
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        
        if (format.toLowerCase() === 'csv') {
            // For CSV, convert to CSV format
            if (exportData.length === 0) {
                return res.status(404).json({ message: 'No messages found for the specified chats' });
            }
            
            // Get the headers from the first object
            const headers = Object.keys(exportData[0]);
            
            // Function to escape CSV fields
            const escapeCSV = (field) => {
                if (field === null || field === undefined) {
                    return '';
                }
                field = String(field);
                // If the field contains a comma, a double quote, or a newline, wrap it in double quotes
                if (field.includes(',') || field.includes('"') || field.includes('\n')) {
                    // Replace double quotes with two double quotes
                    return `"${field.replace(/"/g, '""')}"`;
                }
                return field;
            };
            
            // Generate the CSV content
            const csvContent = [
                headers.join(','),
                ...exportData.map(row => headers.map(header => escapeCSV(row[header])).join(','))
            ].join('\n');
            
            res.setHeader('Content-Type', 'text/csv');
            return res.send(csvContent);
        } else {
            // For JSON, return as is
            res.setHeader('Content-Type', 'application/json');
            return res.json({
                message: 'Export successful',
                metadata: {
                    startDate: start,
                    endDate: end,
                    totalChats: chats.length,
                    totalMessages: messages.length,
                    format: format.toLowerCase(),
                    timestamp: new Date()
                },
                data: exportData
            });
        }
    } catch (error) {
        logger.error(`Export error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Export user activity data
 */
const exportUserActivity = async (req, res) => {
    try {
        const { startDate, endDate, format = 'json' } = req.query;
        const organizationId = req.organization ? req.organization._id : req.user.organizationId;
        
        // Validate date inputs
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
        const end = endDate ? new Date(endDate) : new Date();
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }
        
        // Validate format
        if (!['json', 'csv'].includes(format.toLowerCase())) {
            return res.status(400).json({ message: 'Supported formats are json and csv' });
        }
        
        // Get all users for this organization
        const users = await User.find({
            organizationId: organizationId
        }).select('-password').lean();
        
        if (users.length === 0) {
            return res.status(404).json({ message: 'No users found' });
        }
        
        // Get user IDs
        const userIds = users.map(user => user._id);
        
        // Get chat activity for these users
        const chatActivity = await Chat.aggregate([
            {
                $match: {
                    organizationId: organizationId,
                    userId: { $in: userIds },
                    createdAt: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: "$userId",
                    chatCount: { $sum: 1 },
                    firstActivity: { $min: "$createdAt" },
                    lastActivity: { $max: "$updatedAt" }
                }
            }
        ]);
        
        // Map users to activity data
        const activityData = users.map(user => {
            const userActivity = chatActivity.find(a => a._id.toString() === user._id.toString()) || 
                { chatCount: 0, firstActivity: null, lastActivity: null };
                
            return {
                userId: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                chatCount: userActivity.chatCount,
                firstActivity: userActivity.firstActivity,
                lastActivity: userActivity.lastActivity,
                createdAt: user.createdAt
            };
        });
        
        // Generate filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `user_activity_export_${timestamp}.${format.toLowerCase()}`;
        
        // Set appropriate headers for the response
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        
        if (format.toLowerCase() === 'csv') {
            // For CSV, convert to CSV format
            if (activityData.length === 0) {
                return res.status(404).json({ message: 'No user activity data available' });
            }
            
            // Get the headers from the first object
            const headers = Object.keys(activityData[0]);
            
            // Function to escape CSV fields
            const escapeCSV = (field) => {
                if (field === null || field === undefined) {
                    return '';
                }
                field = String(field);
                // If the field contains a comma, a double quote, or a newline, wrap it in double quotes
                if (field.includes(',') || field.includes('"') || field.includes('\n')) {
                    // Replace double quotes with two double quotes
                    return `"${field.replace(/"/g, '""')}"`;
                }
                return field;
            };
            
            // Generate the CSV content
            const csvContent = [
                headers.join(','),
                ...activityData.map(row => headers.map(header => escapeCSV(row[header])).join(','))
            ].join('\n');
            
            res.setHeader('Content-Type', 'text/csv');
            return res.send(csvContent);
        } else {
            // For JSON, return as is
            res.setHeader('Content-Type', 'application/json');
            return res.json({
                message: 'User activity export successful',
                metadata: {
                    startDate: start,
                    endDate: end,
                    totalUsers: users.length,
                    format: format.toLowerCase(),
                    timestamp: new Date()
                },
                data: activityData
            });
        }
    } catch (error) {
        logger.error(`User activity export error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    exportChatsAndMessages,
    exportUserActivity
};
