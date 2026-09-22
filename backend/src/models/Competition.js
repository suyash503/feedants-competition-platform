import mongoose from 'mongoose';
import { localizedString, mediaUrl, paise } from './shared/schemas.js';

const { Schema } = mongoose;

export const COMPETITION_CATEGORIES = ['dance', 'music', 'singing', 'art', 'acting', 'other'];

// Only the admin-controlled part of the lifecycle is stored. The time-based phase
// (registration open, judging, results...) is always derived from `schedule`,
// see src/domain/competitionPhase.js, so it can never go stale.
export const COMPETITION_STATUS = Object.freeze({
  DRAFT: 'draft',
  PUBLISHED: 'published',
  CANCELLED: 'cancelled',
});

const rewardSchema = new Schema(
  {
    position: { type: Number, required: true, min: 1 },
    amount: paise({ required: true }),
  },
  { _id: false },
);

const judgingParameterSchema = new Schema(
  {
    title: { type: localizedString(), required: true },
    description: localizedString({ required: false }),
    weightPercent: { type: Number, min: 0, max: 100 },
  },
  { _id: false },
);

// Winners of earlier editions. Embedded as a snapshot (not references) because it is
// small, bounded, read on every page view, and must not change if a user later edits
// their profile.
const previousWinnerSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, trim: true },
    avatarUrl: mediaUrl(),
    videoUrl: mediaUrl(),
    position: { type: Number, required: true, min: 1 },
    edition: { type: String, trim: true }, // e.g. "July 2026"
  },
  { _id: false },
);

const scheduleSchema = new Schema(
  {
    registrationOpensAt: { type: Date, required: true },
    registrationClosesAt: { type: Date, required: true },
    submissionStartsAt: { type: Date, required: true },
    submissionEndsAt: { type: Date, required: true },
    resultAt: { type: Date, required: true },
  },
  { _id: false },
);

const competitionSchema = new Schema(
  {
    slug: { type: String, required: true, trim: true, lowercase: true, match: /^[a-z0-9-]+$/ },
    title: { type: localizedString(), required: true },
    category: { type: String, enum: COMPETITION_CATEGORIES, required: true },
    status: { type: String, enum: Object.values(COMPETITION_STATUS), default: COMPETITION_STATUS.DRAFT },

    currency: { type: String, enum: ['INR'], default: 'INR' },
    entryFee: paise({ required: true }),
    // Always equal to the sum of `rewards`; recomputed on save, never set by hand.
    prizePool: paise({ default: 0 }),
    rewards: {
      type: [rewardSchema],
      validate: { validator: (v) => v.length > 0, message: 'At least one reward is required' },
    },
    certificateForWinners: { type: Boolean, default: false },

    // `taken` counts confirmed registrations plus seats held during checkout.
    // It is ONLY changed by atomic, guarded $inc updates (see the registration service), never by save().
    seats: {
      total: { type: Number, required: true, min: 1 },
      taken: { type: Number, default: 0, min: 0 },
    },

    judge: { type: Schema.Types.ObjectId, ref: 'Judge', required: true },
    schedule: { type: scheduleSchema, required: true },

    content: {
      about: { type: localizedString(), required: true },
      judgingParameters: [judgingParameterSchema],
      rules: [localizedString()],
      eligibility: [localizedString()],
      disclaimer: localizedString({ required: false }),
    },

    previousWinners: [previousWinnerSchema],

    referral: {
      rewardPerSignup: paise({ default: 0 }),
    },

    links: {
      prizePayoutVideoUrl: mediaUrl(), // "How will you receive prize money?"
      refundPolicyUrl: mediaUrl(),
    },
  },
  {
    timestamps: true,
    // Guards against two admins overwriting each other's edits. Seat counters are
    // updated atomically outside save(), so they are unaffected by this.
    optimisticConcurrency: true,
    toJSON: { virtuals: true },
  },
);

competitionSchema.index({ slug: 1 }, { unique: true });
// "Open competitions, closing soonest first" for the listing / explore screens.
competitionSchema.index({ status: 1, 'schedule.registrationClosesAt': 1 });
competitionSchema.index({ category: 1, status: 1 });

competitionSchema.virtual('seatsLeft').get(function seatsLeft() {
  return Math.max(0, this.seats.total - this.seats.taken);
});

competitionSchema.virtual('isMultiWin').get(function isMultiWin() {
  return (this.rewards?.length ?? 0) > 1;
});

competitionSchema.pre('validate', function validateCompetition(next) {
  // Rewards: positions must be exactly 1..n, and the prize pool is their sum.
  if (this.rewards?.length) {
    const positions = this.rewards.map((r) => r.position).sort((a, b) => a - b);
    const contiguous = positions.every((p, i) => p === i + 1);
    if (!contiguous) {
      this.invalidate('rewards', 'Reward positions must be unique and run 1, 2, 3... without gaps');
    }
    const amounts = [...this.rewards].sort((a, b) => a.position - b.position).map((r) => r.amount);
    if (amounts.some((amt, i) => i > 0 && amt > amounts[i - 1])) {
      this.invalidate('rewards', 'A lower position cannot pay more than a higher one');
    }
    this.prizePool = this.rewards.reduce((sum, r) => sum + r.amount, 0);
  }

  // Schedule must be in a sensible order. Registration and submission windows are
  // allowed to overlap (the design has submissions opening before registration closes).
  const s = this.schedule;
  if (s) {
    const order = [
      ['registrationOpensAt', 'registrationClosesAt'],
      ['submissionStartsAt', 'submissionEndsAt'],
      ['registrationOpensAt', 'submissionStartsAt', true],
      ['registrationClosesAt', 'submissionEndsAt', true],
      ['submissionEndsAt', 'resultAt', true],
    ];
    for (const [earlier, later, allowEqual] of order) {
      if (!s[earlier] || !s[later]) continue;
      const bad = allowEqual ? s[earlier] > s[later] : s[earlier] >= s[later];
      if (bad) this.invalidate(`schedule.${later}`, `${later} must be after ${earlier}`);
    }
  }

  if (this.seats && this.seats.taken > this.seats.total) {
    this.invalidate('seats.total', 'Total seats cannot be lower than seats already taken');
  }

  next();
});

export const Competition = mongoose.model('Competition', competitionSchema);
