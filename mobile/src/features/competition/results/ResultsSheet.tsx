import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useResults } from '@/api/competitions';
import { AppText, BottomSheet, Notice } from '@/components/ui';
import { useI18n } from '@/i18n';
import { errorMessage } from '@/lib/errorMessage';
import { formatMoney } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

const MEDAL = [colors.gold, colors.silver, colors.bronze];

export function ResultsSheet({ slug, onClose, onWatch }: { slug: string; onClose: () => void; onWatch: (url: string, title: string) => void }) {
  const { t } = useI18n();
  const results = useResults(slug, true);

  return (
    <BottomSheet visible title={t.results.title} onClose={onClose}>
      {results.isPending ? (
        <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.xxl }} />
      ) : results.isError ? (
        <Notice text={errorMessage(results.error, t.errors)} />
      ) : results.data.items.length === 0 ? (
        <AppText variant="body" align="center">
          {t.results.empty}
        </AppText>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {results.data.items.map((r) => (
            <Pressable
              key={r.rank}
              onPress={() => onWatch(r.videoUrl, `${t.winnerPosition(r.rank)} · ${r.name}`)}
              accessibilityRole="button"
              accessibilityLabel={`${t.winnerPosition(r.rank)}: ${r.name}, ${formatMoney(r.prize)}`}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                padding: spacing.sm,
                borderRadius: radius.sm,
                backgroundColor: pressed ? colors.surfaceMuted : r.rank <= 3 ? '#F7FAFA' : 'transparent',
              })}
            >
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: MEDAL[r.rank - 1] ?? colors.primaryTint,
                }}
              >
                <AppText variant="label" weight="bold" color={r.rank <= 3 ? '#FFFFFF' : colors.primaryText}>
                  {r.rank}
                </AppText>
              </View>
              <Image source={r.avatarUrl} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceMuted }} />
              <View style={{ flex: 1 }}>
                <AppText variant="subheading" numberOfLines={1}>
                  {r.name}
                </AppText>
                {r.score != null ? <AppText variant="caption">{t.results.score(r.score)}</AppText> : null}
              </View>
              {r.prize ? (
                <AppText variant="heading" color={colors.primaryText}>
                  {formatMoney(r.prize)}
                </AppText>
              ) : null}
              <Ionicons name="play-circle-outline" size={22} color={colors.primaryText} />
            </Pressable>
          ))}
        </View>
      )}
    </BottomSheet>
  );
}
