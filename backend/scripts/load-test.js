/**
 * Load test: many users race for a few seats over real HTTP, then the winners pay.
 * Afterwards the database is checked: no overselling, the counter matches reality.
 *
 *   npm run loadtest                          # 1000 users, 20 seats
 *   npm run loadtest -- --users 2000 --seats 50 --taps 3
 *
 * --taps N makes every user fire N simultaneous "Register" requests (double-tap storm).
 * --concurrency caps in-flight requests (like a load balancer's connection pool; opening
 * thousands of sockets at once mostly measures the OS accept backlog, not the API).
 * The API runs as its own process (as in production), so the load generator doesn't
 * steal its CPU. Uses its own database (<your db>_loadtest) and drops it at the end.
 */
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { performance } from 'node:perf_hooks';


const { values: args } = parseArgs({
  options: {
    users: { type: 'string', default: '1000' },
    seats: { type: 'string', default: '20' },
    taps: { type: 'string', default: '1' },
    concurrency: { type: 'string', default: '200' },
    port: { type: 'string', default: '4599' },
  },
});
const USERS = Number(args.users);
const SEATS = Number(args.seats);
const TAPS = Number(args.taps);
const CONCURRENCY = Number(args.concurrency);

const { env } = await import('../src/config/env.js');
const { connectDb, disconnectDb } = await import('../src/config/db.js');
const { signToken } = await import('../src/middleware/auth.js');
const { Competition, Judge, Payment, Registration, User } = await import('../src/models/index.js');
const mongoose = (await import('mongoose')).default;

const uri = new URL(env.mongoUri);
uri.pathname = `${uri.pathname.replace(/\/$/, '') || '/feedants'}_loadtest`;
await connectDb(uri.toString());
await mongoose.connection.db.dropDatabase();
await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));

// Start the real API server in a separate process against the load-test database.
const api = fork(fileURLToPath(new URL('../src/server.js', import.meta.url)), {
  env: {
    ...process.env,
    MONGODB_URI: uri.toString(),
    PORT: args.port,
    LOG_LEVEL: 'silent',
    NODE_ENV: 'production',
    JWT_SECRET: env.jwtSecret,
    PAYMENT_MOCK_SECRET: env.paymentMockSecret,
    ENABLE_DEV_LOGIN: 'false',
    WRITE_RATE_LIMIT_PER_MINUTE: '1000000',
  },
  stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
  execArgv: process.env.LOADTEST_PROFILE ? ['--cpu-prof', `--cpu-prof-dir=${process.env.LOADTEST_PROFILE}`] : [],
});
const origin = `http://127.0.0.1:${args.port}`;
const base = `${origin}/api/v1`;
for (let i = 0; ; i++) {
  if (await fetch(`${origin}/health`).then((r) => r.ok, () => false)) break;
  if (i > 100) throw new Error('API did not start');
  await new Promise((r) => setTimeout(r, 100));
}

// --- setup -------------------------------------------------------------------
const DAY = 86_400_000;
const now = Date.now();
const judge = await Judge.create({ name: 'Load Judge', designation: { en: 'Judge' } });
const competition = await Competition.create({
  slug: 'load-test',
  title: { en: 'Load Test Cup' },
  category: 'dance',
  status: 'published',
  entryFee: 9900,
  rewards: [{ position: 1, amount: 100000 }],
  seats: { total: SEATS },
  judge: judge._id,
  content: { about: { en: 'Load test' } },
  schedule: {
    registrationOpensAt: new Date(now - DAY),
    registrationClosesAt: new Date(now + DAY),
    submissionStartsAt: new Date(now - DAY),
    submissionEndsAt: new Date(now + 5 * DAY),
    resultAt: new Date(now + 6 * DAY),
  },
});
const users = await User.insertMany(
  Array.from({ length: USERS }, (_, i) => ({ name: `Load ${i}`, phone: `+9170${String(i).padStart(8, '0')}` })),
);
const tokens = users.map((u) => `Bearer ${signToken(u._id)}`);

