import mongoose from 'mongoose';
import { paise } from './shared/schemas.js';

const { Schema } = mongoose;

/**
 * Lifecycle of one user's entry into one competition:
 *
 *   PENDING_PAYMENT --pay ok--> CONFIRMED
 *        |                          |
 *        +--hold expires--> EXPIRED  +--user/admin cancels--> CANCELLED
 *        +--pay failed----> (stays PENDING until retry or expiry)
 *
 * A seat is reserved the moment checkout starts (PENDING_PAYMENT) so two people can
 * never pay for the same last seat. `seatHeld` records whether this document currently
 * owns one of `competition.seats.taken`, which makes releasing a seat idempotent.
 */
export const REGISTRATION_STATUS = Object.freeze({
  PENDING_PAYMENT: 'pending_payment',
  CONFIRMED: 'confirmed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
});

const registrationSchema = new Schema(
  {
    competition: { type: Schema.Types.ObjectId, ref: 'Competition', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: Object.values(REGISTRATION_STATUS),
      default: REGISTRATION_STATUS.PENDING_PAYMENT,
    },
    seatHeld: { type: Boolean, default: false },
    holdExpiresAt: { type: Date }, // only meaningful while PENDING_PAYMENT

    // Snapshot of the fee at checkout, so later price edits don't change what this user owes.
    amount: paise({ required: true }),
    payment: { type: Schema.Types.ObjectId, ref: 'Payment' },
    referredBy: { type: Schema.Types.ObjectId, ref: 'User' },

    confirmedAt: Date,
    cancelledAt: Date,
  },
  { timestamps: true },
);

// One registration per user per competition. This unique index is what stops
// double-taps and parallel requests from creating duplicate entries. A user who
// cancels and comes back re-activates the same document.
registrationSchema.index({ competition: 1, user: 1 }, { unique: true });
// For the background job that releases seats whose checkout was abandoned.
registrationSchema.index(
  { holdExpiresAt: 1 },
  { partialFilterExpression: { status: REGISTRATION_STATUS.PENDING_PAYMENT } },
);
// "My competitions" screen.
registrationSchema.index({ user: 1, status: 1, createdAt: -1 });
// Referral earnings lookup.
registrationSchema.index(
  { referredBy: 1, status: 1 },
  { partialFilterExpression: { referredBy: { $exists: true } } },
);

export const Registration = mongoose.model('Registration', registrationSchema);
