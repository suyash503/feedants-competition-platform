import { Router } from 'express';
import { z } from 'zod';
import { clock } from '../lib/clock.js';
import { requireAuth } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { findCompetition, getViewerState } from '../services/competitionService.js';
import { paymentProvider } from '../services/payments/index.js';
import { verifyPayment } from '../services/registrationService.js';

export const paymentsRouter = Router();

const verifyBody = z.object({
  orderId: z.string().min(1).max(100),
  paymentId: z.string().min(1).max(100),
  signature: z.string().regex(/^[a-f0-9]{64}$/i, 'Invalid signature format'),
});

// Called by the app with what the payment SDK returned. Idempotent.
paymentsRouter.post('/verify', requireAuth, writeLimiter, validate({ body: verifyBody }), async (req, res) => {
  const now = clock.now();
  const registration = await verifyPayment({ userId: req.user.id, ...req.body, now });
  const competition = await findCompetition(registration.competition);
  res.json(await getViewerState(competition, req.user.id, now));
});

/**
 * Mock gateway checkout: plays the role of the Razorpay SDK sheet. The app calls this
 * instead of opening a real payment UI, choosing whether the payment succeeds.
 * Only mounted when PAYMENT_PROVIDER=mock.
 */
export const mockGatewayRouter = Router();

if (paymentProvider.name === 'mock') {
  const checkoutBody = z.object({
    orderId: z.string().min(1).max(100),
    outcome: z.enum(['success', 'failure']).default('success'),
  });
  mockGatewayRouter.post('/checkout', requireAuth, validate({ body: checkoutBody }), (req, res) => {
    const result = paymentProvider.simulateCheckout(req.body);
    res.status(result.ok ? 200 : 402).json(result);
  });
}
