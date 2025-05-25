// Set test environment
process.env.NODE_ENV = 'test';

// Set test database URI
process.env.MONGODB_URI_TEST = 'mongodb://localhost:27017/buddybox-test';

// Set JWT secret for testing
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';

// Set token expiration times for testing
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

// Increase timeout for tests
jest.setTimeout(30000); 