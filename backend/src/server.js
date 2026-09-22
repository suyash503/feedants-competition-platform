import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDb, disconnectDb } from './config/db.js';
import { clock } from './lib/clock.js';
import { logger } from './lib/logger.js';
import { releaseExpiredHolds } from './services/seats.js';

await connectDb(env.mongoUri);
logger.info('connected to MongoDB');

const server = createApp().listen(env.port, () => logger.info(`API listening on http://localhost:${env.port}`));

// Release abandoned checkout holds. Every instance can run this safely: releasing a
// hold is atomic and idempotent, so two sweepers never free the same seat twice.
const sweeper = setInterval(async () => {
  try {
    const released = await releaseExpiredHolds(clock.now());
    if (released) logger.info({ released }, 'released expired seat holds');
  } catch (err) {
    logger.error({ err }, 'hold sweeper failed');
  }
}, env.holdSweepIntervalMs);
sweeper.unref();

async function shutdown(signal) {
  logger.info({ signal }, 'shutting down');
  clearInterval(sweeper);
  server.close(async () => {
    await disconnectDb();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
// Graceful stop when run as a child process (signals are unreliable on Windows).
process.on('message', (msg) => msg === 'shutdown' && shutdown('ipc'));
