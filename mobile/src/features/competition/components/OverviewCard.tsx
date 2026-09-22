import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';
import type { CompetitionDetails, Phase, Seats, ViewerState } from '@/api/types';
import { AppText, Card, Chip, ProgressBar } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

const CATEGORY_LABELS: Record<string, { en: string; hi: string }> = {
  dance: { en: 'Dance', hi: 'नृत्य' },
  music: { en: 'Music', hi: 'संगीत' },
  singing: { en: 'Singing', hi: 'गायन' },
  art: { en: 'Art', hi: 'कला' },
  acting: { en: 'Acting', hi: 'अभिनय' },
  other: { en: 'Other', hi: 'अन्य' },
};

type Props = {
  competition: Pick<CompetitionDetails, 'title' | 'category' | 'isMultiWin' | 'certificateForWinners' | 'prizePool' | 'entryFee'>;
  seats: Seats;
  phase: Phase;
  /** Seat count is being pushed live by the server. */
  liveConnected?: boolean;
  registrationStatus?: NonNullable<ViewerState['registration']>['status'] | null;
  holdActive?: boolean;
};

export function OverviewCard({ competition, seats, phase, liveConnected, registrationStatus, holdActive }: Props) {
  const { t, pick, lang } = useI18n();
  const category = CATEGORY_LABELS[competition.category] ?? CATEGORY_LABELS.other;

  // "Spots left" only means something while people can still join.
  const joinable = phase === 'upcoming' || phase === 'registration_open';
  const spotsLabel = !joinable ? t.participants(seats.taken) : seats.left ? t.spotsLeft(seats.left) : t.allSpotsBooked;
  const spotsColor = joinable && !seats.left ? colors.danger : colors.primaryText;

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
        <AppText variant="title" style={{ flex: 1 }}>
          {pick(competition.title)}
        </AppText>
        {registrationStatus === 'confirmed' ? (
          <StatusPill icon="checkmark-circle" label={t.registered} tone="teal" />
        ) : registrationStatus === 'pending_payment' && holdActive ? (
          <StatusPill icon="time" label={t.paymentPending} tone="warning" />
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md }}>
        <Chip label={category[lang]} />
        {competition.isMultiWin ? <Chip label={t.multiWin} /> : null}
        {competition.certificateForWinners ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: spacing.xs }}>
            <Ionicons name="trophy-outline" size={18} color={colors.primaryText} />
            <AppText variant="label" weight="medium" color={colors.primaryText}>
              {t.winnersGetCertificate}
            </AppText>
          </View>
        ) : null}
      </View>

      {/* Money never truncates: on narrow phones the seats block wraps onto its own line. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xl, columnGap: spacing.xl, rowGap: spacing.lg }}>
        <View>
          <AppText variant="label">{t.prizePool}</AppText>
          <AppText variant="amount">{formatMoney(competition.prizePool)}</AppText>
        </View>
        <View>
          <AppText variant="label">{t.entryFee}</AppText>
          <AppText variant="amount" color={colors.text} style={{ fontSize: 26 }}>
            {competition.entryFee === 0 ? t.free : formatMoney(competition.entryFee)}
          </AppText>
        </View>
        <View style={{ flexGrow: 1, flexBasis: 140, justifyContent: 'center', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="people-outline" size={18} color={spotsColor} />
            <AppText variant="label" weight="medium" color={spotsColor} numberOfLines={1} style={{ flexShrink: 1 }}>
              {spotsLabel}
            </AppText>
            {liveConnected && joinable ? <LiveDot /> : null}
          </View>
          <ProgressBar value={seats.taken / seats.total} />
          <AppText variant="caption">{t.booked(seats.taken, seats.total)}</AppText>
        </View>
      </View>
    </Card>
  );
}

/** Small pulsing dot: the seat count updates in real time. */
function LiveDot() {
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.25, duration: 900, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      accessibilityLabel="Live"
      style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success, opacity }}
    />
  );
}

function StatusPill({ icon, label, tone }: { icon: 'checkmark-circle' | 'time'; label: string; tone: 'teal' | 'warning' }) {
  const fg = tone === 'teal' ? colors.primary : colors.warning;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: tone === 'teal' ? colors.primaryTint : colors.warningTint,
        borderColor: tone === 'teal' ? colors.primaryTintBorder : '#F5DDB0',
        borderWidth: 1,
        borderRadius: radius.sm,
        paddingHorizontal: 10,
        paddingVertical: 6,
      }}
    >
      <Ionicons name={icon} size={18} color={fg} />
      <AppText variant="label" weight="medium" color={fg}>
        {label}
      </AppText>
    </View>
  );
}
