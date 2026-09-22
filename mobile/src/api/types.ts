import type { Localized } from '@/i18n';

/** Mirrors the backend responses (backend/src/services/competitionService.js). Money is in paise. */

export type Phase =
  | 'draft'
  | 'cancelled'
  | 'upcoming'
  | 'registration_open'
  | 'submission_only'
  | 'judging'
  | 'results_announced';

export type CountdownLabel = 'registration_opens' | 'registration_closes' | 'submission_closes' | 'results_in';

export type Timeline = {
  phase: Phase;
  serverTime: string;
  isRegistrationWindowOpen: boolean;
  isSubmissionWindowOpen: boolean;
  countdown: { label: CountdownLabel; endsAt: string } | null;
};

export type Seats = { total: number; taken: number; left: number };

export type Schedule = {
  registrationOpensAt: string;
  registrationClosesAt: string;
  submissionStartsAt: string;
  submissionEndsAt: string;
  resultAt: string;
};

export type Judge = {
  id: string;
  name: string;
  photoUrl?: string;
  designation: Localized;
  yearsOfExperience?: number;
  introVideoUrl?: string;
  bio?: Localized;
};

export type Reward = { position: number; amount: number };

export type PreviousWinner = {
  name: string;
  avatarUrl?: string;
  videoUrl?: string;
  position: number;
  edition?: string;
};

export type CompetitionSummary = {
  id: string;
  slug: string;
  title: Localized;
  category: string;
  entryFee: number;
  prizePool: number;
  currency: 'INR';
  isMultiWin: boolean;
  certificateForWinners: boolean;
  seats: Seats;
  timeline: Timeline;
};

export type CompetitionDetails = CompetitionSummary & {
  status: 'published' | 'cancelled';
  judge: Judge;
  schedule: Schedule;
  rewards: Reward[];
  content: {
    about: Localized;
    judgingParameters: { title: Localized; description?: Localized; weightPercent?: number }[];
    rules: Localized[];
    eligibility: Localized[];
    disclaimer?: Localized;
  };
  previousWinners: PreviousWinner[];
  referral: { rewardPerSignup: number };
  links: { prizePayoutVideoUrl?: string; refundPolicyUrl?: string };
};

export type Availability = { id: string; seats: Seats; timeline: Timeline };

export type ActionType =
  | 'unavailable'
  | 'cancelled'
  | 'registration_not_open'
  | 'register'
  | 'complete_payment'
  | 'sold_out'
  | 'registration_closed'
  | 'submission_not_open'
  | 'upload_submission'
  | 'replace_submission'
  | 'submission_missed'
  | 'awaiting_results'
  | 'view_results';

export type PaymentOrder = {
  id: string;
  provider: 'mock' | 'razorpay';
  orderId: string;
  amount: number;
  currency: 'INR';
  status: 'created' | 'succeeded' | 'failed' | 'refunded';
};

export type ViewerState = {
  competitionId: string;
  seats: Seats;
  timeline: Timeline;
  action: { type: ActionType; enabled: boolean; at: string | null };
  registration: {
    id: string;
    status: 'initiated' | 'pending_payment' | 'confirmed' | 'expired' | 'cancelled';
    seatHeld: boolean;
    holdExpiresAt: string | null;
    confirmedAt: string | null;
    amount: number;
  } | null;
  pendingPayment: PaymentOrder | null;
  submission: {
    id: string;
    video: { url: string; mimeType?: string; sizeBytes?: number; durationSec?: number };
    status: string;
    revision: number;
    submittedAt: string;
  } | null;
  referral: { code: string; link: string; signups: number; earned: number; rewardPerSignup: number };
};

export type SessionUser = { id: string; name: string; phone: string; referralCode: string };

export type Results = {
  competitionId: string;
  items: { rank: number; name: string; avatarUrl: string | null; score: number | null; prize: number; videoUrl: string }[];
};
