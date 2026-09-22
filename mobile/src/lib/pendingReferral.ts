import { storage } from './storage';

/**
 * A referral code picked up from a link (feedants://r/CODE or https://…/r/CODE) and
 * kept until the user registers, so it survives app restarts in between.
 */
const KEY = 'feedants.pendingReferral';

export const pendingReferral = {
  get: () => storage.get(KEY),
  set: (code: string) => storage.set(KEY, code.trim().toUpperCase()),
  clear: () => storage.remove(KEY),
};
