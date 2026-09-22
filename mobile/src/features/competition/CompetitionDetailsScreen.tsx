import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '@/api/client';
import { useAvailability, useCompetition, useViewerState } from '@/api/competitions';
import type { Seats, Timeline } from '@/api/types';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StateView } from '@/components/ui';
import { VideoPlayerModal } from '@/components/VideoPlayerModal';
import { useServerNow } from '@/hooks/useCountdown';
import { useLiveAvailability } from '@/hooks/useLiveAvailability';
import { useI18n } from '@/i18n';
import { useSession } from '@/session/SessionProvider';
import { colors, spacing } from '@/theme';
import { ActionBar } from './components/ActionBar';
import { CountdownBanner } from './components/CountdownBanner';
import { DetailsSkeleton } from './components/DetailsSkeleton';
import { DisclaimerBanner } from './components/DisclaimerBanner';
import { ImportantDates } from './components/ImportantDates';
import { InfoTabs } from './components/InfoTabs';
import { JudgeCard } from './components/JudgeCard';
import { AdSlot, TestimonialsRow } from './components/MiscRows';
import { OverviewCard } from './components/OverviewCard';
import { PreviousWinners } from './components/PreviousWinners';
import { ReferralCard } from './components/ReferralCard';
import { RewardsCard } from './components/RewardsCard';
import { TrustRow } from './components/TrustRow';
import { CheckoutSheet } from './checkout/CheckoutSheet';
import { describeAction } from './describeAction';
import { ResultsSheet } from './results/ResultsSheet';
import { UploadSheet } from './submission/UploadSheet';

type Live = { seats: Seats; timeline: Timeline };

/** Seats/phase arrive from three endpoints polled at different rates; show the newest. */
function freshest(...sources: (Live | undefined)[]): Live | undefined {
  return sources
    .filter((s): s is Live => !!s)
    .sort((a, b) => Date.parse(b.timeline.serverTime) - Date.parse(a.timeline.serverTime))[0];
}

export function CompetitionDetailsScreen({ slug }: { slug: string }) {
  const { t, lang, pick } = useI18n();
  const queryClient = useQueryClient();
  const now = useServerNow();

  const details = useCompetition(slug);
  const liveConnected = useLiveAvailability(slug, details.isSuccess);
  const availability = useAvailability(slug, details.isSuccess, liveConnected);
  const viewer = useViewerState(slug);
  const session = useSession();
  const [refreshing, setRefreshing] = useState(false);

  const refetchAll = useCallback(() => queryClient.invalidateQueries({ queryKey: ['competition', slug] }), [queryClient, slug]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchAll();
    setRefreshing(false);
  }, [refetchAll]);

  const [sheet, setSheet] = useState<'checkout' | 'upload' | 'results' | null>(null);
  const [video, setVideo] = useState<{ url: string; title?: string } | null>(null);
  const playVideo = useCallback((url: string, title?: string) => setVideo({ url, title }), []);

  if (details.isPending) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <ScreenHeader />
        <DetailsSkeleton />
      </SafeAreaView>
    );
  }

  if (details.isError) {
    const err = details.error as ApiError;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <ScreenHeader />
        {err.status === 404 ? (
          <StateView icon="search-outline" title={t.notFound} />
        ) : (
          <StateView
            icon={err.isNetwork ? 'cloud-offline-outline' : 'alert-circle-outline'}
            title={t.somethingWrong}
            message={err.isNetwork ? t.offline : err.message}
            actionLabel={t.retry}
            onAction={() => details.refetch()}
          />
        )}
      </SafeAreaView>
    );
  }

  const competition = details.data;
  const live = freshest(competition, availability.data, viewer.data) ?? competition;
  const registration = viewer.data?.registration;
  const holdActive = !!registration?.holdExpiresAt && Date.parse(registration.holdExpiresAt) > now;
  const personalStateFailed = viewer.isError || session.status === 'error';
  const action = viewer.data
    ? describeAction({ ...viewer.data, ...live }, competition, t, lang, now)
    : personalStateFailed
      ? { label: t.somethingWrong, sublabel: t.retry, enabled: true }
      : null;
  const onActionPress = () => {
    if (personalStateFailed) return session.status === 'error' ? session.retry() : viewer.refetch();
    switch (viewer.data?.action.type) {
      case 'register':
      case 'complete_payment':
        return setSheet('checkout');
      case 'upload_submission':
      case 'replace_submission':
        return setSheet('upload');
      case 'view_results':
        return setSheet('results');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScreenHeader />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <OverviewCard
          competition={competition}
          seats={live.seats}
          phase={live.timeline.phase}
          liveConnected={liveConnected}
          registrationStatus={registration?.status}
          holdActive={holdActive}
        />
        <JudgeCard judge={competition.judge} onPlayIntro={(url) => playVideo(url, competition.judge.name)} />
        <CountdownBanner countdown={live.timeline.countdown} seatsLeft={live.seats.left} onExpire={refetchAll} />
        <ImportantDates schedule={competition.schedule} />
        <PreviousWinners winners={competition.previousWinners} onPlay={playVideo} />
        <InfoTabs content={competition.content} />
        <RewardsCard rewards={competition.rewards} />
        <DisclaimerBanner text={competition.content.disclaimer} />
        <TrustRow links={competition.links} onPlay={playVideo} />
        {viewer.data ? <ReferralCard referral={viewer.data.referral} competitionTitle={pick(competition.title)} /> : null}
        <TestimonialsRow />
        <AdSlot />
      </ScrollView>
      <View style={{ borderTopWidth: 1, borderColor: colors.divider }}>
        <ActionBar description={action} onPress={onActionPress} />
      </View>

      {sheet === 'checkout' && viewer.data ? (
        <CheckoutSheet
          slug={slug}
          competition={competition}
          viewer={{ ...viewer.data, ...live }}
          onClose={() => setSheet(null)}
          onUploadNow={() => setSheet('upload')}
        />
      ) : null}
      {sheet === 'upload' && viewer.data ? (
        <UploadSheet slug={slug} viewer={viewer.data} onClose={() => setSheet(null)} onWatch={(url) => playVideo(url)} />
      ) : null}
      {sheet === 'results' ? (
        <ResultsSheet slug={slug} onClose={() => setSheet(null)} onWatch={playVideo} />
      ) : null}
      {video ? <VideoPlayerModal url={video.url} title={video.title} onClose={() => setVideo(null)} /> : null}
    </SafeAreaView>
  );
}
