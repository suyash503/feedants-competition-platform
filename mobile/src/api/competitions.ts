import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/session/SessionProvider';
import { api } from './client';
import type { Availability, CompetitionDetails, CompetitionSummary, Results, ViewerState } from './types';

export const competitionKeys = {
  list: ['competitions'] as const,
  details: (slug: string) => ['competition', slug] as const,
  availability: (slug: string) => ['competition', slug, 'availability'] as const,
  results: (slug: string) => ['competition', slug, 'results'] as const,
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

/**
 * Seats + phase. Normally pushed live over SSE (see useLiveAvailability); polling is the
 * fallback, fast when the stream is down and a slow safety net while it's up.
 */
export function useAvailability(slug: string, enabled = true, liveConnected = false) {
  return useQuery({
    queryKey: competitionKeys.availability(slug),
    queryFn: ({ signal }) => api<Availability>(`/competitions/${encodeURIComponent(slug)}/availability`, { signal }),
    refetchInterval: liveConnected ? 60_000 : 10_000,
    enabled,
  });
}

export function useResults(slug: string, enabled: boolean) {
  return useQuery({
    queryKey: competitionKeys.results(slug),
    queryFn: ({ signal }) => api<Results>(`/competitions/${encodeURIComponent(slug)}/results`, { signal }),
    enabled,
    staleTime: 5 * 60_000,
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
