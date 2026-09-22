import crypto from 'node:crypto';

/**
 * A stand-in for Razorpay that follows the same contract:
 *   1. server creates an order              -> createOrder()
 *   2. client pays via the gateway SDK      -> simulateCheckout() (the "SDK", exposed by a dev-only route)
 *   3. client sends back paymentId+signature, server verifies the HMAC -> verifySignature()
 * Replacing it with Razorpay means implementing these three calls with their SDK.
 */
export function createMockProvider({ secret }) {
  const sign = (orderId, paymentId) =>
    crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

  return {
    name: 'mock',

    async createOrder({ amount, currency, receipt }) {
      return { orderId: `order_mock_${crypto.randomBytes(8).toString('hex')}`, amount, currency, receipt };
    },

    /** What the checkout SDK would return to the app after the user pays. */
    simulateCheckout({ orderId, outcome }) {
      if (outcome !== 'success') {
        return { ok: false, error: { code: 'PAYMENT_DECLINED', description: 'Payment declined by bank (simulated)' } };
      }
      const paymentId = `pay_mock_${crypto.randomBytes(8).toString('hex')}`;
      return { ok: true, orderId, paymentId, signature: sign(orderId, paymentId) };
    },

    verifySignature({ orderId, paymentId, signature }) {
      const expected = Buffer.from(sign(orderId, paymentId), 'hex');
      const given = Buffer.from(String(signature), 'hex');
      return given.length === expected.length && crypto.timingSafeEqual(given, expected);
    },

    async refund({ paymentId }) {
      return { refundId: `rfnd_mock_${crypto.randomBytes(6).toString('hex')}`, paymentId };
    },
  };
}
