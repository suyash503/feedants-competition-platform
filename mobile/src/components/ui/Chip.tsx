import { View } from 'react-native';
import { colors, radius } from '@/theme';
import { AppText } from './AppText';

type Tone = 'neutral' | 'teal' | 'warning' | 'danger' | 'success';

const tones: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.surfaceMuted, fg: colors.text },
  teal: { bg: colors.primaryTint, fg: colors.primaryText },
  warning: { bg: colors.warningTint, fg: colors.warning },
  danger: { bg: colors.dangerTint, fg: colors.danger },
  success: { bg: '#E6F5EE', fg: colors.success },
};

export function Chip({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const t = tones[tone];
  return (
    <View style={{ backgroundColor: t.bg, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 5 }}>
      <AppText variant="label" weight="medium" color={t.fg}>
        {label}
      </AppText>
    </View>
  );
}
