import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { MIN, clock, createCompetition, createUsers, resetData, startTestServer } from './helpers.js';
import { Competition, Payment } from '../src/models/index.js';
import { releaseExpiredHolds } from '../src/services/seats.js';

let api;
let stop;
before(async () => ({ api, stop } = await startTestServer('feedants_test_payments')));
after(() => stop());
beforeEach(() => resetData());

async function register(slug, auth) {
  return (await api().post(`/api/v1/competitions/${slug}/registrations`).set(auth).send({}).expect(201)).body;
}
async function checkout(auth, orderId) {
  return (await api().post('/api/v1/mock-gateway/checkout').set(auth).send({ orderId }).expect(200)).body;
}

test('a forged signature is rejected and nothing is confirmed', async () => {
  const c = await createCompetition();
  const [u] = await createUsers(1);
  const { pendingPayment } = await register(c.slug, u.auth);
  const paid = await checkout(u.auth, pendingPayment.orderId);

  const res = await api()
    .post('/api/v1/payments/verify')
    .set(u.auth)
    .send({ orderId: pendingPayment.orderId, paymentId: paid.paymentId, signature: 'a'.repeat(64) })
    .expect(400);
  assert.equal(res.body.error.code, 'INVALID_PAYMENT_SIGNATURE');
  assert.equal(await Payment.countDocuments({ status: 'succeeded' }), 0);
});

test("a user cannot verify someone else's order", async () => {
  const c = await createCompetition();
  const [owner, attacker] = await createUsers(2);
  const { pendingPayment } = await register(c.slug, owner.auth);
  const paid = await checkout(owner.auth, pendingPayment.orderId);
  await api()
    .post('/api/v1/payments/verify')
    .set(attacker.auth)
    .send({ orderId: pendingPayment.orderId, paymentId: paid.paymentId, signature: paid.signature })
    .expect(404);
});

test('late payment after hold expired: re-seated if a spot is still free', async () => {
  const c = await createCompetition({ seats: { total: 5 } });
  const [u] = await createUsers(1);
  const { pendingPayment } = await register(c.slug, u.auth);
  const paid = await checkout(u.auth, pendingPayment.orderId);

  clock.advance(11 * MIN);
  await releaseExpiredHolds(clock.now());
  assert.equal((await Competition.findById(c._id).lean()).seats.taken, 0);

  const res = await api()
    .post('/api/v1/payments/verify')
    .set(u.auth)
    .send({ orderId: pendingPayment.orderId, paymentId: paid.paymentId, signature: paid.signature })
    .expect(200);
  assert.equal(res.body.registration.status, 'confirmed');
  assert.equal(res.body.seats.taken, 1);
});

test('late payment after hold expired and seats sold out: refunded, not oversold', async () => {
  const c = await createCompetition({ seats: { total: 1 } });
  const [late, other] = await createUsers(2);
  const { pendingPayment } = await register(c.slug, late.auth);
  const paid = await checkout(late.auth, pendingPayment.orderId);

  clock.advance(11 * MIN);
  await releaseExpiredHolds(clock.now());
  await register(c.slug, other.auth); // someone else takes the freed seat

  const res = await api()
    .post('/api/v1/payments/verify')
    .set(late.auth)
    .send({ orderId: pendingPayment.orderId, paymentId: paid.paymentId, signature: paid.signature })
    .expect(409);
  assert.equal(res.body.error.code, 'SEAT_LOST_REFUNDED');
  assert.equal(await Payment.countDocuments({ status: 'refunded' }), 1);
  assert.equal((await Competition.findById(c._id).lean()).seats.taken, 1);
});

test('re-registering after an expired hold creates a fresh order', async () => {
  const c = await createCompetition();
  const [u] = await createUsers(1);
  const first = await register(c.slug, u.auth);
  clock.advance(11 * MIN);
  const second = await register(c.slug, u.auth); // expired hold is tidied up inline
  assert.notEqual(second.pendingPayment.orderId, first.pendingPayment.orderId);
  assert.equal(second.seats.taken, 1);
});
