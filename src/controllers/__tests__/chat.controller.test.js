const request = require('supertest');
const app = require('../../app');
const mongoose = require('mongoose');

// Mock database connection
beforeAll(async () => {
    const mongoUri = 'mongodb://localhost:27017/testdb';
    await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
});

// Close database connection
afterAll(async () => {
    await mongoose.connection.close();
});

describe('Chat Controller', () => {
    it('should return 404 for non-existent route', async () => {
        const res = await request(app).get('/api/nonexistent');
        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe('Route not found');
    });

    // Add more tests for chat endpoints here
});
