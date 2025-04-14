const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
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
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
            index: true,
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

// Define index for apiKey field (using only one method to define index)
userSchema.index({ apiKey: 1 }, { unique: true, sparse: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
    const user = this;
    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 10);
    }
    next();
});

// Method to compare passwords for login
userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

// Method to generate API key - Fixed to return a string directly for tests
userSchema.methods.generateApiKey = function () {
    const apiKey = require('crypto').randomBytes(32).toString('hex');
    this.apiKey = apiKey;
    // We no longer save the model here to avoid issues in tests
    // The caller should save the model if needed
    return apiKey;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
