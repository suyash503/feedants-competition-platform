import { env } from '../../config/env.js';
import { createMockProvider } from './mockProvider.js';

function createProvider() {
  switch (env.paymentProvider) {
    case 'mock':
      return createMockProvider({ secret: env.paymentMockSecret });
    default:
      throw new Error(`Unsupported PAYMENT_PROVIDER: ${env.paymentProvider}`);
  }
}

export const paymentProvider = createProvider();
