import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

// Define the organization interface
export interface IOrganization extends Document {
    name: string;
    apiKey: string;
    settings: Map<string, mongoose.Schema.Types.Mixed>;
    isActive: boolean;
    contactEmail?: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

// Define the organization model interface (for statics)
interface IOrganizationModel extends mongoose.Model<IOrganization> {
    generateApiKey(): string;
}

const organizationSchema = new Schema<IOrganization>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        apiKey: {
            type: String,
            required: true,
        },
        settings: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
            default: {},
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        contactEmail: {
            type: String,
            trim: true,
            lowercase: true,
            required: false,
        },
        description: {
            type: String,
            trim: true,
            default: '',
            required: false,
        },
    },
    {
        timestamps: true,
    }
);

// Method to generate a new API key for the organization
organizationSchema.statics.generateApiKey = function (): string {
    return crypto.randomBytes(32).toString('hex');
};

// Create indexes for better performance
organizationSchema.index({ name: 1 }, { unique: true });
organizationSchema.index({ apiKey: 1 }, { unique: true });

const Organization = mongoose.model<IOrganization, IOrganizationModel>('Organization', organizationSchema);

export default Organization;
