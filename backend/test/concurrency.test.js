import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createCompetition, createUsers, payAndVerify, resetData, startTestServer } from './helpers.js';
import { Competition, Payment, Registration } from '../src/models/index.js';

let api;
let stop;
before(async () => ({ api, stop } = await startTestServer('feedants_test_concurrency')));
after(() => stop());
beforeEach(() => resetData());

test('200 users racing for 20 seats: exactly 20 win, nobody is oversold', async () => {
  const c = await createCompetition({ seats: { total: 20 } });
  const users = await createUsers(200);

  const results = await Promise.all(
    users.map((u) => api().post(`/api/v1/competitions/${c.slug}/registrations`).set(u.auth).send({})),
  );

  const won = results.filter((r) => r.status === 201);
  const soldOut = results.filter((r) => r.status === 409 && r.body.error.code === 'SOLD_OUT');
  assert.equal(won.length, 20);
  assert.equal(soldOut.length, 180);

  const fresh = await Competition.findById(c._id).lean();
  assert.equal(fresh.seats.taken, 20);
  assert.equal(await Registration.countDocuments({ competition: c._id, seatHeld: true }), 20);
});

test('the last seat goes to exactly one of many simultaneous buyers', async () => {
  const c = await createCompetition({ seats: { total: 20, taken: 19 } });
  const users = await createUsers(50);
  const results = await Promise.all(
    users.map((u) => api().post(`/api/v1/competitions/${c.slug}/registrations`).set(u.auth).send({})),
  );
  assert.equal(results.filter((r) => r.status === 201).length, 1);
  assert.equal((await Competition.findById(c._id).lean()).seats.taken, 20);
});

test('one user double-tapping 10 times holds one seat and gets one payment order', async () => {
  const c = await createCompetition();
  const [u] = await createUsers(1);
  const results = await Promise.all(
    Array.from({ length: 10 }, () => api().post(`/api/v1/competitions/${c.slug}/registrations`).set(u.auth).send({})),
  );

  // Every request either resumes the same hold or is told one is already in progress.
  for (const r of results) {
    assert.ok(
      r.status === 201 || (r.status === 409 && r.body.error.code === 'REGISTRATION_IN_PROGRESS'),
      `unexpected ${r.status} ${JSON.stringify(r.body)}`,
    );
  }
  const orderIds = new Set(results.filter((r) => r.status === 201).map((r) => r.body.pendingPayment.orderId));
  assert.equal(orderIds.size, 1);
  assert.equal((await Competition.findById(c._id).lean()).seats.taken, 1);
  assert.equal(await Registration.countDocuments({ competition: c._id }), 1);
  assert.equal(await Payment.countDocuments({ competition: c._id }), 1);
});

test('verifying the same payment concurrently confirms once and never double-counts', async () => {
  const c = await createCompetition();
  const [u] = await createUsers(1);
  const reg = await api().post(`/api/v1/competitions/${c.slug}/registrations`).set(u.auth).send({}).expect(201);
  const orderId = reg.body.pendingPayment.orderId;

  const checkout = await api().post('/api/v1/mock-gateway/checkout').set(u.auth).send({ orderId }).expect(200);
  const body = { orderId, paymentId: checkout.body.paymentId, signature: checkout.body.signature };
  const results = await Promise.all(
    Array.from({ length: 5 }, () => api().post('/api/v1/payments/verify').set(u.auth).send(body)),
  );
  for (const r of results) assert.equal(r.body.registration?.status, 'confirmed', JSON.stringify(r.body));
  assert.equal((await Competition.findById(c._id).lean()).seats.taken, 1);
  assert.equal(await Payment.countDocuments({ status: 'succeeded' }), 1);
});

test('mixed traffic: registrations, payments and cancellations keep the counter exact', async () => {
  const c = await createCompetition({ seats: { total: 30 } });
  const users = await createUsers(60);
  const base = `/api/v1/competitions/${c.slug}`;

  await Promise.all(
    users.map(async (u, i) => {
      const r = await api().post(`${base}/registrations`).set(u.auth).send({});
      if (r.status !== 201) return;
      if (i % 3 === 0) await api().delete(`${base}/registrations/me`).set(u.auth);
      else await payAndVerify(api, u.auth, r.body.pendingPayment.orderId);
    }),
  );

  const fresh = await Competition.findById(c._id).lean();
  const holding = await Registration.countDocuments({ competition: c._id, seatHeld: true });
  assert.equal(fresh.seats.taken, holding, 'seat counter must equal registrations holding a seat');
  assert.ok(fresh.seats.taken <= 30);
});
