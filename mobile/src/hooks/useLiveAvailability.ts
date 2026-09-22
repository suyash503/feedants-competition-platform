import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import EventSource from 'react-native-sse';
import { API_URL } from '@/api/client';
import { competitionKeys } from '@/api/competitions';
import type { Availability } from '@/api/types';

/**
 * Subscribes to the server's live seat counter (Server-Sent Events) and writes each update
 * into the same React Query cache entry the screen already reads, so nothing else changes.
 * Returns whether the stream is connected; while it is, polling slows to a safety net.
 * The stream is closed while the app is in the background.
 */
export function useLiveAvailability(slug: string, enabled: boolean) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!enabled || !foreground) return;
    const es = new EventSource<'availability'>(`${API_URL}/competitions/${encodeURIComponent(slug)}/live`, {
      pollingInterval: 3000, // reconnect delay after a dropped stream
    });
    es.addEventListener('open', () => setConnected(true));
    es.addEventListener('error', (event) => {
      setConnected(false);
      // 4xx won't fix itself by retrying (e.g. an older server without /live): stop and
      // rely on polling instead of reconnecting every few seconds forever.
      const status = 'xhrStatus' in event ? event.xhrStatus : 0;
      if (status >= 400 && status < 500) es.close();
    });
    es.addEventListener('availability', (event) => {
      if (!event.data) return;
      queryClient.setQueryData<Availability>(competitionKeys.availability(slug), JSON.parse(event.data));
    });
    return () => {
      es.removeAllEventListeners();
      es.close();
      setConnected(false);
    };
  }, [slug, enabled, foreground, queryClient]);

  return connected;
}
