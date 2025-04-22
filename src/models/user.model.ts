import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Define the user interface
export interface IUser extends Document {
    username: string;
    email: string;
    password: string;
    role: 'superadmin' | 'admin' | 'user';
    apiKey?: string;
    organizationId?: mongoose.Types.ObjectId;
    isActive: boolean;
    firstName?: string;
    lastName?: string;
    comparePassword: (password: string) => Promise<boolean>;
    generateApiKey: () => string;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minlength: 3,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: true,
            minlength: 6,
        },
        role: {
            type: String,
            enum: ['superadmin', 'admin', 'user'],
            default: 'user',
        },
        apiKey: {
            type: String,
        },
        organizationId: {
            type: Schema.Types.ObjectId,
            ref: 'Organization',
            required: false,
            index: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        firstName: { type: String, trim: true },
        lastName: { type: String, trim: true },
    },
    {
        timestamps: true,
    }
);

// Define index for apiKey field (using only one method to define index)
userSchema.index({ apiKey: 1 }, { unique: true, sparse: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
    const user = this as IUser;
    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 10);
    }
    next();
});

// Method to compare passwords for login
userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
    return await bcrypt.compare(password, this.password);
};

// Method to generate API key - Fixed to return a string directly for tests
userSchema.methods.generateApiKey = function (): string {
    const apiKey = crypto.randomBytes(32).toString('hex');
    this.apiKey = apiKey;
    // We no longer save the model here to avoid issues in tests
    // The caller should save the model if needed
    return apiKey;
};

const User = mongoose.model<IUser>('User', userSchema);

export default User;
