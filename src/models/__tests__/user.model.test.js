const mongoose = require('mongoose');
const User = require('../user.model');
const setupTestDB = require('../../../tests/setupTests');

describe('User Model', () => {
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

    it('should create a valid user', async () => {
        const validUser = {
            username: 'testuser1',
            email: 'test1@example.com',
            password: 'Password123!',
            firstName: 'Test',
            lastName: 'User',
            role: 'user',
            organizationId: new mongoose.Types.ObjectId()
        };
        
        const user = new User(validUser);
        await user.save();
        
        const savedUser = await User.findById(user._id);
        expect(savedUser).toBeTruthy();
        expect(savedUser.username).toBe('testuser1');
    });

    it('should trim whitespace from username', async () => {
        const userData = {
            username: '  testuser2  ',
            email: 'test2@example.com',
            password: 'Password123!',
            firstName: 'Test',
            lastName: 'User',
            role: 'user',
            organizationId: new mongoose.Types.ObjectId()
        };
        
        const user = new User(userData);
        await user.save();
        
        expect(user.username).toBe('testuser2');
    });

    it('should convert email to lowercase and trim it', async () => {
        const userData = {
            username: 'testuser3',
            email: '  TEST3@EXAMPLE.COM  ',
            password: 'Password123!',
            firstName: 'Test',
            lastName: 'User',
            role: 'user',
            organizationId: new mongoose.Types.ObjectId()
        };
        
        const user = new User(userData);
        await user.save();
        
        expect(user.email).toBe('test3@example.com');
    });

    it('should accept all valid role types', async () => {
        const roles = ['user', 'admin', 'superadmin'];
        
        for (let i = 0; i < roles.length; i++) {
            const userData = {
                username: `roleuser${i}`,
                email: `role${i}@example.com`,
                password: 'Password123!',
                firstName: 'Role',
                lastName: 'User',
                role: roles[i],
                organizationId: new mongoose.Types.ObjectId()
            };
            
            const user = new User(userData);
            await user.save();
            
            expect(user.role).toBe(roles[i]);
        }
    });

    it('should correctly compare passwords', async () => {
        const correctPassword = 'Password123!';
        const wrongPassword = 'WrongPassword123!';
        
        const userData = {
            username: 'passworduser',
            email: 'password@example.com',
            password: correctPassword,
            firstName: 'Password',
            lastName: 'User',
            role: 'user',
            organizationId: new mongoose.Types.ObjectId()
        };
        
        const user = new User(userData);
        await user.save();
        
        const correctMatch = await user.comparePassword(correctPassword);
        expect(correctMatch).toBe(true);
        
        const wrongMatch = await user.comparePassword(wrongPassword);
        expect(wrongMatch).toBe(false);
    });

    it('should generate an API key', async () => {
        const userData = {
            username: 'apiuser',
            email: 'api@example.com',
            password: 'Password123!',
            firstName: 'Api',
            lastName: 'User',
            role: 'user',
            organizationId: new mongoose.Types.ObjectId()
        };
        
        const user = new User(userData);
        const apiKey = user.generateApiKey();
        
        expect(apiKey).toBeTruthy();
        expect(typeof apiKey).toBe('string');
        expect(apiKey.length).toBeGreaterThan(16);
    });

    it('should require username and email', async () => {
        const userData = {
            password: 'Password123!',
            firstName: 'Test',
            lastName: 'User',
            role: 'user',
            organizationId: new mongoose.Types.ObjectId()
        };
        
        const user = new User(userData);
        
        let validationError;
        try {
            await user.save();
        } catch (error) {
            validationError = error;
        }
        
        expect(validationError).toBeDefined();
        expect(validationError.errors.username).toBeDefined();
        expect(validationError.errors.email).toBeDefined();
    });

    it('should enforce unique username and email', async () => {
        // Create first user
        const userData1 = {
            username: 'uniqueuser',
            email: 'unique@example.com',
            password: 'Password123!',
            firstName: 'Unique',
            lastName: 'User',
            role: 'user',
            organizationId: new mongoose.Types.ObjectId()
        };
        
        await new User(userData1).save();
        
        // Try username duplicate
        let duplicateUsernameError;
        try {
            await new User({
                ...userData1,
                email: 'different@example.com'
            }).save();
        } catch (error) {
            duplicateUsernameError = error;
        }
        
        expect(duplicateUsernameError).toBeDefined();
        expect(duplicateUsernameError.code).toBe(11000);
        
        // Try email duplicate
        let duplicateEmailError;
        try {
            await new User({
                ...userData1,
                username: 'differentuser'
            }).save();
        } catch (error) {
            duplicateEmailError = error;
        }
        
        expect(duplicateEmailError).toBeDefined();
        expect(duplicateEmailError.code).toBe(11000);
    });
});
