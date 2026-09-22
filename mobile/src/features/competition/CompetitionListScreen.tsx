import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ApiError } from '@/api/client';
import { useCompetitionList } from '@/api/competitions';
import type { CompetitionSummary, Phase } from '@/api/types';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AppText, Card, Chip, ProgressBar, Skeleton, StateView } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { colors, spacing } from '@/theme';

const PHASE_TONE: Record<Phase, 'teal' | 'warning' | 'neutral' | 'danger' | 'success'> = {
  registration_open: 'teal',
  upcoming: 'warning',
  submission_only: 'neutral',
  judging: 'neutral',
  results_announced: 'success',
  cancelled: 'danger',
  draft: 'neutral',
};

export function CompetitionListScreen() {
  const { t } = useI18n();
  const list = useCompetitionList();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScreenHeader showBack={false} title={t.competitions} />
      {list.isPending ? (
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={130} />
          ))}
        </View>
      ) : list.isError ? (
        <StateView
          icon="cloud-offline-outline"
          title={t.somethingWrong}
          message={(list.error as ApiError).isNetwork ? t.offline : list.error.message}
          actionLabel={t.retry}
          onAction={() => list.refetch()}
        />
      ) : (
        <FlatList
          data={list.data}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, gap: spacing.md }}
          ListHeaderComponent={<AppText variant="body" style={{ marginBottom: spacing.xs }}>{t.competitionsSub}</AppText>}
          refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={list.refetch} tintColor={colors.primary} />}
          renderItem={({ item }) => <CompetitionCard competition={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function CompetitionCard({ competition: c }: { competition: CompetitionSummary }) {
  const { t, pick } = useI18n();
  const soldOut = c.timeline.phase === 'registration_open' && c.seats.left === 0;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/competitions/[slug]', params: { slug: c.slug } })}
      accessibilityRole="button"
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <Card style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <AppText variant="heading" style={{ flex: 1, fontSize: 18 }}>
            {pick(c.title)}
          </AppText>
          {soldOut ? (
            <Chip label={t.soldOut} tone="danger" />
          ) : (
            <Chip label={t.phase[c.timeline.phase]} tone={PHASE_TONE[c.timeline.phase]} />
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.lg }}>
          <View>
            <AppText variant="caption">{t.prizePool}</AppText>
            <AppText variant="heading" color={colors.primaryText} style={{ fontSize: 20 }}>
              {formatMoney(c.prizePool)}
            </AppText>
          </View>
          <View>
            <AppText variant="caption">{t.entryFee}</AppText>
            <AppText variant="heading" style={{ fontSize: 20 }}>
              {c.entryFee ? formatMoney(c.entryFee) : t.free}
            </AppText>
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <AppText variant="caption" align="right">
              {t.booked(c.seats.taken, c.seats.total)}
            </AppText>
            <ProgressBar value={c.seats.taken / c.seats.total} />
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </View>
      </Card>
    </Pressable>
  );
}
