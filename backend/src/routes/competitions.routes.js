import { Router } from 'express';
import { z } from 'zod';
import { clock } from '../lib/clock.js';
import { requireAuth } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import {
  findCompetition,
  getResults,
  getViewerState,
  listCompetitions,
  serializeAvailability,
  serializeCompetitionSummary,
  serializeCompetition,
  serializePayment,
} from '../services/competitionService.js';
import { cancelPendingRegistration, startRegistration } from '../services/registrationService.js';
import { upsertSubmission } from '../services/submissionService.js';

export const competitionsRouter = Router();

const params = z.object({ idOrSlug: z.string().trim().min(1).max(100) });

const registerBody = z.object({
  referralCode: z.string().trim().min(4).max(16).optional(),
});

const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const submissionBody = z.object({
  video: z.object({
    url: z.string().url().regex(/^https?:\/\//, 'Must be an http(s) URL'),
    mimeType: z.string().regex(/^video\//, 'Must be a video file').optional(),
    sizeBytes: z.number().int().positive().max(MAX_VIDEO_BYTES, 'Video must be 500 MB or smaller').optional(),
    durationSec: z.number().positive().max(15 * 60, 'Video must be 15 minutes or shorter').optional(),
  }),
});

const listQuery = z.object({ limit: z.coerce.number().int().min(1).max(50).default(20) });

const PHASE_ORDER = ['registration_open', 'upcoming', 'submission_only', 'judging', 'results_announced', 'cancelled'];

// Published competitions: the ones you can still join first, then by deadline.
competitionsRouter.get('/', async (req, res) => {
  const { limit } = listQuery.parse(req.query);
  const now = clock.now();
  const items = (await listCompetitions({ limit }))
    .map((c) => serializeCompetitionSummary(c, now))
    .sort(
      (a, b) =>
        PHASE_ORDER.indexOf(a.timeline.phase) - PHASE_ORDER.indexOf(b.timeline.phase) ||
        (a.timeline.countdown?.endsAt ?? 0) - (b.timeline.countdown?.endsAt ?? 0),
    );
  res.set('Cache-Control', 'public, max-age=15');
  res.json({ items });
});

// Public details. The seat counter changes often, so it may only be cached for a moment.
competitionsRouter.get('/:idOrSlug', validate({ params }), async (req, res) => {
  const competition = await findCompetition(req.params.idOrSlug, { populateJudge: true });
  res.set('Cache-Control', 'public, max-age=5, stale-while-revalidate=30');
  res.json(serializeCompetition(competition, clock.now()));
});

// Lightweight endpoint the app polls for the live seat counter and phase.
competitionsRouter.get('/:idOrSlug/availability', validate({ params }), async (req, res) => {
  const competition = await findCompetition(req.params.idOrSlug);
  res.set('Cache-Control', 'no-store');
  res.json(serializeAvailability(competition, clock.now()));
});

competitionsRouter.get('/:idOrSlug/results', validate({ params }), async (req, res) => {
  const competition = await findCompetition(req.params.idOrSlug);
  res.set('Cache-Control', 'public, max-age=60');
  res.json(await getResults(competition, clock.now()));
});

// Everything specific to the signed-in user: registration, CTA, submission, referral.
competitionsRouter.get('/:idOrSlug/me', requireAuth, validate({ params }), async (req, res) => {
  const competition = await findCompetition(req.params.idOrSlug);
  res.set('Cache-Control', 'private, no-store');
  res.json(await getViewerState(competition, req.user.id, clock.now()));
});

// Start checkout: reserves a seat and returns the payment order (or confirms if free).
competitionsRouter.post(
  '/:idOrSlug/registrations',
  requireAuth,
  writeLimiter,
  validate({ params, body: registerBody }),
  async (req, res) => {
    const now = clock.now();
    const competition = await findCompetition(req.params.idOrSlug);
    const { payment } = await startRegistration({
      competition,
      userId: req.user.id,
      referralCode: req.body.referralCode,
      now,
    });
    const fresh = await findCompetition(competition._id);
    const state = await getViewerState(fresh, req.user.id, now);
    res.status(201).json({ ...state, pendingPayment: serializePayment(payment) ?? state.pendingPayment });
  },
);

// Abandon an unpaid seat hold so someone else can take the seat.
competitionsRouter.delete('/:idOrSlug/registrations/me', requireAuth, validate({ params }), async (req, res) => {
  const now = clock.now();
  const competition = await findCompetition(req.params.idOrSlug);
  await cancelPendingRegistration({ competition, userId: req.user.id, now });
  const fresh = await findCompetition(competition._id);
  res.json(await getViewerState(fresh, req.user.id, now));
});

competitionsRouter.put(
  '/:idOrSlug/submission',
  requireAuth,
  writeLimiter,
  validate({ params, body: submissionBody }),
  async (req, res) => {
    const now = clock.now();
    const competition = await findCompetition(req.params.idOrSlug);
    await upsertSubmission({ competition, userId: req.user.id, video: req.body.video, now });
    res.json(await getViewerState(competition, req.user.id, now));
  },
);
