import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PHASE, getPhase, getTimeline } from './competitionPhase.js';

// Mirrors the design: submissions open (6 Aug) before registration closes (10 Aug).
const competition = {
  status: 'published',
  schedule: {
    registrationOpensAt: new Date('2026-08-01T00:00:00Z'),
    registrationClosesAt: new Date('2026-08-10T18:20:00Z'),
    submissionStartsAt: new Date('2026-08-05T22:30:00Z'),
    submissionEndsAt: new Date('2026-08-30T18:25:00Z'),
    resultAt: new Date('2026-09-01T18:20:00Z'),
  },
};
const at = (iso) => new Date(iso);

test('phase follows the schedule', () => {
  assert.equal(getPhase(competition, at('2026-07-31T00:00:00Z')), PHASE.UPCOMING);
  assert.equal(getPhase(competition, at('2026-08-03T00:00:00Z')), PHASE.REGISTRATION_OPEN);
  assert.equal(getPhase(competition, at('2026-08-15T00:00:00Z')), PHASE.SUBMISSION_ONLY);
  assert.equal(getPhase(competition, at('2026-08-31T00:00:00Z')), PHASE.JUDGING);
  assert.equal(getPhase(competition, at('2026-09-02T00:00:00Z')), PHASE.RESULTS_ANNOUNCED);
});

test('boundaries: closing instant is already closed', () => {
  assert.equal(getPhase(competition, competition.schedule.registrationClosesAt), PHASE.SUBMISSION_ONLY);
  assert.equal(getPhase(competition, competition.schedule.registrationOpensAt), PHASE.REGISTRATION_OPEN);
});

test('admin status overrides dates', () => {
  const now = at('2026-08-03T00:00:00Z');
  assert.equal(getPhase({ ...competition, status: 'cancelled' }, now), PHASE.CANCELLED);
  assert.equal(getPhase({ ...competition, status: 'draft' }, now), PHASE.DRAFT);
  const t = getTimeline({ ...competition, status: 'cancelled' }, now);
  assert.equal(t.isRegistrationWindowOpen, false);
  assert.equal(t.isSubmissionWindowOpen, false);
});

test('registration and submission windows can both be open', () => {
  const t = getTimeline(competition, at('2026-08-07T00:00:00Z'));
  assert.equal(t.phase, PHASE.REGISTRATION_OPEN);
  assert.equal(t.isRegistrationWindowOpen, true);
  assert.equal(t.isSubmissionWindowOpen, true);
  assert.deepEqual(t.countdown, { label: 'registration_closes', endsAt: competition.schedule.registrationClosesAt });
});

test('no countdown once results are out', () => {
  assert.equal(getTimeline(competition, at('2026-09-05T00:00:00Z')).countdown, null);
});
