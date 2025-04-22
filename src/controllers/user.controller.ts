import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { IUser } from '../models/user.model';
import { IOrganization } from '../models/organization.model';
const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const logger = require('../utils/logger');

// Register a new user
const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, email, password, organizationId } = req.body;

        if (!organizationId) {
            res.status(400).json({
                message: 'Organization ID is required'
            });
            return;
        }

        // Check if user with email or username already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }],
        });

        if (existingUser) {
            res.status(409).json({
                message: 'User with this email or username already exists',
            });
            return;
        }

        // Create new user
        const user = new User({
            username,
            email,
            password,
            organizationId,
            role: 'user', // Default role
        });

        await user.save();

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, config.jwtSecret, {
            expiresIn: config.jwtExpiration || '7d', // Use expiration from config
        });

        res.status(201).json({
            message: 'User registered successfully',
            data: { // Nest user data under 'data'
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                organizationId: user.organizationId
            },
            token,
        });
    } catch (error: any) {
        logger.error(`Registration error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Login user
const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email, isActive: true });

        // If user doesn't exist or password is incorrect
        if (!user || !(await user.comparePassword(password))) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, config.jwtSecret, {
            expiresIn: config.jwtExpiration || '7d',
        });

        res.status(200).json({
            message: 'Login successful',
            data: { // Nest user data under 'data'
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                organizationId: user.organizationId
            },
            token,
        });
    } catch (error: any) {
        logger.error(`Login error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get current user profile
const getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const reqUser = req.user as IUser;
        // User object is attached by authenticateJWT middleware
        if (!reqUser) {
            res.status(401).json({ message: 'Not authenticated' });
            return;
        }
        res.status(200).json({
            data: { // Nest user data under 'data'
                id: reqUser._id,
                username: reqUser.username,
                email: reqUser.email,
                role: reqUser.role,
                organizationId: reqUser.organizationId
            },
        });
    } catch (error: any) {
        logger.error(`Get profile error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Generate API key for user
const generateApiKey = async (req: Request, res: Response): Promise<void> => {
    try {
        const reqUser = req.user as IUser;
        if (!reqUser) {
            res.status(401).json({ message: 'Not authenticated' });
            return;
        }
        const apiKey = await reqUser.generateApiKey(); // Assumes generateApiKey saves the user

        res.status(200).json({
            message: 'API key generated successfully',
            apiKey,
        });
    } catch (error: any) {
        logger.error(`Generate API key error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get users in the organization (admin/superadmin only) with pagination
const getUsersInOrganization = async (req: Request, res: Response): Promise<void> => {
    try {
        const reqUser = req.user as IUser;
        const reqOrg = req.organization as IOrganization;

        // Check permissions
        if (reqUser?.role !== 'admin' && reqUser?.role !== 'superadmin') {
            res.status(403).json({
                message: 'Access denied: Admin privileges required'
            });
            return;
        }

        const { page = 1, limit = 10, role, isActive } = req.query;
        
        // Determine target organization ID
        let organizationId: Types.ObjectId | undefined | null = reqOrg?._id as Types.ObjectId | undefined | null;
        if (reqUser?.role === 'superadmin' && req.query.organizationId) {
            if (!Types.ObjectId.isValid(req.query.organizationId as string)) {
                res.status(400).json({ message: 'Invalid organizationId format in query' });
                return;
            }
            organizationId = new Types.ObjectId(req.query.organizationId as string);
        } else if (reqUser?.role === 'admin') {
            organizationId = reqUser.organizationId;
        } else if (!organizationId) {
             res.status(400).json({ message: 'Organization context is required' });
             return;
        }
        
        const query: any = { organizationId };

        // Apply filters
        if (role) {
            query.role = role as string;
        }
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }
        
        const options = {
            sort: { username: 1 },
            page: parseInt(page as string, 10),
            limit: parseInt(limit as string, 10),
        };
        
        const users = await User.find(query)
            .sort(options.sort)
            .limit(options.limit)
            .skip((options.page - 1) * options.limit)
            .select('-password'); // Exclude password
        
        const total = await User.countDocuments(query);
        
        res.status(200).json({
            message: 'Users retrieved successfully', // Added message
            data: users, // Nest users under 'data'
            totalPages: Math.ceil(total / options.limit),
            currentPage: options.page,
            totalCount: total, // Renamed for consistency
        });
    } catch (error: any) {
        logger.error(`Get users error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update user (self or admin/superadmin)
const updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { username, email, role, isActive, firstName, lastName } = req.body;
        const reqUser = req.user as IUser;
        
        let userToUpdate: IUser | null = null;
        
        // Permission checks and fetching the user to update
        if (reqUser?.role === 'superadmin') {
            userToUpdate = await User.findById(id);
        } else if (reqUser?.role === 'admin') {
            userToUpdate = await User.findOne({ 
                _id: id, 
                organizationId: reqUser.organizationId // Admins can only update users in their own org
            });
        } else {
            // Regular users can only update themselves
            // Ensure reqUser exists before checking its ID
            if (!reqUser || id !== (reqUser._id as Types.ObjectId).toString()) {
                res.status(403).json({ 
                    message: 'Access denied: You can only update your own profile' 
                });
                return;
            }
            userToUpdate = await User.findById(id);
        }
        
        if (!userToUpdate) {
            res.status(404).json({ message: 'User not found or access denied' });
            return;
        }
        
        // Update fields selectively
        if (username) userToUpdate.username = username;
        if (email) userToUpdate.email = email;
        if (firstName) userToUpdate.firstName = firstName;
        if (lastName) userToUpdate.lastName = lastName;
        
        // Role and status updates only by admins/superadmins
        if ((reqUser?.role === 'admin' || reqUser?.role === 'superadmin') && role) {
            // Admins cannot create/promote to superadmin
            if (reqUser?.role === 'admin' && role === 'superadmin') {
                res.status(403).json({
                    message: 'Access denied: Admins cannot create or promote users to superadmin'
                });
                return;
            }
            // Prevent self-demotion for the only admin/superadmin?
            // Add check if necessary based on business logic
            userToUpdate.role = role as ('user' | 'admin');
        }
        
        if ((reqUser?.role === 'admin' || reqUser?.role === 'superadmin') && isActive !== undefined) {
             // Prevent admin from deactivating the last admin/superadmin?
             // Prevent admin deactivating themselves? (Handled by frontend maybe)
            userToUpdate.isActive = isActive;
        }
        
        await userToUpdate.save();
        
        // Return updated user data (excluding password)
        const updatedUserData = userToUpdate.toObject();
        delete updatedUserData.password;

        res.status(200).json({
            message: 'User updated successfully',
            data: updatedUserData // Nest updated user under 'data'
        });
    } catch (error: any) {
         // Handle potential duplicate key errors (username/email)
        if (error.code === 11000) {
            res.status(409).json({ 
                message: 'Update failed: Username or email already exists.', 
                field: error.keyPattern // Indicate which field caused the conflict
            });
        }
        logger.error(`Update user error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get user by ID
const getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const reqUser = req.user as IUser;
        let user: IUser | null = null;

        // Permission checks
        if (reqUser?.role === 'superadmin') {
            user = await User.findById(id).select('-password');
        } else if (reqUser?.role === 'admin') {
            user = await User.findOne({ 
                _id: id, 
                organizationId: reqUser.organizationId 
            }).select('-password');
        } else {
            // Regular users can only view themselves
            // Ensure reqUser exists before checking its ID
            if (!reqUser || id !== (reqUser._id as Types.ObjectId).toString()) {
                res.status(403).json({ 
                    message: 'Access denied: You can only view your own profile' 
                });
                return;
            }
            user = await User.findById(id).select('-password');
        }
        
        if (!user) {
            res.status(404).json({ message: 'User not found or access denied' });
            return;
        }
        
        res.status(200).json({
            data: user // Nest user data under 'data'
        });
    } catch (error: any) {
        logger.error(`Get user by ID error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Search for users with filtering options (Admin/Superadmin only)
const searchUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const reqUser = req.user as IUser;
        // Only admins and superadmins can search users
        if (reqUser?.role !== 'admin' && reqUser?.role !== 'superadmin') {
            res.status(403).json({
                message: 'Access denied: Admin privileges required'
            });
            return;
        }

        const { 
            username, 
            email, 
            role, 
            isActive, 
            page = 1, 
            limit = 10,
            sortBy = 'username',
            sortOrder = 'asc'
        } = req.query;
        
        // Build query
        const query: any = {};
        
        // Organization filtering
        if (reqUser?.role === 'admin') {
            query.organizationId = reqUser.organizationId;
        } else if (reqUser?.role === 'superadmin' && req.query.organizationId) {
             if (Types.ObjectId.isValid(req.query.organizationId as string)) {
                query.organizationId = new Types.ObjectId(req.query.organizationId as string);
             } else {
                 res.status(400).json({ message: 'Invalid organizationId format in query' });
                 return;
             }
        } // If superadmin doesn't provide orgId, search across all orgs
        
        // Apply filters
        if (username) {
            query.username = { $regex: username as string, $options: 'i' };
        }
        if (email) {
            query.email = { $regex: email as string, $options: 'i' };
        }
        if (role) {
            query.role = role as string;
        }
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }
        
        // Sorting
        const sortOptions: any = {};
        const validSortBy = ['username', 'email', 'role', 'createdAt', 'isActive']; // Define valid sort fields
        if (validSortBy.includes(sortBy as string)) {
             sortOptions[sortBy as string] = sortOrder === 'asc' ? 1 : -1;
        } else {
             sortOptions.username = 1; // Default sort
        }
               
        // Pagination options
        const options = {
            page: parseInt(page as string, 10),
            limit: parseInt(limit as string, 10),
        };
        
        // Execute query
        const users = await User.find(query)
            .sort(sortOptions)
            .limit(options.limit)
            .skip((options.page - 1) * options.limit)
            .select('-password'); // Exclude password
        
        const total = await User.countDocuments(query);
        
        res.status(200).json({
            message: 'User search successful', // Added message
            data: users, // Nest results under 'data'
            totalPages: Math.ceil(total / options.limit),
            currentPage: options.page,
            totalCount: total, // Renamed for consistency
        });
    } catch (error: any) {
        logger.error(`Search users error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Create admin/superadmin user (Superadmin only)
const createAdminUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, email, password, role, organizationId, firstName, lastName } = req.body;
        const reqUser = req.user as IUser;

        // Only superadmins can create admins/superadmins directly
        if (reqUser?.role !== 'superadmin') { 
            res.status(403).json({
                message: 'Access denied: Superadmin privileges required to create admin/superadmin users'
            });
            return;
        }

        // Validate role
        if (!role || !['admin', 'superadmin'].includes(role)) {
             res.status(400).json({ message: 'Invalid role specified. Must be \'admin\' or \'superadmin\'.' });
             return;
        }

        // Validate organizationId is provided and valid
        if (!organizationId || !Types.ObjectId.isValid(organizationId)) {
             res.status(400).json({ message: 'Valid organizationId is required.' });
             return;
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }],
        });

        if (existingUser) {
            res.status(409).json({
                message: 'User with this email or username already exists',
            });
            return;
        }

        // Create new user with specified role
        const user = new User({
            username,
            email,
            password,
            firstName,
            lastName,
            role: role as ('admin' | 'superadmin'),
            organizationId: new Types.ObjectId(organizationId),
        });

        await user.save();

         // Return created user data (excluding password)
        const createdUserData = user.toObject();
        delete createdUserData.password;
        
        res.status(201).json({
            message: 'User created successfully',
            data: createdUserData // Nest data
        });
    } catch (error: any) {
        logger.error(`Create admin user error: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

// Placeholder for potential future functions like password change, etc.
const changePassword = async (req: Request, res: Response) => {
    // Implementation needed
    res.status(501).json({ message: 'Functionality not implemented yet.' });
};

const getUsersByIds = async (req: Request, res: Response) => {
     // Implementation needed
    res.status(501).json({ message: 'Functionality not implemented yet.' });
};

const updateApiKeyVisibility = async (req: Request, res: Response) => {
    // Implementation needed
    res.status(501).json({ message: 'Functionality not implemented yet.' });
}

module.exports = {
    register,
    login,
    getProfile,
    generateApiKey,
    getUsersInOrganization,
    updateUser,
    getUserById,
    searchUsers,
    createAdminUser,
    getUsersByIds, // Keep if defined, remove if not needed
    changePassword, // Keep if defined, remove if not needed
    updateApiKeyVisibility, // Keep if defined, remove if not needed
};

// Add ES Module exports
export {
    register,
    login,
    getProfile,
    generateApiKey,
    getUsersInOrganization,
    updateUser,
    getUserById,
    searchUsers,
    createAdminUser,
    getUsersByIds, // Match module.exports
    changePassword, // Match module.exports
    updateApiKeyVisibility, // Match module.exports
};
