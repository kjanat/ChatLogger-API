import { Request, Response, NextFunction } from 'express';
const Organization = require('../models/organization.model');
const User = require('../models/user.model');
const logger = require('../utils/logger');
import { IPaginatedResults } from '../middleware/pagination';

// Interface combining Request with pagination properties
interface RequestWithPagination extends Request {
    pagination?: {
        page: number;
        limit: number;
        skip: number;
    };
    paginatedResults?: IPaginatedResults; // Add paginatedResults for type safety if attaching
}

// Create a new organization (Superadmin only)
const createOrganization = async (req: Request, res: Response): Promise<void> => {
    // Ensure only superadmin can create organizations
    if (req.user?.role !== 'superadmin') {
        res.status(403).json({ message: 'Access denied' });
        return;
    }

    try {
        const { name, contactEmail, description, settings } = req.body;

        // Check if organization with name already exists
        const existingOrg = await Organization.findOne({ name });
        if (existingOrg) {
            res.status(409).json({ message: 'Organization name already exists' });
            return;
        }

        // Generate API key
        const apiKey = Organization.generateApiKey();

        const newOrg = new Organization({
            name,
            contactEmail,
            description,
            settings,
            apiKey,
        });

        await newOrg.save();

        res.status(201).json({
            message: 'Organization created successfully',
            data: { 
                id: newOrg._id, 
                name: newOrg.name, 
                apiKey: newOrg.apiKey, // Consider if API key should be returned directly
            }
        });
    } catch (error: any) {
        logger.error(`Create organization error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all organizations (Superadmin only) with pagination logic moved inside
const getOrganizations = async (req: RequestWithPagination, res: Response): Promise<void> => {
    if (req.user?.role !== 'superadmin') {
        res.status(403).json({ message: 'Access denied' });
        return;
    }

    try {
         // Ensure pagination middleware has run
        if (!req.pagination) {
             logger.error('Pagination middleware did not run before getOrganizations');
             res.status(500).json({ message: 'Server configuration error: Pagination not available' });
             return;
        }

        const { page, limit, skip } = req.pagination;
        const query = {}; // No initial filters for superadmin
        const sortOptions = { name: 1 }; // Default sort

        const organizations = await Organization.find(query)
            .sort(sortOptions)
            .limit(limit)
            .skip(skip)
            .select('-apiKey'); // Exclude API key from list view
            
        const totalOrganizations = await Organization.countDocuments(query);

        const paginatedResults: IPaginatedResults = {
            data: organizations,
            page: page,
            limit: limit,
            totalPages: Math.ceil(totalOrganizations / limit),
            totalResults: totalOrganizations,
        };

        res.status(200).json(paginatedResults);

    } catch (error: any) {
        logger.error(`Get organizations error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get a single organization by ID (Superadmin or Admin of that org)
const getOrganizationById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // Superadmin can access any org
        // Admin can only access their own org
        if (req.user?.role !== 'superadmin' && req.user?.organizationId?.toString() !== id) {
             // Also check if the organization object attached by middleware matches
             if (req.organization?._id?.toString() !== id) {
                res.status(403).json({ message: 'Access denied' });
                return;
             }
        }

        // Use the org attached by middleware if available, otherwise fetch
        const organization = req.organization || await Organization.findById(id);

        if (!organization) {
            res.status(404).json({ message: 'Organization not found' });
            return;
        }

        // Optionally fetch users count for the organization
        const userCount = await User.countDocuments({ organizationId: organization._id });

        // Avoid sending sensitive info like API key unless necessary/requested
        const orgData = organization.toObject();
        delete orgData.apiKey; // Remove API key by default

        res.status(200).json({ data: { ...orgData, userCount } });
    } catch (error: any) {
        logger.error(`Get organization by ID error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update an organization (Superadmin or Admin of that org)
const updateOrganization = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, contactEmail, description, isActive, settings } = req.body;

        // Permissions check
        if (req.user?.role !== 'superadmin' && req.user?.organizationId?.toString() !== id) {
            res.status(403).json({ message: 'Access denied' });
            return;
        }

        const organization = await Organization.findById(id);

        if (!organization) {
            res.status(404).json({ message: 'Organization not found' });
            return;
        }

        // Prevent admins from deactivating their own organization
        if (req.user?.role === 'admin' && isActive === false && req.user?.organizationId?.toString() === id) {
            res.status(403).json({ message: 'Admins cannot deactivate their own organization' });
            return;
        }

        // Update fields selectively
        if (name) organization.name = name;
        if (contactEmail) organization.contactEmail = contactEmail;
        if (description) organization.description = description;
        if (isActive !== undefined) organization.isActive = isActive;
        if (settings) organization.settings = { ...(organization.settings || {}), ...settings };

        await organization.save();

        res.status(200).json({
            message: 'Organization updated successfully',
            data: { id: organization._id, name: organization.name, isActive: organization.isActive },
        });
    } catch (error: any) {
        // Handle potential duplicate name error
        if (error.code === 11000) {
            res.status(409).json({ message: 'Organization name already exists' });
            return;
        }
        logger.error(`Update organization error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete an organization (Superadmin only)
const deleteOrganization = async (req: Request, res: Response): Promise<void> => {
    if (req.user?.role !== 'superadmin') {
        res.status(403).json({ message: 'Access denied' });
        return;
    }

    try {
        const { id } = req.params;

        // Prevent deleting organization with active users
        const userCount = await User.countDocuments({ organizationId: id, isActive: true });
        if (userCount > 0) {
            res.status(400).json({ message: `Cannot delete organization with ${userCount} active user(s). Please deactivate or reassign users first.` });
            return;
        }

        const result = await Organization.findByIdAndDelete(id);

        if (!result) {
            res.status(404).json({ message: 'Organization not found' });
            return;
        }

        // Optional: Handle related data cleanup (users, chats, messages) if needed
        // await User.deleteMany({ organizationId: id });
        // await Chat.deleteMany({ organizationId: id });
        // await Message.deleteMany({ organizationId: id });

        res.status(200).json({ message: 'Organization deleted successfully' });
    } catch (error: any) {
        logger.error(`Delete organization error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Regenerate API key for an organization (Superadmin or Admin of that org)
const regenerateApiKey = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // Permissions check
        if (req.user?.role !== 'superadmin' && req.user?.organizationId?.toString() !== id) {
            res.status(403).json({ message: 'Access denied' });
            return;
        }

        const organization = await Organization.findById(id);

        if (!organization) {
            res.status(404).json({ message: 'Organization not found' });
            return;
        }

        const newApiKey = Organization.generateApiKey();
        organization.apiKey = newApiKey;
        await organization.save();

        res.status(200).json({
            message: 'API key regenerated successfully',
            apiKey: newApiKey, // Return the new key
        });
    } catch (error: any) {
        logger.error(`Regenerate API key error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createOrganization,
    getOrganizations,
    getOrganizationById,
    updateOrganization,
    deleteOrganization,
    regenerateApiKey,
};

// Add ES Module exports
export {
    createOrganization,
    getOrganizations,
    getOrganizationById,
    updateOrganization,
    deleteOrganization,
    regenerateApiKey,
};
