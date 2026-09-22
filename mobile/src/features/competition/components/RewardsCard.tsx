import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { View } from 'react-native';
import type { Reward } from '@/api/types';
import { AppText, Card, SectionTitle } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

function PositionIcon({ position }: { position: number }) {
  if (position === 1) return <MaterialCommunityIcons name="trophy" size={22} color={colors.gold} />;
  if (position === 2) return <MaterialCommunityIcons name="medal" size={22} color={colors.silver} />;
  if (position === 3) return <MaterialCommunityIcons name="medal" size={22} color={colors.bronze} />;
  return <Ionicons name="star-outline" size={20} color={colors.primaryText} />;
}

export function RewardsCard({ rewards }: { rewards: Reward[] }) {
  const { t } = useI18n();
  return (
    <Card>
      <SectionTitle title={t.rewards} suffix={t.allPositions} />
      <View style={{ gap: 2 }}>
        {rewards.map((r, i) => (
          <View
            key={r.position}
            accessibilityLabel={`${t.winnerPosition(r.position)}: ${formatMoney(r.amount)}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 7,
              paddingHorizontal: spacing.sm,
              borderRadius: radius.sm,
              backgroundColor: i % 2 === 0 ? '#F7FAFA' : 'transparent',
            }}
          >
            <View style={{ width: 30, alignItems: 'center' }}>
              <PositionIcon position={r.position} />
            </View>
            <AppText variant="subheading" weight="medium" style={{ flex: 1, marginLeft: spacing.md }}>
              {t.winnerPosition(r.position)}
            </AppText>
            <AppText variant="heading" color={colors.primaryText} style={{ fontSize: 19 }}>
              {formatMoney(r.amount)}
            </AppText>
          </View>
        ))}
      </View>
    </Card>
  );
}
