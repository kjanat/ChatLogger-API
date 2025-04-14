const Joi = require('joi');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Helper function to validate MongoDB ObjectId
const objectIdValidator = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid');
  }
  return value;
};

// Middleware to validate request body
const validate = (schema) => (req, res, next) => {
  if (!schema) return next();
  
  const { error } = schema.validate(req.body);
  if (error) {
    logger.error(`Validation error: ${error.message}`);
    return res.status(400).json({
      message: 'Validation error',
      details: error.details.map(detail => detail.message)
    });
  }
  
  next();
};

// Middleware to validate query parameters
const validateQuery = (schema) => (req, res, next) => {
  if (!schema) return next();
  
  const { error } = schema.validate(req.query);
  if (error) {
    logger.error(`Query validation error: ${error.message}`);
    return res.status(400).json({
      message: 'Query validation error',
      details: error.details.map(detail => detail.message)
    });
  }
  
  next();
};

// Middleware to validate ObjectId parameters
const validateObjectId = (paramName) => (req, res, next) => {
  const id = req.params[paramName];
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    logger.error(`Invalid ID format for parameter: ${paramName}`);
    return res.status(400).json({
      message: `Invalid ID format for ${paramName}`
    });
  }
  
  next();
};

// Common schemas
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'name', 'username', 'email', 'role').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

// User schemas
const userSchemas = {
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
const chatSchemas = {
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
  
  pagination: paginationSchema
};

// Message schemas
const messageSchemas = {
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
const organizationSchemas = {
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
  
  pagination: paginationSchema.keys({
    sortBy: Joi.string().valid('createdAt', 'name').default('name')
  })
};

module.exports = {
  validate,
  validateQuery,
  validateObjectId,
  userSchemas,
  chatSchemas,
  messageSchemas,
  organizationSchemas
};
