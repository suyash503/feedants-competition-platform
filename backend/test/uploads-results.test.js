import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { DAY, clock, createCompetition, createUsers, resetData, startTestServer } from './helpers.js';
import { Registration, Submission } from '../src/models/index.js';

let api;
let stop;
before(async () => ({ api, stop } = await startTestServer('feedants_test_uploads')));
after(() => stop());
beforeEach(() => resetData());

const fakeVideo = Buffer.from('\x00\x00\x00\x18ftypmp42 not really a video');

describe('video uploads', () => {
  test('stores the file and returns a URL that serves it', async () => {
    const [u] = await createUsers(1);
    const res = await api()
      .post('/api/v1/uploads/videos')
      .set(u.auth)
      .attach('video', fakeVideo, { filename: 'dance.mp4', contentType: 'video/mp4' })
      .expect(201);
    assert.equal(res.body.mimeType, 'video/mp4');
    assert.equal(res.body.sizeBytes, fakeVideo.length);
    assert.match(res.body.url, /^http:\/\/127\.0\.0\.1:\d+\/uploads\/[a-f0-9]{24}-[a-f0-9]{16}\.mp4$/);

    const path = new URL(res.body.url).pathname;
    const served = await api().get(path).expect(200);
    assert.equal(served.headers['cross-origin-resource-policy'], 'cross-origin');
  });

  test('rejects non-video files, oversized files, missing files and anonymous users', async () => {
    const [u] = await createUsers(1);
    const wrongType = await api()
      .post('/api/v1/uploads/videos')
      .set(u.auth)
      .attach('video', Buffer.from('hello'), { filename: 'notes.txt', contentType: 'text/plain' })
      .expect(400);
    assert.equal(wrongType.body.error.code, 'UNSUPPORTED_FILE_TYPE');

    const tooBig = await api()
      .post('/api/v1/uploads/videos')
      .set(u.auth)
      .attach('video', Buffer.alloc(1024 * 1024 + 1), { filename: 'big.mp4', contentType: 'video/mp4' })
      .expect(413);
    assert.equal(tooBig.body.error.code, 'FILE_TOO_LARGE');

    const missing = await api().post('/api/v1/uploads/videos').set(u.auth).expect(400);
    assert.equal(missing.body.error.code, 'FILE_REQUIRED');

    await api()
      .post('/api/v1/uploads/videos')
      .attach('video', fakeVideo, { filename: 'a.mp4', contentType: 'video/mp4' })
      .expect(401);
  });

  test('unknown uploaded files are a clean 404', async () => {
    const res = await api().get('/uploads/does-not-exist.mp4').expect(404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });
});

describe('results', () => {
  test('are hidden until announced, then ranked with prize money', async () => {
    const c = await createCompetition({ entryFee: 0 });
    const users = await createUsers(3);
    for (const [i, u] of users.entries()) {
      const reg = await Registration.create({
        competition: c._id, user: u.id, status: 'confirmed', seatHeld: true, amount: 0,
      });
      await Submission.create({
        registration: reg._id, competition: c._id, user: u.id, revision: 1,
        video: { url: 'https://cdn.example.com/v.mp4' }, status: 'scored', score: 90 - i, rank: i + 1,
      });
    }

    const early = await api().get(`/api/v1/competitions/${c.slug}/results`).expect(409);
    assert.equal(early.body.error.code, 'RESULTS_NOT_OUT');

    clock.advance(13 * DAY); // past resultAt
    const res = await api().get(`/api/v1/competitions/${c.slug}/results`).expect(200);
    assert.deepEqual(res.body.items.map((r) => [r.rank, r.name, r.prize]), [
      [1, 'User 0', 55000],
      [2, 'User 1', 30000],
      [3, 'User 2', 24000],
    ]);
  });
});
