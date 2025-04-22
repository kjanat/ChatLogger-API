import { Request, Response, NextFunction } from 'express';
const { validate, validateQuery, validateObjectId } = require('../validation');
const mongoose = require('mongoose');
const Joi = require('joi');
const logger = require('../../utils/logger');

// Setup logger mock functions
logger.error = jest.fn();
logger.info = jest.fn();
logger.warn = jest.fn();
logger.debug = jest.fn();

describe('Validation Middleware', () => {
    let mockReq: Partial<Request>; // Use Partial<Request> for simplified mocking
    let mockRes: Partial<Response>; // Use Partial<Response>
    let mockNext: NextFunction;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Mock request object
        mockReq = {
            body: {},
            query: {},
            params: {}
        };

        // Mock response object
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        // Mock next function
        mockNext = jest.fn();
    });

    describe('validate', () => {
        it('should call next() when schema validation passes', () => {
            // Create test schema
            const schema = Joi.object({
                name: Joi.string().required(),
                email: Joi.string().email().required()
            });

            // Set valid request body
            mockReq.body = {
                name: 'Test User',
                email: 'test@example.com'
            };

            const middleware = validate(schema);
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockRes.status).not.toHaveBeenCalled();
        });

        it('should return 400 when schema validation fails', () => {
            // Create test schema
            const schema = Joi.object({
                name: Joi.string().required(),
                email: Joi.string().email().required()
            });

            // Set invalid request body (missing email)
            mockReq.body = {
                name: 'Test User'
            };

            const middleware = validate(schema);
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Validation error',
                    details: expect.any(Array)
                })
            );
            expect(logger.error).toHaveBeenCalled();
        });

        it('should call next() when schema is not provided', () => {
            const middleware = validate(null);
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockRes.status).not.toHaveBeenCalled();
        });
    });

    describe('validateQuery', () => {
        it('should call next() when query validation passes', () => {
            // Create test schema
            const schema = Joi.object({
                page: Joi.number().integer().min(1),
                limit: Joi.number().integer().min(1).max(100)
            });

            // Set valid query parameters
            mockReq.query = {
                page: '1',
                limit: '10'
            };

            const middleware = validateQuery(schema);
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockRes.status).not.toHaveBeenCalled();
        });

        it('should return 400 when query validation fails', () => {
            // Create test schema
            const schema = Joi.object({
                page: Joi.number().integer().min(1),
                limit: Joi.number().integer().min(1).max(100)
            });

            // Set invalid query parameters (negative page)
            mockReq.query = {
                page: '-1',
                limit: '10'
            };

            const middleware = validateQuery(schema);
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Query validation error',
                    details: expect.any(Array)
                })
            );
            expect(logger.error).toHaveBeenCalled();
        });

        it('should call next() when schema is not provided', () => {
            const middleware = validateQuery(null);
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockRes.status).not.toHaveBeenCalled();
        });
    });

    describe('validateObjectId', () => {
        it('should call next() when ID is valid', () => {
            // Create a valid MongoDB ObjectID
            const validId = new mongoose.Types.ObjectId().toString();

            // Set valid parameter
            mockReq.params = {
                userId: validId
            };

            const middleware = validateObjectId('userId');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockRes.status).not.toHaveBeenCalled();
        });

        it('should return 400 when ID is missing', () => {
            // No ID provided
            mockReq.params = {};

            const middleware = validateObjectId('userId');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Invalid ID format for userId'
                })
            );
            expect(logger.error).toHaveBeenCalled();
        });

        it('should return 400 when ID is not a valid ObjectId', () => {
            // Invalid ObjectId
            mockReq.params = {
                userId: 'not-a-valid-object-id'
            };

            const middleware = validateObjectId('userId');
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Invalid ID format for userId'
                })
            );
            expect(logger.error).toHaveBeenCalled();
        });
    });
});
