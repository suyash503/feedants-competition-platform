import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/session/SessionProvider';
import { api } from './client';
import { competitionKeys } from './competitions';
import type { ViewerState } from './types';
import type { UploadedVideo } from './upload';

/**
 * Every write returns the full, fresh ViewerState, so the screen updates from the
 * server's answer (no optimistic guessing about seats or state), and the public
 * seat counter is refetched for everyone else's view.
 */
export function useCompetitionActions(slug: string) {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const path = `/competitions/${encodeURIComponent(slug)}`;

  const apply = (state: ViewerState) => {
    queryClient.setQueryData(competitionKeys.viewer(slug, user?.id), state);
    queryClient.invalidateQueries({ queryKey: competitionKeys.availability(slug) });
    queryClient.invalidateQueries({ queryKey: competitionKeys.list });
  };
  // After a failure, the truth on the server may have moved (e.g. sold out): resync.
  const resync = () => queryClient.invalidateQueries({ queryKey: ['competition', slug] });

  const register = useMutation({
    mutationFn: (referralCode?: string) =>
      api<ViewerState>(`${path}/registrations`, { method: 'POST', body: referralCode ? { referralCode } : {} }),
    onSuccess: apply,
    onError: resync,
  });

  const releaseSeat = useMutation({
    mutationFn: () => api<ViewerState>(`${path}/registrations/me`, { method: 'DELETE' }),
    onSuccess: apply,
    onError: resync,
  });

  /** Runs the mock gateway checkout ("the SDK"), then has the server verify the signature. */
  const pay = useMutation({
    mutationFn: async ({ orderId, outcome }: { orderId: string; outcome: 'success' | 'failure' }) => {
      const checkout = await api<{ ok: true; orderId: string; paymentId: string; signature: string }>(
        '/mock-gateway/checkout',
        { method: 'POST', body: { orderId, outcome } },
      );
      return api<ViewerState>('/payments/verify', {
        method: 'POST',
        body: { orderId: checkout.orderId, paymentId: checkout.paymentId, signature: checkout.signature },
      });
    },
    onSuccess: apply,
    onError: resync,
  });

  const submit = useMutation({
    mutationFn: ({ video, durationSec }: { video: UploadedVideo; durationSec?: number }) =>
      api<ViewerState>(`${path}/submission`, {
        method: 'PUT',
        body: { video: { ...video, ...(durationSec ? { durationSec } : {}) } },
      }),
    onSuccess: apply,
    onError: resync,
  });

  return { register, releaseSeat, pay, submit };
}
