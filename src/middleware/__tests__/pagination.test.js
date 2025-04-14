const paginateResults = require('../pagination');

describe('Pagination Middleware', () => {
    let mockModel;
    let mockReq;
    let mockRes;
    let mockNext;
    
    beforeEach(() => {
        // Mock model
        mockModel = {
            find: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            skip: jest.fn().mockResolvedValue([
                { _id: '1', name: 'Item 1' },
                { _id: '2', name: 'Item 2' }
            ]),
            countDocuments: jest.fn().mockResolvedValue(20)
        };
        
        // Mock request object
        mockReq = {
            query: {
                page: '2',
                limit: '5'
            }
        };
        
        // Mock response object
        mockRes = {};
        
        // Mock next function
        mockNext = jest.fn();
    });
    
    it('should add pagination data to request object', async () => {
        const query = { status: 'active' };
        const middleware = paginateResults(mockModel, query);
        
        await middleware(mockReq, mockRes, mockNext);
        
        // Verify model methods were called with correct parameters
        expect(mockModel.find).toHaveBeenCalledWith(query);
        expect(mockModel.sort).toHaveBeenCalledWith({ createdAt: -1 }); // default sort
        expect(mockModel.limit).toHaveBeenCalledWith(5);
        expect(mockModel.skip).toHaveBeenCalledWith(5); // (page-1) * limit = (2-1) * 5 = 5
        expect(mockModel.countDocuments).toHaveBeenCalledWith(query);
        
        // Verify pagination data was added to the request
        expect(mockReq.paginatedResults).toBeDefined();
        expect(mockReq.paginatedResults.totalPages).toBe(4); // 20 total / 5 per page = 4 pages
        expect(mockReq.paginatedResults.currentPage).toBe(2);
        expect(mockReq.paginatedResults.totalItems).toBe(20);
        
        // Verify next was called
        expect(mockNext).toHaveBeenCalled();
    });
    
    it('should use default values when page and limit are not provided', async () => {
        mockReq.query = {}; // No page or limit
        
        const middleware = paginateResults(mockModel, {});
        
        await middleware(mockReq, mockRes, mockNext);
        
        expect(mockModel.limit).toHaveBeenCalledWith(10); // Default limit
        expect(mockModel.skip).toHaveBeenCalledWith(0); // Default skip (page 1)
        expect(mockReq.paginatedResults.currentPage).toBe(1);
    });
    
    it('should use custom sort option when provided', async () => {
        const options = { sort: { name: 1 } };
        
        const middleware = paginateResults(mockModel, {}, options);
        
        await middleware(mockReq, mockRes, mockNext);
        
        expect(mockModel.sort).toHaveBeenCalledWith({ name: 1 });
    });
    
    it('should call next with error when an exception occurs', async () => {
        // Simulate an error
        mockModel.find = jest.fn().mockImplementation(() => {
            throw new Error('Database error');
        });
        
        const middleware = paginateResults(mockModel, {});
        
        await middleware(mockReq, mockRes, mockNext);
        
        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        expect(mockNext.mock.calls[0][0].message).toBe('Database error');
    });
});
