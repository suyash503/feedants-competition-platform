import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { FlatList, Pressable, View } from 'react-native';
import type { PreviousWinner } from '@/api/types';
import { AppText, Card, SectionTitle } from '@/components/ui';
import { useI18n } from '@/i18n';
import { colors, radius, spacing } from '@/theme';

export function PreviousWinners({ winners, onPlay }: { winners: PreviousWinner[]; onPlay?: (url: string) => void }) {
  const { t } = useI18n();
  if (!winners.length) return null;

  return (
    <Card padded={false} style={{ paddingVertical: spacing.lg }}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <SectionTitle title={t.previousWinners} />
      </View>
      <FlatList
        horizontal
        data={winners}
        keyExtractor={(w, i) => `${w.name}-${i}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}
        renderItem={({ item }) => <WinnerCard winner={item} onPlay={onPlay} />}
      />
    </Card>
  );
}

function WinnerCard({ winner, onPlay }: { winner: PreviousWinner; onPlay?: (url: string) => void }) {
  const { t } = useI18n();
  const playable = !!winner.videoUrl;
  return (
    <Pressable
      disabled={!playable}
      onPress={() => winner.videoUrl && onPlay?.(winner.videoUrl)}
      accessibilityRole={playable ? 'button' : undefined}
      accessibilityLabel={`${winner.name}, ${t.winnerPosition(winner.position)}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: '#F6F8F8',
        borderRadius: radius.sm,
        paddingRight: spacing.lg,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View>
        <Image
          source={winner.avatarUrl}
          style={{ width: 88, height: 88, borderRadius: radius.sm, backgroundColor: colors.surfaceMuted }}
          contentFit="cover"
          transition={200}
        />
        {playable ? (
          <View
            style={{
              position: 'absolute',
              right: 6,
              bottom: 6,
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: colors.primary,
              borderWidth: 2,
              borderColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="play" size={13} color="#FFFFFF" style={{ marginLeft: 2 }} />
          </View>
        ) : null}
      </View>
      <View style={{ gap: 4 }}>
        <AppText variant="label" weight="medium" color={colors.text}>
          {winner.name}
        </AppText>
        <AppText variant="caption" color={colors.primaryText}>
          {t.winnerPosition(winner.position)}
        </AppText>
      </View>
    </Pressable>
  );
}
