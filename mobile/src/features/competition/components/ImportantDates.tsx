import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { Schedule } from '@/api/types';
import { AppText, Card, SectionTitle } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatDate, formatTime } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

export function ImportantDates({ schedule }: { schedule: Schedule }) {
  const { t, lang } = useI18n();
  const icon = (node: ReactNode) => <View style={{ width: 30, alignItems: 'center' }}>{node}</View>;
  const c = colors.primaryText;

  const cells = [
    { label: t.registerBefore, at: schedule.registrationClosesAt, icon: icon(<Ionicons name="calendar-outline" size={26} color={c} />) },
    { label: t.submissionStarts, at: schedule.submissionStartsAt, icon: icon(<Ionicons name="paper-plane-outline" size={26} color={c} />) },
    { label: t.submissionEnds, at: schedule.submissionEndsAt, icon: icon(<MaterialCommunityIcons name="tray-arrow-up" size={28} color={c} />) },
    { label: t.resultDate, at: schedule.resultAt, icon: icon(<Ionicons name="trophy-outline" size={26} color={c} />) },
  ];

  return (
    <Card>
      <SectionTitle title={t.importantDates} />
      <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((cell, i) => (
          <View
            key={cell.label}
            style={{
              width: '50%',
              flexDirection: 'row',
              gap: spacing.md,
              paddingVertical: spacing.lg,
              paddingHorizontal: spacing.md,
              borderColor: colors.divider,
              borderRightWidth: i % 2 === 0 ? 1 : 0,
              borderBottomWidth: i < 2 ? 1 : 0,
            }}
          >
            {cell.icon}
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="caption">{cell.label}</AppText>
              <AppText variant="subheading" weight="semibold" color={colors.primaryText}>
                {formatDate(cell.at, lang)}
              </AppText>
              <AppText variant="label" color={colors.text}>
                {formatTime(cell.at)}
              </AppText>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}
