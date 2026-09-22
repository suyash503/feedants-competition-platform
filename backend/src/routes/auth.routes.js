import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { signToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { User } from '../models/index.js';

export const authRouter = Router();

/**
 * Development sign-in: phone number in, JWT out (creating the user on first use).
 * Stands in for a real OTP flow, which is outside the scope of this module.
 */
if (env.enableDevLogin) {
  const body = z.object({
    phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/, 'Enter a valid phone number'),
    name: z.string().trim().min(1).max(80).optional(),
  });

  authRouter.post('/dev-login', validate({ body }), async (req, res) => {
    const { phone, name } = req.body;
    const user = await User.findOneAndUpdate(
      { phone },
      { $setOnInsert: { phone, name: name ?? 'Feedants User' } },
      { upsert: true, new: true, setDefaultsOnInsert: true, lean: true },
    );
    res.json({
      token: signToken(user._id),
      user: { id: user._id, name: user.name, phone: user.phone, referralCode: user.referralCode },
    });
  });
}
