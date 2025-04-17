const Organization = require('../models/organization.model');
const logger = require('../utils/logger');

// Create a new organization (admin only)
const createOrganization = async (req, res) => {
    try {
        const { name, contactEmail, description } = req.body;

        // Check if organization with this name already exists
        const existingOrg = await Organization.findOne({ name });
        if (existingOrg) {
            return res.status(409).json({
                message: 'Organization with this name already exists',
            });
        }

        // Generate API key for the organization
        const apiKey = Organization.generateApiKey();

        // Create new organization
        const organization = new Organization({
            name,
            apiKey,
            contactEmail,
            description,
        });

        await organization.save();

        res.status(201).json({
            message: 'Organization created successfully',
            organization: {
                id: organization._id,
                name: organization.name,
                apiKey: organization.apiKey,
            },
        });
    } catch (error) {
        logger.error(`Create organization error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all organizations (super admin only)
const getAllOrganizations = async (req, res) => {
    try {
        const { page = 1, limit = 10, isActive } = req.query;

        const query = {};
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        const options = {
            sort: { name: 1 },
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
        };

        const organizations = await Organization.find(query)
            .sort(options.sort)
            .limit(options.limit)
            .skip((options.page - 1) * options.limit);

        const total = await Organization.countDocuments(query);

        res.status(200).json({
            organizations,
            totalPages: Math.ceil(total / options.limit),
            currentPage: options.page,
            totalOrganizations: total,
        });
    } catch (error) {
        logger.error(`Get all organizations error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get organization by ID
const getOrganizationById = async (req, res) => {
    try {
        const { id } = req.params;

        // Superadmins can view any organization
        // Regular users and admins can only view their own organization
        let query;
        if (req.user.role === 'superadmin') {
            query = { _id: id };
        } else {
            // For regular admins, make sure it's both the requested ID AND their organization
            if (id !== req.user.organizationId.toString()) {
                return res
                    .status(403)
                    .json({ message: 'Access denied: You can only view your own organization' });
            }
            query = { _id: id };
        }

        const organization = await Organization.findOne(query);

        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        res.status(200).json({ organization });
    } catch (error) {
        logger.error(`Get organization error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update organization
const updateOrganization = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, contactEmail, description, isActive } = req.body;

        // Superadmins can update any organization
        // Regular admins can only update their own organization
        let query;
        if (req.user.role === 'superadmin') {
            query = { _id: id };
        } else {
            // For regular admins, make sure it's both the requested ID AND their organization
            if (id !== req.user.organizationId.toString()) {
                return res
                    .status(403)
                    .json({ message: 'Access denied: You can only update your own organization' });
            }
            query = { _id: id };
        }

        const organization = await Organization.findOne(query);

        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        // Update fields
        if (name) organization.name = name;
        if (contactEmail !== undefined) organization.contactEmail = contactEmail;
        if (description !== undefined) organization.description = description;
        if (isActive !== undefined && req.user.role === 'superadmin') {
            organization.isActive = isActive;
        }

        await organization.save();

        res.status(200).json({
            message: 'Organization updated successfully',
            organization,
        });
    } catch (error) {
        logger.error(`Update organization error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Generate new API key for organization
const regenerateApiKey = async (req, res) => {
    try {
        const { id } = req.params;

        // Superadmins can regenerate API key for any organization
        // Regular admins can only regenerate API key for their own organization
        let query;
        if (req.user.role === 'superadmin') {
            query = { _id: id };
        } else {
            // For regular admins, make sure it's both the requested ID AND their organization
            if (id !== req.user.organizationId.toString()) {
                return res.status(403).json({
                    message:
                        'Access denied: You can only regenerate API keys for your own organization',
                });
            }
            query = { _id: id };
        }

        const organization = await Organization.findOne(query);

        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        // Generate new API key
        const apiKey = Organization.generateApiKey();
        organization.apiKey = apiKey;

        await organization.save();

        res.status(200).json({
            message: 'Organization API key regenerated successfully',
            apiKey,
        });
    } catch (error) {
        logger.error(`Regenerate API key error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get current organization
const getCurrentOrganization = async (req, res) => {
    try {
        if (!req.user.organizationId) {
            return res.status(404).json({ message: 'No organization associated with this user' });
        }

        const organization = await Organization.findById(req.user.organizationId);

        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        res.status(200).json({ organization });
    } catch (error) {
        logger.error(`Get current organization error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createOrganization,
    getAllOrganizations,
    getOrganizationById,
    updateOrganization,
    regenerateApiKey,
    getCurrentOrganization,
};
