import mongoose from 'mongoose';

const { Schema } = mongoose;

export const SUPPORTED_LANGUAGES = ['en', 'hi'];

/**
 * Text shown to users in more than one language (the design has an ENG / हिंदी toggle).
 * English is required and acts as the fallback when a translation is missing.
 */
export const localizedString = (opts = {}) =>
  new Schema(
    {
      en: { type: String, trim: true, required: opts.required ?? true },
      hi: { type: String, trim: true },
    },
    { _id: false },
  );

/**
 * All money is stored as an integer number of paise (₹1 = 100 paise) so we never
 * do floating-point arithmetic on currency.
 */
export const paise = (extra = {}) => ({
  type: Number,
  min: 0,
  validate: { validator: Number.isInteger, message: '{PATH} must be an integer amount in paise' },
  ...extra,
});

export const mediaUrl = (extra = {}) => ({
  type: String,
  trim: true,
  match: [/^https?:\/\/\S+$/i, '{PATH} must be an http(s) URL'],
  ...extra,
});
