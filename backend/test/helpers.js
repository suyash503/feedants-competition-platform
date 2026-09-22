import './setup-env.js';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDb } from '../src/config/db.js';
import { clock } from '../src/lib/clock.js';
import { signToken } from '../src/middleware/auth.js';
import { Competition, Judge, User } from '../src/models/index.js';

const MIN = 60_000;
const DAY = 24 * 60 * MIN;

/** Each test file gets its own database so files can never interfere with each other. */
export async function startTestServer(dbName) {
  const uri = new URL(process.env.MONGODB_URI);
  uri.pathname = `/${dbName}`;
  await connectDb(uri.toString());
  await mongoose.connection.db.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));

  const server = createApp().listen(0);
  const api = () => request(server);
  const stop = async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
    await new Promise((resolve) => server.close(resolve));
  };
  return { api, stop };
}

export async function resetData() {
  clock.reset();
  await Promise.all(Object.values(mongoose.models).map((m) => m.deleteMany({})));
}

export async function createUsers(n, prefix = '+9180000') {
  const docs = Array.from({ length: n }, (_, i) => ({
    name: `User ${i}`,
    phone: `${prefix}${String(i).padStart(5, '0')}`,
  }));
  const users = await User.create(docs);
  return users.map((u) => ({ id: String(u._id), user: u, auth: { Authorization: `Bearer ${signToken(u._id)}` } }));
}

export async function createCompetition(overrides = {}) {
  const judge = await Judge.create({ name: 'Judge', designation: { en: 'Judge' } });
  const now = clock.now().getTime();
  const { schedule, ...rest } = overrides;
  return Competition.create({
    slug: `comp-${Math.random().toString(36).slice(2, 10)}`,
    title: { en: 'Test Competition' },
    category: 'dance',
    status: 'published',
    entryFee: 9900,
    rewards: [550, 300, 240, 200, 130, 80].map((r, i) => ({ position: i + 1, amount: r * 100 })),
    seats: { total: 20 },
    judge: judge._id,
    content: { about: { en: 'About' } },
    referral: { rewardPerSignup: 1000 },
    schedule: {
      registrationOpensAt: new Date(now - DAY),
      registrationClosesAt: new Date(now + DAY),
      submissionStartsAt: new Date(now - DAY),
      submissionEndsAt: new Date(now + 10 * DAY),
      resultAt: new Date(now + 12 * DAY),
      ...schedule,
    },
    ...rest,
  });
}

/** Pay for a pending order through the mock gateway, then verify it with the API. */
export async function payAndVerify(api, auth, orderId, outcome = 'success') {
  const checkout = await api().post('/api/v1/mock-gateway/checkout').set(auth).send({ orderId, outcome });
  if (!checkout.body.ok) return checkout;
  return api()
    .post('/api/v1/payments/verify')
    .set(auth)
    .send({ orderId, paymentId: checkout.body.paymentId, signature: checkout.body.signature });
}

export { clock, MIN, DAY };
