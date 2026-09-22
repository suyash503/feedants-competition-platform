import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProd = nodeEnv === 'production';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

// Dev-friendly defaults for secrets, but production must set them explicitly.
function secret(name, devDefault) {
  return isProd ? required(name) : (process.env[name] ?? devDefault);
}

const int = (name, fallback) => {
  const n = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(n)) throw new Error(`${name} must be a number`);
  return n;
};

export const env = Object.freeze({
  nodeEnv,
  isProd,
  isTest: nodeEnv === 'test',
  port: int('PORT', 4000),
  mongoUri: required('MONGODB_URI'),

  jwtSecret: secret('JWT_SECRET', 'dev-only-jwt-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  enableDevLogin: (process.env.ENABLE_DEV_LOGIN ?? String(!isProd)) === 'true',

  paymentProvider: process.env.PAYMENT_PROVIDER ?? 'mock',
  paymentMockSecret: secret('PAYMENT_MOCK_SECRET', 'dev-only-mock-gateway-secret'),

  seatHoldMinutes: int('SEAT_HOLD_MINUTES', 10),
  holdSweepIntervalMs: int('HOLD_SWEEP_INTERVAL_MS', 30_000),
  writeRateLimitPerMinute: int('WRITE_RATE_LIMIT_PER_MINUTE', 30),

  referralBaseUrl: process.env.REFERRAL_BASE_URL ?? 'https://feedants.com/r/',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  logLevel: process.env.LOG_LEVEL ?? (nodeEnv === 'test' ? 'silent' : 'info'),
});
