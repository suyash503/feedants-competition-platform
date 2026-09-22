import mongoose from 'mongoose';
import { mediaUrl } from './shared/schemas.js';

const { Schema } = mongoose;

export const SUBMISSION_STATUS = Object.freeze({
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  SCORED: 'scored',
  DISQUALIFIED: 'disqualified',
});

const submissionSchema = new Schema(
  {
    registration: { type: Schema.Types.ObjectId, ref: 'Registration', required: true },
    competition: { type: Schema.Types.ObjectId, ref: 'Competition', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    video: {
      url: mediaUrl({ required: true }),
      mimeType: { type: String, match: /^video\// },
      sizeBytes: { type: Number, min: 1 },
      durationSec: { type: Number, min: 1 },
    },
    status: { type: String, enum: Object.values(SUBMISSION_STATUS), default: SUBMISSION_STATUS.SUBMITTED },

    // A user may replace their video until the submission window closes.
    revision: { type: Number, min: 1 }, // set via $inc on every upload, starting at 1
    submittedAt: { type: Date, default: Date.now },

    score: { type: Number, min: 0, max: 100 },
    rank: { type: Number, min: 1 },
  },
  { timestamps: true },
);

// One live submission per user per competition (replacing updates this document).
submissionSchema.index({ competition: 1, user: 1 }, { unique: true });
submissionSchema.index({ registration: 1 }, { unique: true });
// Judge's queue and results ordering.
submissionSchema.index({ competition: 1, status: 1, rank: 1 });

export const Submission = mongoose.model('Submission', submissionSchema);
