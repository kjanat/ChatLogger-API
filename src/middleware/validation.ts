import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';
import logger from '../utils/logger';

// Helper function to validate MongoDB ObjectId
const objectIdValidator = (value: string, helpers: Joi.CustomHelpers<string>): string | Joi.ErrorReport => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid');
  }
  return value;
};

// Generic middleware for validating request body
export const validate = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const { error } = schema.validate(req.body);
        
        if (error) {
            logger.debug(`Validation error: ${error.details[0].message}`);
            res.status(400).json({
                message: 'Validation error',
                details: error.details[0].message
            });
            return;
        }
        
        next();
    };
};

// Middleware for validating query parameters
export const validateQuery = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const { error } = schema.validate(req.query);
        
        if (error) {
            logger.debug(`Query validation error: ${error.details[0].message}`);
            res.status(400).json({ 
                message: 'Invalid query parameters',
                details: error.details[0].message
            });
            return;
        }
        
        next();
    };
};

// Middleware for validating MongoDB ObjectId
export const validateObjectId = (paramName: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const id = req.params[paramName] || 
                 req.body[paramName] || 
                 req.query[paramName];
                 
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ 
                message: `Invalid ID format for ${paramName}` 
            });
            return;
        }
        
        next();
    };
};

// Common schemas
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'name', 'username', 'email', 'role').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

// User schemas
export const userSchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(50).optional(),
    username: Joi.string().min(2).max(50).optional(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('user', 'admin', 'superadmin').default('user'),
    organizationId: Joi.string().custom(objectIdValidator).optional(),
    isActive: Joi.boolean().optional().default(true),
    metadata: Joi.object().optional()
  }),
  
  update: Joi.object({
    name: Joi.string().min(2).max(50).optional(),
    username: Joi.string().min(2).max(50).optional(),
    email: Joi.string().email().optional(),
    password: Joi.string().min(6).optional(),
    role: Joi.string().valid('user', 'admin', 'superadmin').optional(),
    isActive: Joi.boolean().optional(),
    metadata: Joi.object().optional()
  }),
  
  register: Joi.object({
    username: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    organizationId: Joi.string().custom(objectIdValidator).required()
  }),
  
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  search: Joi.object({
    username: Joi.string().optional(),
    email: Joi.string().optional(),
    role: Joi.string().valid('user', 'admin', 'superadmin').optional(),
    isActive: Joi.string().valid('true', 'false').optional(),
    organizationId: Joi.string().custom(objectIdValidator).optional(),
    sortBy: Joi.string().valid('username', 'email', 'role', 'createdAt', 'updatedAt').default('username'),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),

  pagination: paginationSchema
};

// Chat schemas
export const chatSchemas = {
  create: Joi.object({
    title: Joi.string().min(1).max(100).required(),
    source: Joi.string().valid('web', 'mobile', 'api', 'widget').default('web'),
    tags: Joi.array().items(Joi.string()).optional(),
    model: Joi.string().optional(),
    systemPrompt: Joi.string().optional(),
    metadata: Joi.object().optional()
  }),
  
  update: Joi.object({
    title: Joi.string().min(1).max(100).optional(),
    model: Joi.string().optional(),
    systemPrompt: Joi.string().optional(),
    metadata: Joi.object().optional()
  }),
  
  search: Joi.object({
    title: Joi.string().optional(),
    source: Joi.string().valid('web', 'mobile', 'api', 'widget').optional(),
    tags: Joi.string().optional(),
    model: Joi.string().optional(),
    userId: Joi.string().custom(objectIdValidator).optional(),
    organizationId: Joi.string().custom(objectIdValidator).optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    sortBy: Joi.string().valid('title', 'createdAt', 'updatedAt').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),
  
  pagination: paginationSchema
};

// Message schemas
export const messageSchemas = {
  create: Joi.object({
    role: Joi.string().valid('system', 'user', 'assistant', 'function', 'tool').required(),
    content: Joi.string().required(),
    name: Joi.string().optional(),
    functionCall: Joi.object().optional(),
    toolCalls: Joi.array().items(Joi.object()).optional(),
    metadata: Joi.object().optional(),
    tokens: Joi.number().integer().min(0).optional(),
    promptTokens: Joi.number().integer().min(0).optional(),
    completionTokens: Joi.number().integer().min(0).optional(),
    latency: Joi.number().integer().min(0).optional()
  }),
  
  batchCreate: Joi.object({
    messages: Joi.array().items(
      Joi.object({
        role: Joi.string().valid('system', 'user', 'assistant', 'function', 'tool').required(),
        content: Joi.string().required(),
        name: Joi.string().optional(),
        functionCall: Joi.object().optional(),
        toolCalls: Joi.array().items(Joi.object()).optional(),
        metadata: Joi.object().optional(),
        tokens: Joi.number().integer().min(0).optional(),
        promptTokens: Joi.number().integer().min(0).optional(),
        completionTokens: Joi.number().integer().min(0).optional(),
        latency: Joi.number().integer().min(0).optional()
      })
    ).min(1).required()
  }),
  
  update: Joi.object({
    content: Joi.string().optional(),
    metadata: Joi.object().optional(),
    tokens: Joi.number().integer().min(0).optional(),
    promptTokens: Joi.number().integer().min(0).optional(),
    completionTokens: Joi.number().integer().min(0).optional(),
    latency: Joi.number().integer().min(0).optional()
  }),
  
  pagination: paginationSchema.keys({
    sortBy: Joi.string().valid('createdAt', 'role').default('createdAt')
  })
};

// Organization schemas
export const organizationSchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    apiKey: Joi.string().optional(),
    settings: Joi.object().optional(),
    metadata: Joi.object().optional()
  }),
  
  update: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    apiKey: Joi.string().optional(),
    settings: Joi.object().optional(),
    metadata: Joi.object().optional()
  }),
  
  search: Joi.object({
    name: Joi.string().optional(),
    isActive: Joi.string().valid('true', 'false').optional(),
    sortBy: Joi.string().valid('name', 'createdAt', 'updatedAt').default('name'),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),
  
  pagination: paginationSchema.keys({
    sortBy: Joi.string().valid('createdAt', 'name').default('name')
  })
};

export const analyticsSchemas = {
    activity: Joi.object({
        startDate: Joi.date().iso(),
        endDate: Joi.date().iso().min(Joi.ref('startDate')),
        groupBy: Joi.string().valid('day', 'week', 'month').default('day')
    }),
    
    messageStats: Joi.object({
        startDate: Joi.date().iso(),
        endDate: Joi.date().iso().min(Joi.ref('startDate')),
        includeContent: Joi.boolean().default(false)
    }),
    
    topUsers: Joi.object({
        startDate: Joi.date().iso(),
        endDate: Joi.date().iso().min(Joi.ref('startDate')),
        limit: Joi.number().integer().min(1).max(50).default(10),
        metric: Joi.string().valid('chats', 'messages').default('chats')
    })
};

export const exportSchemas = {
    chatExport: Joi.object({
        startDate: Joi.date().iso(),
        endDate: Joi.date().iso().min(Joi.ref('startDate')),
        userId: Joi.string(),
        format: Joi.string().valid('json', 'csv').default('json'),
        includeMessages: Joi.boolean().default(true)
    }),
    
    userActivity: Joi.object({
        startDate: Joi.date().iso(),
        endDate: Joi.date().iso().min(Joi.ref('startDate')),
        format: Joi.string().valid('json', 'csv').default('json'),
        metrics: Joi.array().items(
            Joi.string().valid('chats', 'messages', 'tokens')
        ).default(['chats', 'messages'])
    })
};
