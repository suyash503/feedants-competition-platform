import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createCompetition, createUsers, resetData, startTestServer } from './helpers.js';
import { availabilityHub } from '../src/services/availability.js';

let api;
let stop;
let origin;
before(async () => ({ api, stop, origin } = await startTestServer('feedants_test_live')));
after(() => stop());
beforeEach(() => resetData());

/** Minimal SSE reader: resolves `next()` with each parsed `availability` event. */
function openStream(url) {
  const queue = [];
  const waiters = [];
  let buffer = '';
  const req = http.get(url, (res) => {
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      buffer += chunk;
      let idx;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const data = block.split('\n').find((l) => l.startsWith('data: '));
        if (!data) continue;
        const event = JSON.parse(data.slice(6));
        const waiter = waiters.shift();
        if (waiter) waiter(event);
        else queue.push(event);
      }
    });
  });
  return {
    headers: new Promise((resolve) => req.on('response', (res) => resolve(res.headers))),
    next: () =>
      queue.length
        ? Promise.resolve(queue.shift())
        : new Promise((resolve, reject) => {
            waiters.push(resolve);
            setTimeout(() => reject(new Error('no SSE event within 3s')), 3000);
          }),
    close: () => req.destroy(),
  };
}

test('streams a snapshot, then pushes seat changes as they happen', async () => {
  const c = await createCompetition({ seats: { total: 5 } });
  const users = await createUsers(3);
  const base = `${origin}/api/v1/competitions/${c.slug}`;

  const stream = openStream(`${base}/live`);
  assert.match((await stream.headers)['content-type'], /text\/event-stream/);
  assert.deepEqual((await stream.next()).seats, { total: 5, taken: 0, left: 5 });

  // Three registrations in quick succession are coalesced into (at most a few) updates,
  // and the latest one always reflects the final count.
  await Promise.all(users.map((u) => api().post(`/api/v1/competitions/${c.slug}/registrations`).set(u.auth).send({})));
  let latest = await stream.next();
  while (latest.seats.taken < 3) latest = await stream.next();
  assert.deepEqual(latest.seats, { total: 5, taken: 3, left: 2 });

  // Releasing a seat is pushed too.
  await api().delete(`/api/v1/competitions/${c.slug}/registrations/me`).set(users[0].auth).expect(200);
  assert.equal((await stream.next()).seats.taken, 2);

  stream.close();
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(availabilityHub.subscriberCount(c._id), 0, 'closed streams unsubscribe');
});

test('unknown competition is a normal 404, not a stream', async () => {
  const res = await api().get('/api/v1/competitions/nope/live').expect(404);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});
