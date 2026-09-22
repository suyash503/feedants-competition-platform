import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useWindowDimensions, View } from 'react-native';
import type { Timeline } from '@/api/types';
import { AppText, Card } from '@/components/ui';
import { useCountdown } from '@/hooks/useCountdown';
import { useI18n } from '@/i18n';
import { formatCountdown } from '@/lib/format';
import { colors, spacing } from '@/theme';

const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

/** Live countdown to the next deadline, aligned to server time. Hidden once results are out. */
export function CountdownBanner({
  countdown,
  seatsLeft,
  onExpire,
}: {
  countdown: Timeline['countdown'];
  seatsLeft: number;
  onExpire?: () => void;
}) {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const parts = useCountdown(countdown?.endsAt, onExpire);
  if (!countdown || !parts) return null;

  const urgent = countdown.label === 'registration_closes' && seatsLeft > 0 && parts.totalMs < THREE_DAYS;
  const compact = width < 400; // small phones: keep the "hurry" icon, drop its text

  return (
    <Card
      tone="tint"
      accessibilityRole="timer"
      accessibilityLabel={`${t.countdown[countdown.label]} ${formatCountdown(parts)}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md }}
    >
      <MaterialCommunityIcons name="timer-sand" size={22} color={colors.primaryText} />
      {/* The label may wrap; the time never truncates. */}
      <AppText variant="label" weight="medium" color={colors.text} style={{ flex: 1 }}>
        {t.countdown[countdown.label]}
      </AppText>
      <AppText variant="heading" color={colors.primaryText} style={{ fontSize: 17, fontVariant: ['tabular-nums'] }}>
        {formatCountdown(parts)}
      </AppText>
      {urgent ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
          <Ionicons name="timer-outline" size={18} color={colors.primaryText} />
          {compact ? null : (
            <AppText variant="label" weight="semibold" color={colors.primaryText}>
              {t.hurryUp}
            </AppText>
          )}
        </View>
      ) : null}
    </Card>
  );
}
