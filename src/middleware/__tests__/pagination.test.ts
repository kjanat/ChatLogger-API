import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose'; // Import Types
import { IUser } from '../../models/user.model'; // Import IUser
const paginateResults = require('../pagination');

// Mock Model with necessary static methods
const mockModel = {
    countDocuments: jest.fn(),
    find: jest.fn().mockReturnThis(), // Make find chainable
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    sort: jest.fn().mockResolvedValue([]) // Default to resolving with empty array
};

// Helper to create a basic mock ObjectId
const mockObjectId = (id: string): Types.ObjectId => new Types.ObjectId(id);

// Helper to create a basic mock User (more complete)
const mockUser = (id: string): IUser => ({
    _id: mockObjectId(id),
    username: `testuser_${id}`,
    email: `user${id}@test.com`,
    password: 'hashedPassword',
    role: 'user', // Default role
    isActive: true,
    organizationId: mockObjectId('defaultOrg'), // Add a default org ID
    apiKey: `key-${id}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    comparePassword: jest.fn().mockResolvedValue(true),
    generateApiKey: jest.fn().mockReturnValue(`new-key-${id}`),
}) as any; // Use 'as any' for simplicity

describe('Pagination Middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Reset mockModel functions if necessary (or re-assign mocks inside tests)
        mockModel.countDocuments.mockReset();
        mockModel.find.mockClear(); // Clear calls but keep mockReturnThis
        mockModel.limit.mockClear();
        mockModel.skip.mockClear();
        mockModel.sort.mockClear().mockResolvedValue([]); // Reset resolution

        // Mock request object
        mockReq = {
            query: {},
            user: mockUser('user123') // Use updated helper (no need for 'as IUser' if helper returns IUser)
        };

        // Mock response object (only needs status and json)
        mockRes = {
             status: jest.fn().mockReturnThis(),
             json: jest.fn()
        };

        // Mock next function
        mockNext = jest.fn();
    });

    it('should correctly calculate pagination metadata and attach results', async () => {
        // Setup query parameters
        mockReq.query = { page: '2', limit: '5' };
        const query = { userId: mockReq.user?._id }; // Use the mocked user ID
        const sort = { createdAt: -1 };
        const mockData = [{ item: 1 }, { item: 2 }, { item: 3 }, { item: 4 }, { item: 5 }];

        // Mock Model responses
        mockModel.countDocuments.mockResolvedValue(12); // Total 12 documents
        mockModel.find.mockReturnThis();
        mockModel.sort.mockResolvedValue(mockData);

        // Create and run middleware
        const middleware = paginateResults(mockModel as any, query, { sort });
        await middleware(mockReq as Request, mockRes as Response, mockNext);

        // Assertions
        expect(mockModel.countDocuments).toHaveBeenCalledWith(query);
        expect(mockModel.find).toHaveBeenCalledWith(query);
        expect(mockModel.sort).toHaveBeenCalledWith(sort);
        expect(mockModel.limit).toHaveBeenCalledWith(5);
        expect(mockModel.skip).toHaveBeenCalledWith(5); // (page 2 - 1) * limit 5
        
        expect(mockReq.paginatedResults).toBeDefined();
        expect(mockReq.paginatedResults?.data).toEqual(mockData);
        expect(mockReq.paginatedResults?.page).toBe(2);
        expect(mockReq.paginatedResults?.limit).toBe(5);
        expect(mockReq.paginatedResults?.totalPages).toBe(3); // ceil(12 / 5)
        expect(mockReq.paginatedResults?.totalCount).toBe(12);
        expect(mockNext).toHaveBeenCalledTimes(1); // Ensure next() is called
    });

    it('should use default page and limit values', async () => {
        mockReq.query = {}; // No page or limit specified
        const query = {};
        
        mockModel.countDocuments.mockResolvedValue(3);
        mockModel.sort.mockResolvedValue([{ item: 'a' }, { item: 'b' }, { item: 'c' }]);

        const middleware = paginateResults(mockModel as any, query);
        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockModel.limit).toHaveBeenCalledWith(10); // Default limit
        expect(mockModel.skip).toHaveBeenCalledWith(0); // Default page 1 -> skip 0
        expect(mockReq.paginatedResults?.page).toBe(1);
        expect(mockReq.paginatedResults?.limit).toBe(10);
        expect(mockReq.paginatedResults?.totalPages).toBe(1); // ceil(3 / 10)
        expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should handle page or limit values less than 1', async () => {
        mockReq.query = { page: '0', limit: '-5' }; // Invalid values
        const query = {};
        
        mockModel.countDocuments.mockResolvedValue(1);
        mockModel.sort.mockResolvedValue([{ item: 'x' }]);
        
        const middleware = paginateResults(mockModel as any, query);
        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockModel.limit).toHaveBeenCalledWith(10); // Should default
        expect(mockModel.skip).toHaveBeenCalledWith(0); // Should default
        expect(mockReq.paginatedResults?.page).toBe(1);
        expect(mockReq.paginatedResults?.limit).toBe(10);
        expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should handle zero total documents', async () => {
        mockReq.query = { page: '1', limit: '10' };
        const query = {};

        mockModel.countDocuments.mockResolvedValue(0);
        mockModel.sort.mockResolvedValue([]); // No data found

        const middleware = paginateResults(mockModel as any, query);
        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockReq.paginatedResults?.data).toEqual([]);
        expect(mockReq.paginatedResults?.totalPages).toBe(0);
        expect(mockReq.paginatedResults?.totalCount).toBe(0);
        expect(mockNext).toHaveBeenCalledTimes(1);
    });

     it('should call next with error if countDocuments fails', async () => {
        const dbError = new Error('Count failed');
        mockModel.countDocuments.mockRejectedValue(dbError);

        const middleware = paginateResults(mockModel as any, {});
        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(dbError);
    });

     it('should call next with error if find query fails', async () => {
        const dbError = new Error('Find failed');
        mockModel.countDocuments.mockResolvedValue(10);
        // Need to mock the chained calls correctly to throw error
        mockModel.find.mockReturnThis();
        mockModel.sort.mockRejectedValue(dbError); // Throw error at the end of chain

        const middleware = paginateResults(mockModel as any, {});
        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(dbError);
    });
});
