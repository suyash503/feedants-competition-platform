import { EventEmitter } from 'node:events';

/**
 * Fan-out of live seat counts to Server-Sent Event subscribers.
 *
 * Seat changes are *coalesced*: a burst of 500 registrations in one second triggers one
 * database read per competition per window, no matter how many people are watching, and
 * nothing at all when nobody is watching.
 *
 * Scope: in-process. With several API instances, publish the "changed" signal through
 * Redis pub/sub (or a MongoDB change stream on the competitions collection) so every
 * instance refreshes its own subscribers; the rest of this module stays the same.
 */
const COALESCE_MS = 200;

export function createAvailabilityHub(loadSnapshot) {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(0); // one listener per open connection
  const pending = new Map(); // competitionId -> timeout

  async function flush(id) {
    pending.delete(id);
    if (emitter.listenerCount(id) === 0) return;
    try {
      const snapshot = await loadSnapshot(id);
      if (snapshot) emitter.emit(id, snapshot);
    } catch {
      // A failed refresh is skipped; the next change (or the client's fallback poll) catches up.
    }
  }

  return {
    /** Call after any change to a competition's seat counter. Cheap and non-blocking. */
    notify(competitionId) {
      const id = String(competitionId);
      if (pending.has(id) || emitter.listenerCount(id) === 0) return;
      pending.set(id, setTimeout(() => flush(id), COALESCE_MS).unref());
    },
    subscribe(competitionId, listener) {
      const id = String(competitionId);
      emitter.on(id, listener);
      return () => emitter.off(id, listener);
    },
    subscriberCount(competitionId) {
      return emitter.listenerCount(String(competitionId));
    },
  };
}
