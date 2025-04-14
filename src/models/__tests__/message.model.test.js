const mongoose = require('mongoose');
const Message = require('../message.model');

describe('Message Model', () => {
    // Tests will now use the mongodb-memory-server that is set up in setupTests.js

    it('should create a valid message', async () => {
        const validMessageData = {
            chatId: new mongoose.Types.ObjectId(),
            role: 'user',
            content: 'Test message content',
            metadata: { client: 'web', browser: 'chrome' },
            tokens: 10,
            promptTokens: 5,
            completionTokens: 5
        };

        const message = new Message(validMessageData);
        await message.save();
        
        const savedMessage = await Message.findById(message._id);
        expect(savedMessage).toBeTruthy();
        expect(savedMessage.role).toBe('user');
        expect(savedMessage.content).toBe('Test message content');
        expect(savedMessage.tokens).toBe(10);
    });

    it('should require chatId', async () => {
        const messageWithoutChatId = new Message({
            role: 'user',
            content: 'Test message'
        });

        let validationError;
        try {
            await messageWithoutChatId.save();
        } catch (error) {
            validationError = error;
        }
        expect(validationError).toBeDefined();
        expect(validationError.errors.chatId).toBeDefined();
    });

    it('should require role', async () => {
        const messageWithoutRole = new Message({
            chatId: new mongoose.Types.ObjectId(),
            content: 'Test message'
        });

        let validationError;
        try {
            await messageWithoutRole.save();
        } catch (error) {
            validationError = error;
        }
        expect(validationError).toBeDefined();
        expect(validationError.errors.role).toBeDefined();
    });

    it('should require content', async () => {
        const messageWithoutContent = new Message({
            chatId: new mongoose.Types.ObjectId(),
            role: 'user'
        });

        let validationError;
        try {
            await messageWithoutContent.save();
        } catch (error) {
            validationError = error;
        }
        expect(validationError).toBeDefined();
        expect(validationError.errors.content).toBeDefined();
    });

    it('should validate role against allowed values', async () => {
        const messageWithInvalidRole = new Message({
            chatId: new mongoose.Types.ObjectId(),
            role: 'invalid_role',
            content: 'Test message'
        });

        let validationError;
        try {
            await messageWithInvalidRole.save();
        } catch (error) {
            validationError = error;
        }
        expect(validationError).toBeDefined();
        expect(validationError.errors.role).toBeDefined();
    });

    it('should accept all valid role types', async () => {
        const validRoles = ['system', 'user', 'assistant', 'function', 'tool'];
        
        for (const role of validRoles) {
            const message = new Message({
                chatId: new mongoose.Types.ObjectId(),
                role: role,
                content: 'Test message'
            });
            
            await message.save();
            const savedMessage = await Message.findById(message._id);
            expect(savedMessage).toBeTruthy();
            expect(savedMessage.role).toBe(role);
        }
    });

    it('should use default values when not provided', async () => {
        const messageWithDefaults = new Message({
            chatId: new mongoose.Types.ObjectId(),
            role: 'user',
            content: 'Test message'
        });

        await messageWithDefaults.save();
        const savedMessage = await Message.findById(messageWithDefaults._id);

        expect(savedMessage.tokens).toBe(0);
        expect(savedMessage.promptTokens).toBe(0);
        expect(savedMessage.completionTokens).toBe(0);
        expect(savedMessage.latency).toBe(0);
        expect(savedMessage.name).toBeNull();
        expect(savedMessage.functionCall).toBeNull();
        expect(savedMessage.toolCalls).toBeNull();
        expect(savedMessage.metadata).toBeDefined();
    });

    it('should support function call data', async () => {
        const functionCallData = {
            name: 'get_weather',
            arguments: JSON.stringify({
                location: 'New York',
                unit: 'celsius'
            })
        };

        const messageWithFunctionCall = new Message({
            chatId: new mongoose.Types.ObjectId(),
            role: 'assistant',
            content: 'Function call content', // Using non-empty content
            functionCall: functionCallData
        });

        await messageWithFunctionCall.save();
        const savedMessage = await Message.findById(messageWithFunctionCall._id);

        expect(savedMessage).toBeTruthy();
        expect(savedMessage.functionCall).toEqual(functionCallData);
    });

    it('should support tool calls data', async () => {
        const toolCallsData = [
            {
                id: 'tool_1',
                type: 'function',
                function: {
                    name: 'get_weather',
                    arguments: JSON.stringify({
                        location: 'New York',
                        unit: 'celsius'
                    })
                }
            },
            {
                id: 'tool_2',
                type: 'function',
                function: {
                    name: 'get_time',
                    arguments: JSON.stringify({
                        timezone: 'UTC'
                    })
                }
            }
        ];

        const messageWithToolCalls = new Message({
            chatId: new mongoose.Types.ObjectId(),
            role: 'assistant',
            content: 'Tool calls content', // Using non-empty content
            toolCalls: toolCallsData
        });

        await messageWithToolCalls.save();
        const savedMessage = await Message.findById(messageWithToolCalls._id);

        expect(savedMessage).toBeTruthy();
        expect(savedMessage.toolCalls).toEqual(toolCallsData);
    });
});
