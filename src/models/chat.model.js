const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
            index: true
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        source: {
            type: String,
            required: true,
            enum: ['web', 'mobile', 'api'],
            default: 'web',
        },
        metadata: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
            default: {},
        },
        tags: {
            type: [String],
            default: [],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster queries
chatSchema.index({ userId: 1, createdAt: -1 });
chatSchema.index({ organizationId: 1, createdAt: -1 });
chatSchema.index({ tags: 1 });

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