// Simple semaphore so at most CONCURRENCY requests are in flight.
let inFlight = 0;
const waiting = [];
async function acquire() {
  if (inFlight < CONCURRENCY) return void inFlight++;
  await new Promise((r) => waiting.push(r));
}
function release() {
  const next = waiting.shift();
  if (next) next();
  else inFlight--;
}

async function call(method, path, token, body) {
  await acquire();
  try {
    return await send(method, path, token, body);
  } finally {
    release();
  }
}

async function send(method, path, token, body) {
  const t0 = performance.now();
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data, ms: performance.now() - t0 };
}

const pct = (arr, p) => {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};
const fmt = (n) => `${n.toFixed(0)} ms`;

// --- phase 1: the race ---------------------------------------------------------
console.log(`\nRacing ${USERS} users${TAPS > 1 ? ` × ${TAPS} taps` : ''} for ${SEATS} seats over HTTP (max ${CONCURRENCY} in flight)...`);
const t0 = performance.now();
const results = await Promise.all(
  tokens.flatMap((token, i) =>
    Array.from({ length: TAPS }, () =>
      call('POST', `/competitions/${competition.slug}/registrations`, token, {}).then((r) => ({ ...r, user: i })),
    ),
  ),
);
const raceMs = performance.now() - t0;

const byCode = {};
for (const r of results) {
  const key = r.status === 201 ? '201 seat held (repeat taps get their own hold back)' : `${r.status} ${r.data?.error?.code ?? 'ERROR'}`;
  byCode[key] = (byCode[key] ?? 0) + 1;
}
const winners = [...new Map(results.filter((r) => r.status === 201).map((r) => [r.user, r])).values()];

// --- phase 2: winners pay at the same time -----------------------------------------
const t1 = performance.now();
const payments = await Promise.all(
  winners.map(async (w) => {
    const orderId = w.data.pendingPayment.orderId;
    const checkout = await call('POST', '/mock-gateway/checkout', tokens[w.user], { orderId });
    return call('POST', '/payments/verify', tokens[w.user], {
      orderId,
      paymentId: checkout.data.paymentId,
      signature: checkout.data.signature,
    });
  }),
);
const payMs = performance.now() - t1;

// --- verify invariants -----------------------------------------------------------
const fresh = await Competition.findById(competition._id).lean();
const holding = await Registration.countDocuments({ competition: competition._id, seatHeld: true });
const confirmed = await Registration.countDocuments({ competition: competition._id, status: 'confirmed' });
const registrationDocs = await Registration.countDocuments({ competition: competition._id });
const succeededPayments = await Payment.countDocuments({ competition: competition._id, status: 'succeeded' });

const checks = [
  ['Seats taken never exceeds capacity', fresh.seats.taken <= SEATS],
  ['Seat counter == registrations holding a seat', fresh.seats.taken === holding],
  ['Exactly `seats` distinct users won a seat', winners.length === Math.min(SEATS, USERS)],
  ['Every winner paid and was confirmed', confirmed === winners.length && payments.every((p) => p.status === 200)],
  ['One payment per confirmed seat', succeededPayments === confirmed],
  ['At most one registration per user', registrationDocs <= USERS],
];

const latencies = results.map((r) => r.ms);
console.log('\nOutcome of registration requests');
console.table(byCode);
console.log('Registration latency');
console.table({
  requests: results.length,
  'wall time': fmt(raceMs),
  throughput: `${Math.round((results.length / raceMs) * 1000)} req/s`,
  p50: fmt(pct(latencies, 50)),
  p95: fmt(pct(latencies, 95)),
  p99: fmt(pct(latencies, 99)),
});
console.log(`Distinct winners: ${winners.length}`);
console.log(`Payments: ${payments.length} concurrent checkout+verify pairs in ${fmt(payMs)}\n`);
console.log('Invariants');
for (const [name, ok] of checks) console.log(`  ${ok ? '✔' : '✘'} ${name}`);
console.log(`\nseats.taken=${fresh.seats.taken}/${SEATS}, holding=${holding}, confirmed=${confirmed}`);

await mongoose.connection.db.dropDatabase();
api.send('shutdown');
await new Promise((r) => api.once('exit', r));
await disconnectDb();
process.exit(checks.every(([, ok]) => ok) ? 0 : 1);
