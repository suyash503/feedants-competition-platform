import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Linking, Pressable, View } from 'react-native';
import type { CompetitionDetails } from '@/api/types';
import { AppText, Card } from '@/components/ui';
import { useI18n } from '@/i18n';
import { colors, radius, spacing } from '@/theme';

/** "How will you receive prize money?" video + refund policy + secure payments. */
export function TrustRow({ links, onPlay }: { links: CompetitionDetails['links']; onPlay?: (url: string) => void }) {
  const { t } = useI18n();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md }}>
      <Card style={{ flex: 1, padding: spacing.md }}>
        <Pressable
          disabled={!links.prizePayoutVideoUrl}
          onPress={() => links.prizePayoutVideoUrl && onPlay?.(links.prizePayoutVideoUrl)}
          accessibilityRole="button"
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.md, opacity: pressed ? 0.7 : 1 })}
        >
          <View
            style={{
              width: 54,
              height: 54,
              borderRadius: radius.sm,
              backgroundColor: '#7CC4B4',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="play" size={15} color="#FFFFFF" style={{ marginLeft: 2 }} />
            </View>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="label" weight="semibold" color={colors.text}>
              {t.howPrizeMoney}
            </AppText>
            <AppText variant="caption">{t.watchVideo}</AppText>
          </View>
        </Pressable>
      </Card>

      <View style={{ flex: 1.1, justifyContent: 'center', gap: spacing.lg, paddingLeft: spacing.xs }}>
        <Pressable
          disabled={!links.refundPolicyUrl}
          onPress={() => links.refundPolicyUrl && Linking.openURL(links.refundPolicyUrl)}
          accessibilityRole="link"
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
        >
          <MaterialCommunityIcons name="shield-check-outline" size={22} color={colors.text} />
          <AppText variant="caption" color={colors.text}>
            {t.refundPolicy}
          </AppText>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <MaterialCommunityIcons name="shield-check-outline" size={22} color={colors.text} />
          <AppText variant="caption" color={colors.text} style={{ flex: 1 }}>
            {t.securePayments}{' '}
            <AppText variant="caption" weight="bold" color="#072654" style={{ fontStyle: 'italic' }}>
              Razorpay
            </AppText>
          </AppText>
        </View>
      </View>
    </View>
  );
}
