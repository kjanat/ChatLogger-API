import mongoose, { Schema, Document, Types } from 'mongoose';
// import { IChat } from '../types/models'; // Remove this import

// Define the interface locally
export interface IChat extends Document {
    userId: Types.ObjectId;
    organizationId: Types.ObjectId;
    title: string;
    source?: string;
    tags?: string[];
    metadata?: Record<string, any>; // Or define a more specific type
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const chatSchema = new Schema<IChat>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        organizationId: {
            type: Schema.Types.ObjectId,
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
            enum: ['web', 'mobile', 'api', 'widget'],
            default: 'web',
        },
        metadata: {
            type: Object,
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

const Chat = mongoose.model<IChat>('Chat', chatSchema);

export default Chat;
