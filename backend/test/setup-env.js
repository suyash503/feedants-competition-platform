// Must be imported before anything that reads config. No top-level await here: it would
// let sibling imports (and therefore config) evaluate before these variables are set.
import os from 'node:os';
import path from 'node:path';

process.env.NODE_ENV = 'test';
// Always use a dedicated test server/db, never the dev database from .env.
process.env.MONGODB_URI = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/feedants_test';
process.env.WRITE_RATE_LIMIT_PER_MINUTE = '100000';
process.env.SEAT_HOLD_MINUTES = '10';
// Uploaded test files go to the OS temp dir, not the repo.
process.env.UPLOAD_DIR = path.join(os.tmpdir(), 'feedants-test-uploads');
process.env.MAX_UPLOAD_MB = '1';
