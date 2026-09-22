import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.routes.js';
import { competitionsRouter } from './routes/competitions.routes.js';
import { mockGatewayRouter, paymentsRouter } from './routes/payments.routes.js';
import { UPLOAD_DIR, uploadsRouter } from './routes/uploads.routes.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  // Cross-origin resource policy relaxed so the app (another origin on web) can play uploaded videos.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',') }));
  app.use(express.json({ limit: '100kb' }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));

  app.get('/health', (_req, res) => {
    const dbUp = mongoose.connection.readyState === 1;
    res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ok' : 'degraded', db: dbUp ? 'up' : 'down' });
  });

  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', index: false, fallthrough: false }));

  const api = express.Router();
  api.use('/auth', authRouter);
  api.use('/competitions', competitionsRouter);
  api.use('/payments', paymentsRouter);
  api.use('/mock-gateway', mockGatewayRouter);
  api.use('/uploads', uploadsRouter);
  app.use('/api/v1', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
