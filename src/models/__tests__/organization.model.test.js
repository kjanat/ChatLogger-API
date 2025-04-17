const Organization = require('../organization.model');
const setupTestDB = require('../../../tests/setupTests');

describe('Organization Model', () => {
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

    it('should create a valid organization', async () => {
        const validOrgData = {
            name: 'Test Organization 1',
            contactEmail: 'contact@testorg.com',
            description: 'A test organization',
            apiKey: 'test-api-key-12345',
        };

        const organization = new Organization(validOrgData);
        await organization.save();

        const savedOrg = await Organization.findById(organization._id);
        expect(savedOrg).toBeTruthy();
        expect(savedOrg.name).toBe('Test Organization 1');
        expect(savedOrg.contactEmail).toBe('contact@testorg.com');
    });

    it('should require name field', async () => {
        const orgWithoutName = new Organization({
            contactEmail: 'contact@testorg.com',
            apiKey: 'test-api-key-12345',
        });

        let validationError;
        try {
            await orgWithoutName.save();
        } catch (error) {
            validationError = error;
        }
        expect(validationError).toBeDefined();
        expect(validationError.errors.name).toBeDefined();
    });

    it('should trim whitespace from name', async () => {
        const orgData = {
            name: '  Test Organization 2  ',
            contactEmail: 'contact@testorg.com',
            apiKey: 'test-api-key-12345',
        };

        const organization = new Organization(orgData);
        await organization.save();

        expect(organization.name).toBe('Test Organization 2');
    });

    it('should convert contactEmail to lowercase', async () => {
        const orgData = {
            name: 'Test Organization 3',
            contactEmail: 'CONTACT@TESTORG.COM',
            apiKey: 'test-api-key-12345',
        };

        const organization = new Organization(orgData);
        await organization.save();

        expect(organization.contactEmail).toBe('contact@testorg.com');
    });

    it('should trim whitespace from description', async () => {
        const orgData = {
            name: 'Test Organization 4',
            contactEmail: 'contact@testorg.com',
            description: '  A test organization  ',
            apiKey: 'test-api-key-12345',
        };

        const organization = new Organization(orgData);
        await organization.save();

        expect(organization.description).toBe('A test organization');
    });

    it('should use default values when not provided', async () => {
        const orgData = {
            name: 'Test Organization 5',
            contactEmail: 'contact@testorg.com',
            apiKey: 'test-api-key-12345',
        };

        const organization = new Organization(orgData);
        await organization.save();

        expect(organization.isActive).toBe(true);
        expect(organization.description).toBe('');
    });

    it('should generate an API key', async () => {
        const generatedKey = Organization.generateApiKey();
        expect(generatedKey).toBeTruthy();
        expect(typeof generatedKey).toBe('string');
        expect(generatedKey.length).toBeGreaterThan(16);
    });

    it('should enforce unique organization names', async () => {
        // Create first organization
        const orgData1 = {
            name: 'Unique Org',
            contactEmail: 'contact@testorg.com',
            apiKey: 'test-api-key-123456',
        };
        await new Organization(orgData1).save();

        // Try to create second organization with same name
        const orgData2 = {
            name: 'Unique Org',
            contactEmail: 'different@testorg.com',
            apiKey: 'test-api-key-789012',
        };

        let duplicateError;
        try {
            await new Organization(orgData2).save();
        } catch (error) {
            duplicateError = error;
        }

        expect(duplicateError).toBeDefined();
        expect(duplicateError.code).toBe(11000); // MongoDB duplicate key error code
    });
});
