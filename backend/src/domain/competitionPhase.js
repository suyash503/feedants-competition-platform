/**
 * Pure functions that work out where a competition is in its lifecycle at a given
 * moment. Nothing here reads the clock itself: callers pass `now` (the server time),
 * which keeps this deterministic and easy to test.
 */

export const PHASE = Object.freeze({
  DRAFT: 'draft',
  CANCELLED: 'cancelled',
  UPCOMING: 'upcoming', // registration not open yet
  REGISTRATION_OPEN: 'registration_open',
  SUBMISSION_ONLY: 'submission_only', // registration closed, registered users can still submit
  JUDGING: 'judging',
  RESULTS_ANNOUNCED: 'results_announced',
});

/**
 * @param {{ status: string, schedule: Record<string, Date> }} competition
 * @param {Date} now
 */
export function getPhase(competition, now) {
  if (competition.status === 'draft') return PHASE.DRAFT;
  if (competition.status === 'cancelled') return PHASE.CANCELLED;

  const s = competition.schedule;
  const t = now.getTime();
  if (t < s.registrationOpensAt.getTime()) return PHASE.UPCOMING;
  if (t < s.registrationClosesAt.getTime()) return PHASE.REGISTRATION_OPEN;
  if (t < s.submissionEndsAt.getTime()) return PHASE.SUBMISSION_ONLY;
  if (t < s.resultAt.getTime()) return PHASE.JUDGING;
  return PHASE.RESULTS_ANNOUNCED;
}

const LIVE_PHASES = new Set([PHASE.UPCOMING, PHASE.REGISTRATION_OPEN, PHASE.SUBMISSION_ONLY]);

/**
 * Everything the API needs to describe "what can happen right now". Registration and
 * submission windows can overlap, so they are reported as separate flags rather than
 * squeezed into the single `phase` value.
 */
export function getTimeline(competition, now) {
  const phase = getPhase(competition, now);
  const s = competition.schedule;
  const t = now.getTime();
  const live = LIVE_PHASES.has(phase);

  const isRegistrationWindowOpen =
    live && t >= s.registrationOpensAt.getTime() && t < s.registrationClosesAt.getTime();
  const isSubmissionWindowOpen =
    live && t >= s.submissionStartsAt.getTime() && t < s.submissionEndsAt.getTime();

  return {
    phase,
    serverTime: now,
    isRegistrationWindowOpen,
    isSubmissionWindowOpen,
    // What the countdown banner should count down to, if anything.
    countdown: nextCountdown(phase, s),
  };
}

function nextCountdown(phase, s) {
  switch (phase) {
    case PHASE.UPCOMING:
      return { label: 'registration_opens', endsAt: s.registrationOpensAt };
    case PHASE.REGISTRATION_OPEN:
      return { label: 'registration_closes', endsAt: s.registrationClosesAt };
    case PHASE.SUBMISSION_ONLY:
      return { label: 'submission_closes', endsAt: s.submissionEndsAt };
    case PHASE.JUDGING:
      return { label: 'results_in', endsAt: s.resultAt };
    default:
      return null;
  }
}
