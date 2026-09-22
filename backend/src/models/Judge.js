import mongoose from 'mongoose';
import { localizedString, mediaUrl } from './shared/schemas.js';

const { Schema } = mongoose;

// Judges get their own collection because one judge can judge many competitions.
const judgeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    photoUrl: mediaUrl(),
    designation: { type: localizedString(), required: true }, // "Professional Kathak Dancer"
    yearsOfExperience: { type: Number, min: 0, max: 80 },
    introVideoUrl: mediaUrl(),
    bio: localizedString({ required: false }),
  },
  { timestamps: true },
);

export const Judge = mongoose.model('Judge', judgeSchema);
