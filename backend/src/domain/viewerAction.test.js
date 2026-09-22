import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTimeline } from './competitionPhase.js';
import { ACTION, getViewerAction } from './viewerAction.js';

const schedule = {
  registrationOpensAt: new Date('2026-08-01T00:00:00Z'),
  registrationClosesAt: new Date('2026-08-10T18:20:00Z'),
  submissionStartsAt: new Date('2026-08-05T22:30:00Z'),
  submissionEndsAt: new Date('2026-08-30T18:25:00Z'),
  resultAt: new Date('2026-09-01T18:20:00Z'),
};

function actionAt(iso, { status = 'published', seatsLeft = 5, registration = null, submission = null } = {}) {
  const now = new Date(iso);
  const timeline = getTimeline({ status, schedule }, now);
  return getViewerAction({ timeline, schedule, seatsLeft, registration, submission, now });
}

const confirmed = { status: 'confirmed', seatHeld: true };

test('guest before registration opens', () => {
  const a = actionAt('2026-07-30T00:00:00Z');
  assert.equal(a.type, ACTION.REGISTRATION_NOT_OPEN);
  assert.equal(a.enabled, false);
  assert.deepEqual(a.at, schedule.registrationOpensAt);
});

test('guest can register while seats remain, sees sold out when none', () => {
  assert.equal(actionAt('2026-08-03T00:00:00Z').type, ACTION.REGISTER);
  const full = actionAt('2026-08-03T00:00:00Z', { seatsLeft: 0 });
  assert.equal(full.type, ACTION.SOLD_OUT);
  assert.equal(full.enabled, false);
});

test('a user holding a seat can finish paying even when seatsLeft is 0', () => {
  const registration = { status: 'pending_payment', seatHeld: true, holdExpiresAt: new Date('2026-08-03T00:10:00Z') };
  assert.equal(actionAt('2026-08-03T00:00:00Z', { seatsLeft: 0, registration }).type, ACTION.COMPLETE_PAYMENT);
  // ...but not after the hold has expired.
  assert.equal(actionAt('2026-08-03T00:11:00Z', { seatsLeft: 0, registration }).type, ACTION.SOLD_OUT);
});

test('registered user moves through submission states', () => {
  assert.equal(actionAt('2026-08-02T00:00:00Z', { registration: confirmed }).type, ACTION.SUBMISSION_NOT_OPEN);
  assert.equal(actionAt('2026-08-07T00:00:00Z', { registration: confirmed }).type, ACTION.UPLOAD_SUBMISSION);
  assert.equal(
    actionAt('2026-08-07T00:00:00Z', { registration: confirmed, submission: {} }).type,
    ACTION.REPLACE_SUBMISSION,
  );
  assert.equal(actionAt('2026-08-31T00:00:00Z', { registration: confirmed, submission: {} }).type, ACTION.AWAITING_RESULTS);
  assert.equal(actionAt('2026-08-31T00:00:00Z', { registration: confirmed }).type, ACTION.SUBMISSION_MISSED);
});

test('guest after registration closes', () => {
  assert.equal(actionAt('2026-08-15T00:00:00Z').type, ACTION.REGISTRATION_CLOSED);
  assert.equal(actionAt('2026-08-31T00:00:00Z').type, ACTION.REGISTRATION_CLOSED);
});

test('results and cancellation override everything', () => {
  assert.equal(actionAt('2026-09-02T00:00:00Z', { registration: confirmed }).type, ACTION.VIEW_RESULTS);
  assert.equal(actionAt('2026-08-07T00:00:00Z', { status: 'cancelled', registration: confirmed }).type, ACTION.CANCELLED);
});
