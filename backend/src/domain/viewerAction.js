import { PHASE } from './competitionPhase.js';

/**
 * The single primary action a user can take on a competition right now. This drives
 * the bottom CTA ("Register", "Upload Submission", "Competition Full", ...). It lives
 * on the server so every client shows the same, rule-consistent state; the app only
 * maps `type` to a label.
 */
export const ACTION = Object.freeze({
  UNAVAILABLE: 'unavailable',
  CANCELLED: 'cancelled',
  REGISTRATION_NOT_OPEN: 'registration_not_open',
  REGISTER: 'register',
  COMPLETE_PAYMENT: 'complete_payment',
  SOLD_OUT: 'sold_out',
  REGISTRATION_CLOSED: 'registration_closed',
  SUBMISSION_NOT_OPEN: 'submission_not_open',
  UPLOAD_SUBMISSION: 'upload_submission',
  REPLACE_SUBMISSION: 'replace_submission',
  SUBMISSION_MISSED: 'submission_missed',
  AWAITING_RESULTS: 'awaiting_results',
  VIEW_RESULTS: 'view_results',
});

const ENABLED = new Set([
  ACTION.REGISTER,
  ACTION.COMPLETE_PAYMENT,
  ACTION.UPLOAD_SUBMISSION,
  ACTION.REPLACE_SUBMISSION,
  ACTION.VIEW_RESULTS,
]);

const act = (type, at = null) => ({ type, enabled: ENABLED.has(type), at });

/**
 * @param {object} p
 * @param {{ phase: string, isRegistrationWindowOpen: boolean, isSubmissionWindowOpen: boolean }} p.timeline
 * @param {Record<string, Date>} p.schedule
 * @param {number} p.seatsLeft
 * @param {{ status: string, seatHeld: boolean, holdExpiresAt?: Date } | null} p.registration
 * @param {object | null} p.submission
 * @param {Date} p.now
 */
export function getViewerAction({ timeline, schedule, seatsLeft, registration, submission, now }) {
  const { phase } = timeline;
  if (phase === PHASE.DRAFT) return act(ACTION.UNAVAILABLE);
  if (phase === PHASE.CANCELLED) return act(ACTION.CANCELLED);
  if (phase === PHASE.RESULTS_ANNOUNCED) return act(ACTION.VIEW_RESULTS);

  const confirmed = registration?.status === 'confirmed';
  const holding =
    registration?.status === 'pending_payment' &&
    registration.seatHeld &&
    registration.holdExpiresAt > now;

  if (confirmed) {
    if (timeline.isSubmissionWindowOpen) {
      return act(submission ? ACTION.REPLACE_SUBMISSION : ACTION.UPLOAD_SUBMISSION, schedule.submissionEndsAt);
    }
    if (now < schedule.submissionStartsAt) return act(ACTION.SUBMISSION_NOT_OPEN, schedule.submissionStartsAt);
    return submission ? act(ACTION.AWAITING_RESULTS, schedule.resultAt) : act(ACTION.SUBMISSION_MISSED);
  }

  // Someone already holding a seat may finish paying even if the last seat just went to them.
  if (holding && timeline.isRegistrationWindowOpen) return act(ACTION.COMPLETE_PAYMENT, registration.holdExpiresAt);

  if (phase === PHASE.UPCOMING) return act(ACTION.REGISTRATION_NOT_OPEN, schedule.registrationOpensAt);
  if (timeline.isRegistrationWindowOpen) {
    return seatsLeft > 0 ? act(ACTION.REGISTER, schedule.registrationClosesAt) : act(ACTION.SOLD_OUT);
  }
  return act(ACTION.REGISTRATION_CLOSED);
}
