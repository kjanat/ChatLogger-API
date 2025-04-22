const orgModelTest = {
    Organization: require('../organization.model'),
};

describe('Organization Model', () => {
    // Using Jest hooks with the global setup
    beforeAll(async () => {
        // Connection is handled by global setup and setup-tests.js
        // await orgModelTest.setupTestDB(); // Removed
    });

    beforeEach(async () => {
        // Clearing is handled by setup-tests.js afterEach
        // await orgModelTest.setupTestDB.clearDatabase(); // Removed
    });

    afterAll(async () => {
        // Disconnection is handled by setup-tests.js afterAll
        // await orgModelTest.setupTestDB.closeDatabase(); // Removed
    });

    it('should create a valid organization', async () => {
        const validOrgData = {
            name: 'Test Organization 1',
            contactEmail: 'contact@testorg.com',
            description: 'A test organization',
            apiKey: 'test-api-key-12345',
        };

        const organization = new orgModelTest.Organization(validOrgData);
        await organization.save();

        const savedOrg = await orgModelTest.Organization.findById(organization._id);
        expect(savedOrg).toBeTruthy();
        expect(savedOrg.name).toBe('Test Organization 1');
        expect(savedOrg.contactEmail).toBe('contact@testorg.com');
    });

    it('should require name field', async () => {
        const orgWithoutName = new orgModelTest.Organization({
            contactEmail: 'contact@testorg.com',
            apiKey: 'test-api-key-12345',
        });

        let validationError: any;
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

        const organization = new orgModelTest.Organization(orgData);
        await organization.save();

        expect(organization.name).toBe('Test Organization 2');
    });

    it('should convert contactEmail to lowercase', async () => {
        const orgData = {
            name: 'Test Organization 3',
            contactEmail: 'CONTACT@TESTORG.COM',
            apiKey: 'test-api-key-12345',
        };

        const organization = new orgModelTest.Organization(orgData);
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

        const organization = new orgModelTest.Organization(orgData);
        await organization.save();

        expect(organization.description).toBe('A test organization');
    });

    it('should use default values when not provided', async () => {
        const orgData = {
            name: 'Test Organization 5',
            contactEmail: 'contact@testorg.com',
            apiKey: 'test-api-key-12345',
        };

        const organization = new orgModelTest.Organization(orgData);
        await organization.save();

        expect(organization.isActive).toBe(true);
        expect(organization.description).toBe('');
    });

    it('should generate an API key', async () => {
        const generatedKey = orgModelTest.Organization.generateApiKey();
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
        await new orgModelTest.Organization(orgData1).save();

        // Try to create second organization with same name
        const orgData2 = {
            name: 'Unique Org',
            contactEmail: 'different@testorg.com',
            apiKey: 'test-api-key-789012',
        };

        let duplicateError: any;
        try {
            await new orgModelTest.Organization(orgData2).save();
        } catch (error) {
            duplicateError = error;
        }

        expect(duplicateError).toBeDefined();
        expect(duplicateError.code).toBe(11000); // MongoDB duplicate key error code
    });
});
