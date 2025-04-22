import mongoose, { Schema, Document, Types } from 'mongoose';
// import { IMessage } from '../types/models'; // Remove this import

// Define the interface locally
export interface IMessage extends Document {
    chatId: Types.ObjectId;
    userId: Types.ObjectId;
    organizationId: Types.ObjectId;
    role: 'user' | 'assistant' | 'system' | 'function' | 'tool';
    content?: string;
    name?: string; // For function/tool role
    functionCall?: object; // Or define a specific interface
    toolCalls?: any[]; // Or define a specific interface
    metadata?: Record<string, any>;
    tokens?: number;
    promptTokens?: number;
    completionTokens?: number;
    latency?: number;
    createdAt: Date;
    updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
    {
        chatId: {
            type: Schema.Types.ObjectId,
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
            of: Schema.Types.Mixed,
            default: {},
        },
        name: {
            type: String,
            default: null,
        },
        functionCall: {
            type: Schema.Types.Mixed,
            default: null,
        },
        toolCalls: {
            type: [Schema.Types.Mixed],
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
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        organizationId: {
            type: Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
        }
    },
    {
        timestamps: true,
    }
);

// Index for faster queries
messageSchema.index({ chatId: 1, createdAt: 1 });

const Message = mongoose.model<IMessage>('Message', messageSchema);

export default Message;
