import { Request, Response, NextFunction } from 'express';
import { Model } from 'mongoose';

// Define an interface to extend Express Request
interface RequestWithPagination extends Request {
    pagination?: {
        page: number;
        limit: number;
        skip: number;
    };
}

// Define the interface for paginated results
export interface IPaginatedResults {
    data: any[];
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
}

/**
 * Middleware to handle pagination parameters
 * Adds pagination options to req object for database queries
 * 
 * @param defaultLimit Default limit for number of results
 * @param maxLimit Maximum limit for number of results
 */
const paginationMiddleware = (defaultLimit = 10, maxLimit = 100) => {
    return (req: RequestWithPagination, res: Response, next: NextFunction): void => {
        let page = parseInt(req.query.page as string) || 1;
        let limit = parseInt(req.query.limit as string) || defaultLimit;
        
        // Ensure positive values
        page = Math.max(1, page);
        limit = Math.max(1, limit);
        
        // Cap the limit
        limit = Math.min(limit, maxLimit);
        
        const skip = (page - 1) * limit;
        
        // Add pagination info to request
        req.pagination = {
            page,
            limit,
            skip
        };
        
        next();
    };
};

const paginateResults = (model: Model<any>, query: object = {}, options: object = {}) => {
    // ... (rest of the file)
};

export default paginationMiddleware;
