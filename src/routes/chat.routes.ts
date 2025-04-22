import express from 'express';
import * as chatController from '../controllers/chat.controller';
import { authenticateJWT } from '../middleware/auth';
import { validate, validateQuery, validateObjectId, chatSchemas } from '../middleware/validation';
import { addOrganizationToRequest } from '../middleware/organization-auth';
import asyncHandler from '../utils/asyncHandler';

const router = express.Router();

// Create a new chat
router.post('/', authenticateJWT, validate(chatSchemas.create), asyncHandler(addOrganizationToRequest), asyncHandler(chatController.createChat));

// Get all chats for the organization (with optional search)
router.get('/', authenticateJWT, validateQuery(chatSchemas.search), asyncHandler(addOrganizationToRequest), asyncHandler(chatController.getChats));

// Get a specific chat by ID
router.get('/:id', authenticateJWT, validateObjectId('id'), asyncHandler(addOrganizationToRequest), asyncHandler(chatController.getChatById));

// Update a chat by ID
router.put('/:id', authenticateJWT, validateObjectId('id'), validate(chatSchemas.update), asyncHandler(addOrganizationToRequest), asyncHandler(chatController.updateChat));

// Delete a chat by ID
router.delete('/:id', authenticateJWT, validateObjectId('id'), asyncHandler(addOrganizationToRequest), asyncHandler(chatController.deleteChat));

export default router;
