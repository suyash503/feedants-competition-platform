import { Competition, Registration, REGISTRATION_STATUS } from '../models/index.js';

/**
 * Low-level seat accounting. Each function is a single atomic MongoDB operation, which
 * is what makes the counter correct under any amount of concurrency: the capacity check
 * and the increment happen inside the same write, so there is no read-then-write gap
 * for two requests to slip through.
 *
 * Ordering rule (see Registration.js): claim the seat before marking a registration as
 * holding it; un-mark the registration before returning the seat.
 */

/** Take one seat if (and only if) one is free and registration is open at `now`. */
export async function claimSeat(competitionId, now, { enforceWindow = true } = {}) {
  const filter = {
    _id: competitionId,
    status: 'published',
    $expr: { $lt: ['$seats.taken', '$seats.total'] },
  };
  if (enforceWindow) {
    filter['schedule.registrationOpensAt'] = { $lte: now };
    filter['schedule.registrationClosesAt'] = { $gt: now };
  }
  const res = await Competition.updateOne(filter, { $inc: { 'seats.taken': 1 } });
  return res.modifiedCount === 1;
}

export async function returnSeat(competitionId) {
  await Competition.updateOne(
    { _id: competitionId, 'seats.taken': { $gt: 0 } },
    { $inc: { 'seats.taken': -1 } },
  );
}

/**
 * Give up a seat held during checkout. Idempotent: only the call that flips
 * `seatHeld` from true to false returns the seat, so concurrent callers (the user
 * cancelling while the sweeper runs) can never return it twice.
 */
export async function releaseHold(registrationId, { status, now, onlyIfExpired = false }) {
  const filter = { _id: registrationId, status: REGISTRATION_STATUS.PENDING_PAYMENT, seatHeld: true };
  if (onlyIfExpired) filter.holdExpiresAt = { $lte: now };

  const update = { $set: { status, seatHeld: false }, $unset: { holdExpiresAt: 1 } };
  if (status === REGISTRATION_STATUS.CANCELLED) update.$set.cancelledAt = now;

  const registration = await Registration.findOneAndUpdate(filter, update, { new: true });
  if (registration) await returnSeat(registration.competition);
  return registration;
}

/** Background job: free seats whose checkout was abandoned. Safe to run on every instance. */
export async function releaseExpiredHolds(now, batchSize = 200) {
  const expired = await Registration.find({
    status: REGISTRATION_STATUS.PENDING_PAYMENT,
    seatHeld: true,
    holdExpiresAt: { $lte: now },
  })
    .select('_id')
    .limit(batchSize)
    .lean();

  let released = 0;
  for (const { _id } of expired) {
    if (await releaseHold(_id, { status: REGISTRATION_STATUS.EXPIRED, now, onlyIfExpired: true })) released += 1;
  }
  return released;
}

/**
 * Ops/repair tool: recompute `seats.taken` from the registrations that actually hold a
 * seat. Only needed if a process crashed between the two steps of a claim, which can
 * leak (never oversell) a seat. Run it while registration for that competition is quiet.
 */
export async function reconcileSeats(competitionId) {
  const held = await Registration.countDocuments({ competition: competitionId, seatHeld: true });
  await Competition.updateOne({ _id: competitionId }, { $set: { 'seats.taken': held } });
  return held;
}
