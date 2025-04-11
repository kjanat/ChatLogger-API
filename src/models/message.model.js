const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
    {
        chatId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Chat',
            required: true,
        },
        role: {
            type: String,
            enum: ['system', 'user', 'assistant', 'function', 'tool'],
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        metadata: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
            default: {},
        },
        name: {
            type: String,
            default: null,
        },
        functionCall: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        toolCalls: {
            type: [mongoose.Schema.Types.Mixed],
            default: null,
        },
        tokens: {
            type: Number,
            default: 0,
        },
        promptTokens: {
            type: Number,
            default: 0,
        },
        completionTokens: {
            type: Number,
            default: 0,
        },
        latency: {
            type: Number,
            default: 0,
        }
    },
    {
        timestamps: true,
    }
);

// Index for faster queries
messageSchema.index({ chatId: 1, createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
