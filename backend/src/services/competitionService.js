import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { getTimeline } from '../domain/competitionPhase.js';
import { getViewerAction } from '../domain/viewerAction.js';
import { notFound } from '../lib/errors.js';
import { Competition, Payment, Registration, Submission, User, PAYMENT_STATUS } from '../models/index.js';

/** Accepts either a Mongo id or a slug, so links can be human readable. */
export async function findCompetition(idOrSlug, { populateJudge = false } = {}) {
  const filter = mongoose.isValidObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: String(idOrSlug).toLowerCase() };
  let query = Competition.findOne({ ...filter, status: { $ne: 'draft' } }).lean();
  if (populateJudge) query = query.populate('judge', '-__v -createdAt -updatedAt');
  const competition = await query;
  if (!competition) throw notFound('Competition');
  return competition;
}

const seatsOf = (c) => ({
  total: c.seats.total,
  taken: Math.min(c.seats.taken, c.seats.total),
  left: Math.max(0, c.seats.total - c.seats.taken),
});

/** Public, user-independent view. Safe to cache briefly at a CDN. */
export function serializeCompetition(c, now) {
  const judge = c.judge && {
    id: c.judge._id,
    name: c.judge.name,
    photoUrl: c.judge.photoUrl,
    designation: c.judge.designation,
    yearsOfExperience: c.judge.yearsOfExperience,
    introVideoUrl: c.judge.introVideoUrl,
    bio: c.judge.bio,
  };
  return {
    id: c._id,
    slug: c.slug,
    title: c.title,
    category: c.category,
    status: c.status,
    currency: c.currency,
    entryFee: c.entryFee,
    prizePool: c.prizePool,
    certificateForWinners: c.certificateForWinners,
    isMultiWin: c.rewards.length > 1,
    seats: seatsOf(c),
    judge,
    schedule: c.schedule,
    rewards: [...c.rewards].sort((a, b) => a.position - b.position),
    content: c.content,
    previousWinners: [...(c.previousWinners ?? [])].sort((a, b) => a.position - b.position),
    referral: { rewardPerSignup: c.referral?.rewardPerSignup ?? 0 },
    links: c.links ?? {},
    timeline: getTimeline(c, now),
  };
}

/** The cheap, frequently-polled part: seat counter + phase. */
export function serializeAvailability(c, now) {
  return { id: c._id, seats: seatsOf(c), timeline: getTimeline(c, now) };
}

export function serializePayment(p) {
  return p && {
    id: p._id,
    provider: p.provider,
    orderId: p.providerOrderId,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
  };
}

/** Everything that depends on who is looking: registration, submission, CTA, referral. */
export async function getViewerState(competition, userId, now) {
  const [registration, submission, user, referralSignups] = await Promise.all([
    Registration.findOne({ competition: competition._id, user: userId }).lean(),
    Submission.findOne({ competition: competition._id, user: userId }).lean(),
    User.findById(userId).select('referralCode').lean(),
    Registration.countDocuments({ competition: competition._id, referredBy: userId, status: 'confirmed' }),
  ]);
  if (!user) throw notFound('User');

  const timeline = getTimeline(competition, now);
  const seats = seatsOf(competition);
  const action = getViewerAction({
    timeline,
    schedule: competition.schedule,
    seatsLeft: seats.left,
    registration,
    submission,
    now,
  });

  let pendingPayment = null;
  if (action.type === 'complete_payment') {
    pendingPayment = await Payment.findOne({
      registration: registration._id,
      status: PAYMENT_STATUS.CREATED,
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  const rewardPerSignup = competition.referral?.rewardPerSignup ?? 0;
  return {
    competitionId: competition._id,
    seats,
    timeline,
    action,
    registration: registration && {
      id: registration._id,
      status: registration.status,
      seatHeld: registration.seatHeld,
      holdExpiresAt: registration.holdExpiresAt ?? null,
      confirmedAt: registration.confirmedAt ?? null,
      amount: registration.amount,
    },
    pendingPayment: serializePayment(pendingPayment),
    submission: submission && {
      id: submission._id,
      video: submission.video,
      status: submission.status,
      revision: submission.revision,
      submittedAt: submission.submittedAt,
    },
    referral: {
      code: user.referralCode,
      link: `${env.referralBaseUrl}${user.referralCode}`,
      signups: referralSignups,
      earned: referralSignups * rewardPerSignup,
      rewardPerSignup,
    },
  };
}
