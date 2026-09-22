import { useEffect, useRef, useState } from 'react';
import { splitDuration, type CountdownParts } from '@/lib/format';
import { serverClock } from '@/lib/serverClock';

/** Server-aligned "now", re-rendering every `intervalMs`. */
export function useServerNow(intervalMs = 1000) {
  const [now, setNow] = useState(serverClock.now);
  useEffect(() => {
    const tick = () => setNow(serverClock.now());
    const id = setInterval(tick, intervalMs);
    const unsubscribe = serverClock.subscribe(tick);
    return () => {
      clearInterval(id);
      unsubscribe();
    };
  }, [intervalMs]);
  return now;
}

/**
 * Live countdown to `endsAt`. Calls `onExpire` once when it reaches zero, which the
 * screen uses to refetch: the phase (and the CTA) has just changed on the server.
 */
export function useCountdown(endsAt: string | null | undefined, onExpire?: () => void): CountdownParts | null {
  const now = useServerNow();
  const target = endsAt ? Date.parse(endsAt) : NaN;
  const firedFor = useRef<number | null>(null);
  const remaining = Number.isFinite(target) ? target - now : null;

  useEffect(() => {
    if (remaining !== null && remaining <= 0 && firedFor.current !== target) {
      firedFor.current = target;
      onExpire?.();
    }
  }, [remaining, target, onExpire]);

  return remaining === null ? null : splitDuration(remaining);
}
