// Must be imported before anything that reads config.
process.env.NODE_ENV = 'test';
// Always use a dedicated test server/db, never the dev database from .env.
process.env.MONGODB_URI = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/feedants_test';
process.env.WRITE_RATE_LIMIT_PER_MINUTE = '100000';
process.env.SEAT_HOLD_MINUTES = '10';
