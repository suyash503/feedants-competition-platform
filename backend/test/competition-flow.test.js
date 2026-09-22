import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DAY,
  MIN,
  clock,
  createCompetition,
  createUsers,
  payAndVerify,
  resetData,
  startTestServer,
} from './helpers.js';
import { Registration, User } from '../src/models/index.js';

let api;
let stop;
before(async () => ({ api, stop } = await startTestServer('feedants_test_flow')));
after(() => stop());
beforeEach(() => resetData());

describe('public competition details', () => {
  test('returns data from the database with derived fields', async () => {
    const c = await createCompetition({ seats: { total: 20, taken: 1 } });
    const res = await api().get(`/api/v1/competitions/${c.slug}`).expect(200);

    assert.equal(res.body.title.en, 'Test Competition');
    assert.equal(res.body.prizePool, 150000); // ₹1,500 derived from rewards
    assert.equal(res.body.isMultiWin, true);
    assert.deepEqual(res.body.seats, { total: 20, taken: 1, left: 19 });
    assert.equal(res.body.judge.name, 'Judge');
    assert.equal(res.body.timeline.phase, 'registration_open');
    assert.equal(res.body.timeline.countdown.label, 'registration_closes');
    assert.match(res.headers['cache-control'], /max-age=5/);
  });

  test('list shows joinable competitions first and hides drafts', async () => {
    await createCompetition({ slug: 'finished', schedule: {
      registrationOpensAt: new Date(Date.now() - 20 * DAY),
      registrationClosesAt: new Date(Date.now() - 15 * DAY),
      submissionStartsAt: new Date(Date.now() - 20 * DAY),
      submissionEndsAt: new Date(Date.now() - 10 * DAY),
      resultAt: new Date(Date.now() - 5 * DAY),
    } });
    await createCompetition({ slug: 'open-now' });
    await createCompetition({ slug: 'secret', status: 'draft' });

    const res = await api().get('/api/v1/competitions').expect(200);
    assert.deepEqual(res.body.items.map((c) => c.slug), ['open-now', 'finished']);
    assert.equal(res.body.items[0].timeline.phase, 'registration_open');
    assert.equal(res.body.items[0].seats.left, 20);
  });

  test('can be looked up by id as well as slug', async () => {
    const c = await createCompetition();
    await api().get(`/api/v1/competitions/${c._id}`).expect(200);
  });

  test('unknown competition and draft competitions are 404', async () => {
    const draft = await createCompetition({ status: 'draft' });
    const missing = await api().get('/api/v1/competitions/does-not-exist').expect(404);
    assert.equal(missing.body.error.code, 'NOT_FOUND');
    await api().get(`/api/v1/competitions/${draft.slug}`).expect(404);
  });
});

