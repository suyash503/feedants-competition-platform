import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Pressable, Share, View } from 'react-native';
import type { ViewerState } from '@/api/types';
import { AppText, Card } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

type Props = { referral: ViewerState['referral']; competitionTitle: string };

export function ReferralCard({ referral, competitionTitle }: Props) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(id);
  }, [copied]);

  const copy = async () => {
    await Clipboard.setStringAsync(referral.link);
    setCopied(true);
  };

  const share = () =>
    Share.share({ message: `Join me in "${competitionTitle}" on Feedants! Use my link: ${referral.link}` }).catch(() => {});

  return (
    <Card tone="referral" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <MaterialCommunityIcons name="bullhorn" size={34} color="#2E9C83" style={{ transform: [{ rotate: '-10deg' }] }} />

      <View style={{ flex: 2, gap: spacing.sm }}>
        <AppText variant="subheading" weight="semibold">
          {t.referEarn}
        </AppText>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: radius.sm,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
          }}
        >
          <AppText variant="caption" color={colors.text} numberOfLines={1} style={{ flex: 1, paddingHorizontal: spacing.sm }} selectable>
            {referral.link.replace(/^https?:\/\//, '')}
          </AppText>
          <Pressable
            onPress={copy}
            accessibilityRole="button"
            accessibilityLabel={t.copyLink}
            style={({ pressed }) => ({
              paddingHorizontal: spacing.sm,
              paddingVertical: 8,
              borderLeftWidth: 1,
              borderColor: colors.border,
              backgroundColor: pressed ? colors.surfaceMuted : '#FFFFFF',
            })}
          >
            <AppText variant="caption" weight="semibold" color={copied ? colors.success : colors.primaryText}>
              {copied ? t.copied : t.copyLink}
            </AppText>
          </Pressable>
        </View>
        {referral.signups > 0 ? (
          <AppText variant="caption" color={colors.primaryText}>
            {t.referralStats(referral.signups, formatMoney(referral.earned))}
          </AppText>
        ) : null}
      </View>

      <View style={{ flex: 1, gap: spacing.sm, alignItems: 'center' }}>
        <Pressable
          onPress={share}
          accessibilityRole="button"
          style={({ pressed }) => ({
            alignSelf: 'stretch',
            backgroundColor: colors.primary,
            borderRadius: radius.sm,
            paddingVertical: 10,
            alignItems: 'center',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <AppText variant="label" weight="semibold" color={colors.onPrimary}>
            {t.referNow}
          </AppText>
        </Pressable>
        {referral.rewardPerSignup > 0 ? (
          <AppText variant="caption" color={colors.primaryText} align="center">
            {t.youEarn}{' '}
            <AppText variant="caption" weight="bold" color={colors.primaryText}>
              {formatMoney(referral.rewardPerSignup, { space: false })}
            </AppText>{' '}
            {t.forEverySignup}
          </AppText>
        ) : null}
      </View>
    </Card>
  );
}
