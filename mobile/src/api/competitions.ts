import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/session/SessionProvider';
import { api } from './client';
import type { Availability, CompetitionDetails, CompetitionSummary, ViewerState } from './types';

export const competitionKeys = {
  list: ['competitions'] as const,
  details: (slug: string) => ['competition', slug] as const,
  availability: (slug: string) => ['competition', slug, 'availability'] as const,
  viewer: (slug: string, userId: string | undefined) => ['competition', slug, 'me', userId] as const,
};

export function useCompetitionList() {
  return useQuery({
    queryKey: competitionKeys.list,
    queryFn: ({ signal }) => api<{ items: CompetitionSummary[] }>('/competitions', { signal }),
    select: (d) => d.items,
  });
}

/** Static-ish content: fetched once, refreshed on pull-to-refresh or focus. */
export function useCompetition(slug: string) {
  return useQuery({
    queryKey: competitionKeys.details(slug),
    queryFn: ({ signal }) => api<CompetitionDetails>(`/competitions/${encodeURIComponent(slug)}`, { signal }),
    staleTime: 60_000,
  });
}

/** Seats + phase, polled so the "spots left" counter stays live while the screen is open. */
export function useAvailability(slug: string, enabled = true) {
  return useQuery({
    queryKey: competitionKeys.availability(slug),
    queryFn: ({ signal }) => api<Availability>(`/competitions/${encodeURIComponent(slug)}/availability`, { signal }),
    refetchInterval: 10_000,
    enabled,
  });
}

/** Everything personal: registration, the CTA to show, referral stats. */
export function useViewerState(slug: string) {
  const { user } = useSession();
  return useQuery({
    queryKey: competitionKeys.viewer(slug, user?.id),
    queryFn: ({ signal }) => api<ViewerState>(`/competitions/${encodeURIComponent(slug)}/me`, { signal }),
    enabled: !!user,
    refetchInterval: 30_000,
  });
}