describe('auth', () => {
  test('personal endpoints need a token', async () => {
    const c = await createCompetition();
    await api().get(`/api/v1/competitions/${c.slug}/me`).expect(401);
    await api().get(`/api/v1/competitions/${c.slug}/me`).set({ Authorization: 'Bearer nope' }).expect(401);
  });

  test('dev login creates the user once and returns a working token', async () => {
    const c = await createCompetition();
    const first = await api().post('/api/v1/auth/dev-login').send({ phone: '+919111111111', name: 'Asha' }).expect(200);
    await api().post('/api/v1/auth/dev-login').send({ phone: '+919111111111' }).expect(200);
    assert.equal(await User.countDocuments({ phone: '+919111111111' }), 1);

    const me = await api()
      .get(`/api/v1/competitions/${c.slug}/me`)
      .set({ Authorization: `Bearer ${first.body.token}` })
      .expect(200);
    assert.equal(me.body.action.type, 'register');
    assert.equal(me.body.referral.code, first.body.user.referralCode);
  });

  test('rejects an invalid phone number', async () => {
    const res = await api().post('/api/v1/auth/dev-login').send({ phone: 'abc' }).expect(400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });
});

describe('registration → payment → submission', () => {
  test('happy path walks through every CTA state', async () => {
    const c = await createCompetition();
    const [{ auth }] = await createUsers(1);
    const base = `/api/v1/competitions/${c.slug}`;

    const reg = await api().post(`${base}/registrations`).set(auth).send({}).expect(201);
    assert.equal(reg.body.action.type, 'complete_payment');
    assert.equal(reg.body.registration.status, 'pending_payment');
    assert.equal(reg.body.pendingPayment.amount, 9900);
    assert.equal(reg.body.seats.taken, 1);

    const verified = await payAndVerify(api, auth, reg.body.pendingPayment.orderId);
    assert.equal(verified.status, 200);
    assert.equal(verified.body.registration.status, 'confirmed');
    assert.equal(verified.body.action.type, 'upload_submission');

    const video = { url: 'https://cdn.example.com/v.mp4', mimeType: 'video/mp4', sizeBytes: 1_000_000, durationSec: 120 };
    const sub = await api().put(`${base}/submission`).set(auth).send({ video }).expect(200);
    assert.equal(sub.body.action.type, 'replace_submission');
    assert.equal(sub.body.submission.revision, 1);

    const replaced = await api().put(`${base}/submission`).set(auth).send({ video }).expect(200);
    assert.equal(replaced.body.submission.revision, 2);

    // Registering again after confirming is refused.
    const again = await api().post(`${base}/registrations`).set(auth).send({}).expect(409);
    assert.equal(again.body.error.code, 'ALREADY_REGISTERED');
  });

  test('a failed payment keeps the seat held so the user can retry', async () => {
    const c = await createCompetition();
    const [{ auth }] = await createUsers(1);
    const reg = await api().post(`/api/v1/competitions/${c.slug}/registrations`).set(auth).send({}).expect(201);

    const failed = await payAndVerify(api, auth, reg.body.pendingPayment.orderId, 'failure');
    assert.equal(failed.status, 402);

    const me = await api().get(`/api/v1/competitions/${c.slug}/me`).set(auth).expect(200);
    assert.equal(me.body.action.type, 'complete_payment');
    assert.equal(me.body.pendingPayment.orderId, reg.body.pendingPayment.orderId);

    const retried = await payAndVerify(api, auth, reg.body.pendingPayment.orderId);
    assert.equal(retried.body.registration.status, 'confirmed');
  });

  test('free competitions confirm immediately without payment', async () => {
    const c = await createCompetition({ entryFee: 0 });
    const [{ auth }] = await createUsers(1);
    const res = await api().post(`/api/v1/competitions/${c.slug}/registrations`).set(auth).send({}).expect(201);
    assert.equal(res.body.registration.status, 'confirmed');
    assert.equal(res.body.pendingPayment, null);
  });

  test('cancelling an unpaid hold gives the seat back', async () => {
    const c = await createCompetition();
    const [{ auth }] = await createUsers(1);
    const base = `/api/v1/competitions/${c.slug}`;
    await api().post(`${base}/registrations`).set(auth).send({}).expect(201);
    const cancelled = await api().delete(`${base}/registrations/me`).set(auth).expect(200);
    assert.equal(cancelled.body.registration.status, 'cancelled');
    assert.equal(cancelled.body.seats.taken, 0);
    assert.equal(cancelled.body.action.type, 'register');

    // ...and they can change their mind and register again.
    const back = await api().post(`${base}/registrations`).set(auth).send({}).expect(201);
    assert.equal(back.body.seats.taken, 1);
  });
});

describe('time-based rules (server clock)', () => {
  test('registration not yet open / already closed', async () => {
    const upcoming = await createCompetition({
      schedule: {
        registrationOpensAt: new Date(Date.now() + DAY),
        registrationClosesAt: new Date(Date.now() + 2 * DAY),
        submissionStartsAt: new Date(Date.now() + DAY),
      },
    });
    const [{ auth }] = await createUsers(1);
    const early = await api().post(`/api/v1/competitions/${upcoming.slug}/registrations`).set(auth).send({}).expect(409);
    assert.equal(early.body.error.code, 'REGISTRATION_NOT_OPEN');

    const open = await createCompetition();
    clock.advance(2 * DAY); // past registrationClosesAt
    const late = await api().post(`/api/v1/competitions/${open.slug}/registrations`).set(auth).send({}).expect(409);
    assert.equal(late.body.error.code, 'REGISTRATION_CLOSED');
  });

  test('submissions are refused outside the window and for non-participants', async () => {
    const c = await createCompetition({ entryFee: 0 });
    const [a, b] = await createUsers(2);
    const base = `/api/v1/competitions/${c.slug}`;
    const video = { url: 'https://cdn.example.com/v.mp4' };

    const stranger = await api().put(`${base}/submission`).set(b.auth).send({ video }).expect(403);
    assert.equal(stranger.body.error.code, 'NOT_REGISTERED');

    await api().post(`${base}/registrations`).set(a.auth).send({}).expect(201);
    clock.advance(11 * DAY); // past submissionEndsAt
    const late = await api().put(`${base}/submission`).set(a.auth).send({ video }).expect(409);
    assert.equal(late.body.error.code, 'SUBMISSION_CLOSED');

    const me = await api().get(`${base}/me`).set(a.auth).expect(200);
    assert.equal(me.body.action.type, 'submission_missed');
  });

  test('submission payload is validated', async () => {
    const c = await createCompetition({ entryFee: 0 });
    const [{ auth }] = await createUsers(1);
    const base = `/api/v1/competitions/${c.slug}`;
    await api().post(`${base}/registrations`).set(auth).send({}).expect(201);
    const res = await api()
      .put(`${base}/submission`)
      .set(auth)
      .send({ video: { url: 'ftp://x', mimeType: 'image/png', sizeBytes: 10 ** 12 } })
      .expect(400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.details.length >= 2);
  });
});

describe('referrals', () => {
  test('valid code credits the referrer once the referee pays', async () => {
    const c = await createCompetition();
    const [referrer, referee] = await createUsers(2);
    const code = referrer.user.referralCode;

    const reg = await api()
      .post(`/api/v1/competitions/${c.slug}/registrations`)
      .set(referee.auth)
      .send({ referralCode: code.toLowerCase() })
      .expect(201);
    let me = await api().get(`/api/v1/competitions/${c.slug}/me`).set(referrer.auth).expect(200);
    assert.equal(me.body.referral.signups, 0); // not yet paid

    await payAndVerify(api, referee.auth, reg.body.pendingPayment.orderId);
    me = await api().get(`/api/v1/competitions/${c.slug}/me`).set(referrer.auth).expect(200);
    assert.equal(me.body.referral.signups, 1);
    assert.equal(me.body.referral.earned, 1000);
    assert.match(me.body.referral.link, new RegExp(`${code}$`));
  });

  test('unknown and self referral codes are rejected', async () => {
    const c = await createCompetition();
    const [u] = await createUsers(1);
    const base = `/api/v1/competitions/${c.slug}/registrations`;
    const unknown = await api().post(base).set(u.auth).send({ referralCode: 'NOPE1234' }).expect(400);
    assert.equal(unknown.body.error.code, 'INVALID_REFERRAL_CODE');
    const self = await api().post(base).set(u.auth).send({ referralCode: u.user.referralCode }).expect(400);
    assert.equal(self.body.error.code, 'SELF_REFERRAL');
    assert.equal(await Registration.countDocuments({ seatHeld: true }), 0);
  });
});

test('hold expiry: an abandoned checkout frees its seat', async () => {
  const c = await createCompetition({ seats: { total: 1 } });
  const [a, b] = await createUsers(2);
  const base = `/api/v1/competitions/${c.slug}`;

  await api().post(`${base}/registrations`).set(a.auth).send({}).expect(201);
  const full = await api().post(`${base}/registrations`).set(b.auth).send({}).expect(409);
  assert.equal(full.body.error.code, 'SOLD_OUT');

  clock.advance(11 * MIN);
  const { releaseExpiredHolds } = await import('../src/services/seats.js');
  assert.equal(await releaseExpiredHolds(clock.now()), 1);

  const avail = await api().get(`${base}/availability`).expect(200);
  assert.equal(avail.body.seats.left, 1);
  await api().post(`${base}/registrations`).set(b.auth).send({}).expect(201);
});
