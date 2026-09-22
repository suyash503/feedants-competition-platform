import { env } from '../config/env.js';
import { getTimeline, PHASE } from '../domain/competitionPhase.js';
import { AppError, badRequest, conflict, isDuplicateKeyError, notFound } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import {
  Competition,
  Payment,
  PAYMENT_STATUS,
  Registration,
  REGISTRATION_STATUS,
  User,
} from '../models/index.js';
import { paymentProvider } from './payments/index.js';
import { claimSeat, releaseHold, returnSeat } from './seats.js';

const CLAIM_LOCK_MS = 15_000;
const { INITIATED, PENDING_PAYMENT, CONFIRMED, EXPIRED, CANCELLED } = REGISTRATION_STATUS;

function assertRegistrationOpen(competition, now) {
  const timeline = getTimeline(competition, now);
  if (timeline.isRegistrationWindowOpen) return;
  if (timeline.phase === PHASE.UPCOMING) throw conflict('REGISTRATION_NOT_OPEN', 'Registration has not opened yet');
  if (timeline.phase === PHASE.CANCELLED) throw conflict('COMPETITION_CANCELLED', 'This competition was cancelled');
  throw conflict('REGISTRATION_CLOSED', 'Registration for this competition has closed');
}

async function resolveReferrer(referralCode, userId) {
  if (!referralCode) return undefined;
  const referrer = await User.findOne({ referralCode: referralCode.trim().toUpperCase() }).select('_id').lean();
  if (!referrer) throw badRequest('INVALID_REFERRAL_CODE', 'This referral code does not exist');
  if (String(referrer._id) === String(userId)) {
    throw badRequest('SELF_REFERRAL', 'You cannot use your own referral code');
  }
  return referrer._id;
}

/** Create (or reuse) the payment order for the current hold. Idempotent per hold. */
async function getOrCreateOrder(registration, competition) {
  const idempotencyKey = `${registration._id}:hold-${registration.holdCount}`;
  const existing = await Payment.findOne({ idempotencyKey }).lean();
  if (existing) return existing;

  const order = await paymentProvider.createOrder({
    amount: registration.amount,
    currency: competition.currency,
    receipt: String(registration._id),
  });
  try {
    const payment = await Payment.create({
      registration: registration._id,
      user: registration.user,
      competition: competition._id,
      amount: registration.amount,
      currency: competition.currency,
      provider: paymentProvider.name,
      providerOrderId: order.orderId,
      idempotencyKey,
    });
    return payment.toObject();
  } catch (err) {
    // Another request for the same hold created it first; use theirs.
    if (isDuplicateKeyError(err)) return Payment.findOne({ idempotencyKey }).lean();
    throw err;
  }
}

/**
 * Start checkout: reserve a seat for `userId` and return the payment order to pay.
 *
 * Safe under concurrency:
 *  - many users racing for the last seat: `claimSeat` is one guarded atomic update;
 *  - the same user double-tapping: a unique (competition, user) index plus a short
 *    claim lock means only one of their requests can take a seat;
 *  - retries after success return the existing hold/order instead of a new one.
 */
export async function startRegistration({ competition, userId, referralCode, now }) {
  assertRegistrationOpen(competition, now);
  const referredBy = await resolveReferrer(referralCode, userId);

  // Make sure a registration document exists (the unique index turns concurrent inserts into one).
  try {
    await Registration.updateOne(
      { competition: competition._id, user: userId },
      { $setOnInsert: { status: INITIATED, amount: competition.entryFee } },
      { upsert: true },
    );
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err;
  }

  let registration = await Registration.findOne({ competition: competition._id, user: userId }).lean();

  // Tidy up a hold that has run out but hasn't been swept yet, so the user can start over.
  if (registration.status === PENDING_PAYMENT && registration.seatHeld && registration.holdExpiresAt <= now) {
    await releaseHold(registration._id, { status: EXPIRED, now, onlyIfExpired: true });
    registration = await Registration.findById(registration._id).lean();
  }

  const resume = async (reg) => {
    if (reg.status === CONFIRMED) throw conflict('ALREADY_REGISTERED', 'You are already registered');
    if (reg.status === PENDING_PAYMENT && reg.seatHeld) {
      return { registration: reg, payment: await getOrCreateOrder(reg, competition) };
    }
    return null;
  };

  const resumed = await resume(registration);
  if (resumed) return resumed;

  // Per-user claim lock: only one in-flight request per user may try to take a seat.
  const lockUntil = new Date(now.getTime() + CLAIM_LOCK_MS);
  const locked = await Registration.findOneAndUpdate(
    {
      _id: registration._id,
      seatHeld: false,
      status: { $in: [INITIATED, EXPIRED, CANCELLED] },
      $or: [{ claimLockedUntil: null }, { claimLockedUntil: { $lte: now } }],
    },
    { $set: { claimLockedUntil: lockUntil } },
    { new: true, lean: true },
  );
  if (!locked) {
    const latest = await Registration.findById(registration._id).lean();
    const again = await resume(latest);
    if (again) return again;
    throw conflict('REGISTRATION_IN_PROGRESS', 'Your registration is already being processed, please retry');
  }

  const gotSeat = await claimSeat(competition._id, now);
  if (!gotSeat) {
    await Registration.updateOne({ _id: locked._id, claimLockedUntil: lockUntil }, { $unset: { claimLockedUntil: 1 } });
    const fresh = await Competition.findById(competition._id).lean();
    assertRegistrationOpen(fresh, now);
    throw conflict('SOLD_OUT', 'All spots for this competition have been taken');
  }

  const isFree = competition.entryFee === 0;
  const set = {
    seatHeld: true,
    amount: competition.entryFee,
    status: isFree ? CONFIRMED : PENDING_PAYMENT,
    ...(referredBy && { referredBy }),
    ...(isFree
      ? { confirmedAt: now }
      : { holdExpiresAt: new Date(now.getTime() + env.seatHoldMinutes * 60_000) }),
  };
  const held = await Registration.findOneAndUpdate(
    { _id: locked._id, claimLockedUntil: lockUntil },
    { $set: set, $inc: { holdCount: 1 }, $unset: { claimLockedUntil: 1, ...(isFree && { holdExpiresAt: 1 }) } },
    { new: true, lean: true },
  );
  if (!held) {
    // We were too slow and our lock expired; someone else may now own the claim. Give the seat back.
    await returnSeat(competition._id);
    throw conflict('REGISTRATION_IN_PROGRESS', 'Registration took too long, please retry');
  }

  if (isFree) return { registration: held, payment: null };
  return { registration: held, payment: await getOrCreateOrder(held, competition) };
}

