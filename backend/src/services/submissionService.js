import { getTimeline } from '../domain/competitionPhase.js';
import { conflict, forbidden, isDuplicateKeyError } from '../lib/errors.js';
import { Registration, REGISTRATION_STATUS, Submission } from '../models/index.js';

/**
 * Create or replace the user's entry video. Only confirmed (paid) participants may
 * submit, and only inside the submission window. Replacing bumps `revision`.
 */
export async function upsertSubmission({ competition, userId, video, now }) {
  const registration = await Registration.findOne({
    competition: competition._id,
    user: userId,
    status: REGISTRATION_STATUS.CONFIRMED,
  })
    .select('_id')
    .lean();
  if (!registration) throw forbidden('NOT_REGISTERED', 'Only registered participants can submit');

  const { isSubmissionWindowOpen } = getTimeline(competition, now);
  if (!isSubmissionWindowOpen) {
    const early = now < competition.schedule.submissionStartsAt;
    throw conflict(
      early ? 'SUBMISSION_NOT_OPEN' : 'SUBMISSION_CLOSED',
      early ? 'Submissions have not opened yet' : 'The submission window has closed',
    );
  }

  const write = () =>
    Submission.findOneAndUpdate(
      { competition: competition._id, user: userId },
      {
        $set: { registration: registration._id, video, status: 'submitted', submittedAt: now },
        $inc: { revision: 1 },
      },
      { upsert: true, new: true, lean: true },
    );

  try {
    return await write();
  } catch (err) {
    // Two first-time uploads raced on the upsert; the loser retries as an update.
    if (isDuplicateKeyError(err)) return write();
    throw err;
  }
}
