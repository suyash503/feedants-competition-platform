import mongoose from 'mongoose';
import { paise } from './shared/schemas.js';

const { Schema } = mongoose;

export const PAYMENT_STATUS = Object.freeze({
  CREATED: 'created',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  REFUNDED: 'refunded',
});

// Modelled on a Razorpay order/payment so the mock provider can be swapped for the real one
// without schema changes. One registration may have several attempts (e.g. first one failed).
const paymentSchema = new Schema(
  {
    registration: { type: Schema.Types.ObjectId, ref: 'Registration', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    competition: { type: Schema.Types.ObjectId, ref: 'Competition', required: true },

    amount: paise({ required: true }),
    currency: { type: String, enum: ['INR'], default: 'INR' },
    provider: { type: String, enum: ['mock', 'razorpay'], default: 'mock' },
    providerOrderId: { type: String, required: true },
    providerPaymentId: { type: String },

    status: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.CREATED },
    failureReason: { type: String },

    // Sent by the client with each "pay" request. Retrying the same request (bad network,
    // double tap) returns the original payment instead of charging twice.
    idempotencyKey: { type: String, required: true },
  },
  { timestamps: true },
);

paymentSchema.index({ idempotencyKey: 1 }, { unique: true });
paymentSchema.index({ provider: 1, providerOrderId: 1 }, { unique: true });
paymentSchema.index({ registration: 1, createdAt: -1 });

export const Payment = mongoose.model('Payment', paymentSchema);
