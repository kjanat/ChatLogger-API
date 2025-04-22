import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Organization from '../models/organization.model';
import logger from '../utils/logger';

/**
 * Middleware to validate organization API keys
 * This allows organization-wide authentication separate from user authentication
 */
const authenticateOrganizationApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    try {
        const apiKey = req.headers['x-organization-api-key'] as string;

        if (!apiKey) {
            return res.status(401).json({ message: 'Organization API key required' });
        }

        const organization = await Organization.findOne({ apiKey, isActive: true });

        if (!organization) {
            return res.status(401).json({ message: 'Invalid organization API key' });
        }

        // Assign the full organization object to req.organization
        req.organization = organization;
        next();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Organization API key authentication error: ${errorMessage}`);
        return res.status(401).json({ message: 'Organization authentication error' });
    }
};

/**
 * Middleware to add organization object to request based on the user's organization or other sources
 * Must be used after user authentication if relying on user
 */
const addOrganizationToRequest = async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    try {
        // If organization already attached (e.g., by API key middleware), proceed
        if (req.organization) {
            return next();
        }

        let organizationId: mongoose.Types.ObjectId | null = null;

        // 1. Try getting organization ID from the authenticated user
        if (req.user && req.user.organizationId) {
            organizationId = req.user.organizationId;
        }
        // 2. Try getting from query parameters
        else if (req.query.organizationId && mongoose.Types.ObjectId.isValid(req.query.organizationId as string)) {
            organizationId = new mongoose.Types.ObjectId(req.query.organizationId as string);
        }
        // 3. Try getting from request body
        else if (req.body && req.body.organizationId && mongoose.Types.ObjectId.isValid(req.body.organizationId)) {
            organizationId = new mongoose.Types.ObjectId(req.body.organizationId);
        }
        // 4. Try getting from route parameters
        else if (req.params && req.params.organizationId && mongoose.Types.ObjectId.isValid(req.params.organizationId)) {
            organizationId = new mongoose.Types.ObjectId(req.params.organizationId);
        }

        // If an organization ID was found, fetch the organization and attach it
        if (organizationId) {
            const organization = await Organization.findById(organizationId);
            if (organization) {
                req.organization = organization;
                return next();
            } else {
                // If ID was provided but org doesn't exist
                return res.status(404).json({ message: 'Organization not found for the provided ID' });
            }
        }

        // If no organization ID could be determined
        return res.status(400).json({ message: 'Could not determine Organization ID for the request' });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error adding organization to request: ${errorMessage}`);
        return res.status(400).json({ message: 'Error processing organization information' });
    }
};

export {
    authenticateOrganizationApiKey,
    addOrganizationToRequest
};
