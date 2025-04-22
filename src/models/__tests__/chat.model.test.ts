const chatModelTest = {
    mongoose: require('mongoose'),
    Chat: require('../chat.model'),
};

describe('Chat Model', () => {
    // Connect to the in-memory database before tests
    beforeAll(async () => {
        // await chatModelTest.setupTestDB(); // Removed
    });

    // Clear database between tests
    beforeEach(async () => {
        // await chatModelTest.setupTestDB.clearDatabase(); // Removed
    });

    // Disconnect and close the db after tests
    afterAll(async () => {
        // await chatModelTest.setupTestDB.closeDatabase(); // Removed
    });

    it('should create a valid chat', async () => {
        const userId = new chatModelTest.mongoose.Types.ObjectId();
        const orgId = new chatModelTest.mongoose.Types.ObjectId();
        
        const chatData = {
            userId: userId,
            organizationId: orgId,
            title: 'Test Chat',
            source: 'web'
        };
        
        const chat = new chatModelTest.Chat(chatData);
        await chat.save();
        
        const savedChat = await chatModelTest.Chat.findById(chat._id);
        expect(savedChat).toBeTruthy();
        expect(savedChat.title).toBe('Test Chat');
        expect(savedChat.userId.toString()).toBe(userId.toString());
        expect(savedChat.organizationId.toString()).toBe(orgId.toString());
    });

    it('should require userId', async () => {
        const chatData = {
            organizationId: new chatModelTest.mongoose.Types.ObjectId(),
            title: 'Test Chat'
        };
        
        const chat = new chatModelTest.Chat(chatData);
        
        let validationError: any;
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
            userId: new chatModelTest.mongoose.Types.ObjectId(),
            title: 'Test Chat'
        };
        
        const chat = new chatModelTest.Chat(chatData);
        
        let validationError: any;
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
            userId: new chatModelTest.mongoose.Types.ObjectId(),
            organizationId: new chatModelTest.mongoose.Types.ObjectId()
        };
        
        const chat = new chatModelTest.Chat(chatData);
        
        let validationError: any;
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
                userId: new chatModelTest.mongoose.Types.ObjectId(),
                organizationId: new chatModelTest.mongoose.Types.ObjectId(),
                title: `${source} Chat`,
                source: source
            };
            
            const chat = new chatModelTest.Chat(chatData);
            await chat.save();
            expect(chat.source).toBe(source);
        }
        
        // Test invalid source
        const invalidChatData = {
            userId: new chatModelTest.mongoose.Types.ObjectId(),
            organizationId: new chatModelTest.mongoose.Types.ObjectId(),
            title: 'Invalid Chat',
            source: invalidSource
        };
        
        const invalidChat = new chatModelTest.Chat(invalidChatData);
        let validationError: any;
        
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
            userId: new chatModelTest.mongoose.Types.ObjectId(),
            organizationId: new chatModelTest.mongoose.Types.ObjectId(),
            title: 'Default Chat'
        };
        
        const chat = new chatModelTest.Chat(chatData);
        await chat.save();
        
        expect(chat.source).toBe('web'); // default source
        expect(chat.isActive).toBe(true); // default isActive
        expect(chat.tags).toEqual([]); // default tags
        expect(chat.metadata).toEqual({}); // default metadata
    });

    it('should trim the title field', async () => {
        const chatData = {
            userId: new chatModelTest.mongoose.Types.ObjectId(),
            organizationId: new chatModelTest.mongoose.Types.ObjectId(),
            title: '  Trimmed Title  '
        };
        
        const chat = new chatModelTest.Chat(chatData);
        await chat.save();
        
        expect(chat.title).toBe('Trimmed Title');
    });

    it('should support metadata storage', async () => {
        const chatData = {
            userId: new chatModelTest.mongoose.Types.ObjectId(),
            organizationId: new chatModelTest.mongoose.Types.ObjectId(),
            title: 'Metadata Chat',
            metadata: {
                browser: 'Chrome',
                platform: { os: 'Windows' }
            }
        };
        
        const chat = new chatModelTest.Chat(chatData);
        await chat.save();
        
        const savedChat = await chatModelTest.Chat.findById(chat._id);
        
        expect(savedChat).toBeTruthy();
        expect(savedChat.metadata).toEqual({
            browser: 'Chrome',
            platform: { os: 'Windows' }
        });
        expect(savedChat.metadata.browser).toBe('Chrome');
        expect(savedChat.metadata.platform.os).toBe('Windows');
    });
});
