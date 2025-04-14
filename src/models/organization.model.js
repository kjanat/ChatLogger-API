const mongoose = require('mongoose');
const crypto = require('crypto');

const organizationSchema = new mongoose.Schema(
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
        },
        description: {
            type: String,
            trim: true,
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

// Method to generate a new API key for the organization
organizationSchema.statics.generateApiKey = function () {
    return crypto.randomBytes(32).toString('hex');
};

// Create indexes for better performance
organizationSchema.index({ name: 1 }, { unique: true });
organizationSchema.index({ apiKey: 1 }, { unique: true });

const Organization = mongoose.model('Organization', organizationSchema);

module.exports = Organization;
