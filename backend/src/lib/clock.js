/**
 * Single source of "now" for business logic. Every time-based decision goes through
 * here so tests can move time forward (e.g. to expire a seat hold) without sleeping.
 */
let offsetMs = 0;

export const clock = {
  now: () => new Date(Date.now() + offsetMs),
  /** Test helper: shift the clock by `ms`. */
  advance: (ms) => {
    offsetMs += ms;
  },
  reset: () => {
    offsetMs = 0;
  },
};
