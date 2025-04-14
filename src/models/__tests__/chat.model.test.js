const mongoose = require('mongoose');
const Chat = require('../chat.model');
const setupTestDB = require('../../../tests/setupTests');

describe('Chat Model', () => {
    // Connect to the in-memory database before tests
    beforeAll(async () => {
        await setupTestDB();
    });

    // Clear database between tests
    beforeEach(async () => {
        await setupTestDB.clearDatabase();
    });

    // Disconnect and close the db after tests
    afterAll(async () => {
        await setupTestDB.closeDatabase();
    });

    it('should create a valid chat', async () => {
        const userId = new mongoose.Types.ObjectId();
        const orgId = new mongoose.Types.ObjectId();
        
        const chatData = {
            userId: userId,
            organizationId: orgId,
            title: 'Test Chat',
            source: 'web'
        };
        
        const chat = new Chat(chatData);
        await chat.save();
        
        const savedChat = await Chat.findById(chat._id);
        expect(savedChat).toBeTruthy();
        expect(savedChat.title).toBe('Test Chat');
        expect(savedChat.userId.toString()).toBe(userId.toString());
        expect(savedChat.organizationId.toString()).toBe(orgId.toString());
    });

    it('should require userId', async () => {
        const chatData = {
            organizationId: new mongoose.Types.ObjectId(),
            title: 'Test Chat'
        };
        
        const chat = new Chat(chatData);
        
        let validationError;
        try {
            await chat.save();
        } catch (error) {
            validationError = error;
        }
        
        expect(validationError).toBeDefined();
        expect(validationError.errors.userId).toBeDefined();
    });

    it('should require organizationId', async () => {
        const chatData = {
            userId: new mongoose.Types.ObjectId(),
            title: 'Test Chat'
        };
        
        const chat = new Chat(chatData);
        
        let validationError;
        try {
            await chat.save();
        } catch (error) {
            validationError = error;
        }
        
        expect(validationError).toBeDefined();
        expect(validationError.errors.organizationId).toBeDefined();
    });

    it('should require title', async () => {
        const chatData = {
            userId: new mongoose.Types.ObjectId(),
            organizationId: new mongoose.Types.ObjectId()
        };
        
        const chat = new Chat(chatData);
        
        let validationError;
        try {
            await chat.save();
        } catch (error) {
            validationError = error;
        }
        
        expect(validationError).toBeDefined();
        expect(validationError.errors.title).toBeDefined();
    });

    it('should validate source against allowed values', async () => {
        const validSources = ['web', 'api', 'mobile', 'widget'];
        const invalidSource = 'invalid-source';
        
        // Test all valid sources
        for (const source of validSources) {
            const chatData = {
                userId: new mongoose.Types.ObjectId(),
                organizationId: new mongoose.Types.ObjectId(),
                title: `${source} Chat`,
                source: source
            };
            
            const chat = new Chat(chatData);
            await chat.save();
            expect(chat.source).toBe(source);
        }
        
        // Test invalid source
        const invalidChatData = {
            userId: new mongoose.Types.ObjectId(),
            organizationId: new mongoose.Types.ObjectId(),
            title: 'Invalid Chat',
            source: invalidSource
        };
        
        const invalidChat = new Chat(invalidChatData);
        let validationError;
        
        try {
            await invalidChat.save();
        } catch (error) {
            validationError = error;
        }
        
        expect(validationError).toBeDefined();
        expect(validationError.errors.source).toBeDefined();
    });

    it('should use default values when not provided', async () => {
        const chatData = {
            userId: new mongoose.Types.ObjectId(),
            organizationId: new mongoose.Types.ObjectId(),
            title: 'Default Chat'
        };
        
        const chat = new Chat(chatData);
        await chat.save();
        
        expect(chat.source).toBe('web'); // default source
        expect(chat.isActive).toBe(true); // default isActive
        expect(chat.tags).toEqual([]); // default tags
        expect(chat.metadata).toEqual({}); // default metadata
    });

    it('should trim the title field', async () => {
        const chatData = {
            userId: new mongoose.Types.ObjectId(),
            organizationId: new mongoose.Types.ObjectId(),
            title: '  Trimmed Title  '
        };
        
        const chat = new Chat(chatData);
        await chat.save();
        
        expect(chat.title).toBe('Trimmed Title');
    });

    it('should support metadata storage', async () => {
        const chatData = {
            userId: new mongoose.Types.ObjectId(),
            organizationId: new mongoose.Types.ObjectId(),
            title: 'Metadata Chat',
            metadata: {
                browser: 'Chrome',
                platform: { os: 'Windows' }
            }
        };
        
        const chat = new Chat(chatData);
        await chat.save();
        
        const savedChat = await Chat.findById(chat._id);
        
        expect(savedChat).toBeTruthy();
        expect(savedChat.metadata).toEqual({
            browser: 'Chrome',
            platform: { os: 'Windows' }
        });
        expect(savedChat.metadata.browser).toBe('Chrome');
        expect(savedChat.metadata.platform.os).toBe('Windows');
    });
});