/** Let go of an unpaid seat. Confirmed (paid) entries are handled by the refund policy, not here. */
export async function cancelPendingRegistration({ competition, userId, now }) {
  const registration = await Registration.findOne({ competition: competition._id, user: userId }).lean();
  if (!registration) throw notFound('Registration');
  if (registration.status === CONFIRMED) {
    throw conflict('CANCELLATION_NOT_ALLOWED', 'Paid registrations can only be cancelled through the refund policy');
  }
  await releaseHold(registration._id, { status: CANCELLED, now });
}

async function refundPayment(payment, reason) {
  // Flip the status first so that concurrent callers issue the provider refund only once.
  const res = await Payment.updateOne(
    { _id: payment._id, status: PAYMENT_STATUS.SUCCEEDED },
    { $set: { status: PAYMENT_STATUS.REFUNDED, failureReason: reason } },
  );
  if (res.modifiedCount !== 1) return;
  const refund = await paymentProvider.refund({ paymentId: payment.providerPaymentId });
  logger.warn({ paymentId: payment._id, refundId: refund.refundId, reason }, 'payment refunded');
}

const seatLost = () =>
  new AppError(409, 'SEAT_LOST_REFUNDED', 'Your seat hold expired and the spots filled up. The payment was refunded');

/**
 * Confirm a registration after the gateway says the user paid. Idempotent: any number
 * of identical (even simultaneous) verifications converge on the same confirmed state,
 * because every step below is a conditional update that is safe to repeat.
 */
export async function verifyPayment({ userId, orderId, paymentId, signature, now }) {
  const found = await Payment.findOne({ provider: paymentProvider.name, providerOrderId: orderId }).lean();
  if (!found || String(found.user) !== String(userId)) throw notFound('Payment');

  if (!paymentProvider.verifySignature({ orderId, paymentId, signature })) {
    throw badRequest('INVALID_PAYMENT_SIGNATURE', 'Payment could not be verified');
  }

  // Record the success (only the first caller changes anything), then read the result.
  await Payment.updateOne(
    { _id: found._id, status: PAYMENT_STATUS.CREATED },
    { $set: { status: PAYMENT_STATUS.SUCCEEDED, providerPaymentId: paymentId } },
  );
  const payment = await Payment.findById(found._id).lean();
  if (payment.providerPaymentId !== paymentId) {
    throw conflict('PAYMENT_ALREADY_PROCESSED', 'This order has already been processed');
  }
  if (payment.status === PAYMENT_STATUS.REFUNDED) throw seatLost();

  const confirmSet = { status: CONFIRMED, confirmedAt: now, payment: payment._id };

  // Normal path: the seat is still held for this user.
  const confirmed = await Registration.findOneAndUpdate(
    { _id: payment.registration, status: PENDING_PAYMENT, seatHeld: true },
    { $set: confirmSet, $unset: { holdExpiresAt: 1 } },
    { new: true, lean: true },
  );
  if (confirmed) return confirmed;

  const current = await Registration.findById(payment.registration).lean();
  if (current.status === CONFIRMED) {
    // Confirmed by this same payment (a concurrent/retried verify): nothing more to do.
    if (String(current.payment) === String(payment._id)) return current;
    // Confirmed by a different payment (user paid twice): keep the first, refund this one.
    await refundPayment(payment, 'duplicate_payment');
    return current;
  }

  // The hold expired and was released before the payment arrived. They did pay while
  // holding, so try to give them a seat again, capacity permitting.
  if (await claimSeat(payment.competition, now, { enforceWindow: false })) {
    const reclaimed = await Registration.findOneAndUpdate(
      { _id: current._id, seatHeld: false, status: { $ne: CONFIRMED } },
      { $set: { ...confirmSet, seatHeld: true }, $unset: { holdExpiresAt: 1, claimLockedUntil: 1 } },
      { new: true, lean: true },
    );
    if (reclaimed) return reclaimed;
    await returnSeat(payment.competition);
    return Registration.findById(current._id).lean();
  }

  await refundPayment(payment, 'seat_unavailable_after_hold_expired');
  throw seatLost();
}
