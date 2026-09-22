/**
 * Keeps the app's idea of "now" aligned with the server. Every API response carries
 * `timeline.serverTime`; we remember the offset so countdowns stay correct even if the
 * phone's clock is wrong (or deliberately changed). The server still enforces every
 * deadline, so this only affects what is displayed.
 */
let offsetMs = 0;
const listeners = new Set<() => void>();

export const serverClock = {
  now: () => Date.now() + offsetMs,
  offset: () => offsetMs,
  sync(serverTime: string | undefined, requestStartedAt: number) {
    if (!serverTime) return;
    const receivedAt = Date.now();
    const midpoint = (requestStartedAt + receivedAt) / 2; // assume symmetric network latency
    const next = Date.parse(serverTime) - midpoint;
    if (Number.isFinite(next) && Math.abs(next - offsetMs) > 250) {
      offsetMs = next;
      listeners.forEach((l) => l());
    }
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
