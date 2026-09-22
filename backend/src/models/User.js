import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { SUPPORTED_LANGUAGES, mediaUrl } from './shared/schemas.js';

const { Schema } = mongoose;

// No 0/O/1/I so codes are easy to read aloud and type.
const REFERRAL_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateReferralCode(length = 8) {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (b) => REFERRAL_ALPHABET[b % REFERRAL_ALPHABET.length]).join('');
}

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, trim: true, match: [/^\+?[0-9]{10,15}$/, 'Invalid phone number'] },
    email: { type: String, trim: true, lowercase: true, match: [/^\S+@\S+\.\S+$/, 'Invalid email'] },
    avatarUrl: mediaUrl(),
    preferredLanguage: { type: String, enum: SUPPORTED_LANGUAGES, default: 'en' },
    referralCode: { type: String, default: () => generateReferralCode(), immutable: true },
  },
  { timestamps: true },
);

// Sparse-unique: a user may sign up with only a phone or only an email.
userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ referralCode: 1 }, { unique: true });

export const User = mongoose.model('User', userSchema);
