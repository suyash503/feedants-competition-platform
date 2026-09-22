import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';

type Tone = 'danger' | 'warning' | 'info';

const TONES: Record<Tone, { fg: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  danger: { fg: colors.danger, bg: colors.dangerTint, icon: 'alert-circle' },
  warning: { fg: colors.warning, bg: colors.warningTint, icon: 'time-outline' },
  info: { fg: colors.primaryText, bg: colors.primaryTint, icon: 'information-circle-outline' },
};

/** Inline message inside a sheet or form. Renders nothing without text. */
export function Notice({ text, tone = 'danger' }: { text: string | null | undefined; tone?: Tone }) {
  if (!text) return null;
  const t = TONES[tone];
  return (
    <View
      accessibilityRole="alert"
      style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', backgroundColor: t.bg, borderRadius: radius.sm, padding: spacing.md }}
    >
      <Ionicons name={t.icon} size={18} color={t.fg} style={{ marginTop: 1 }} />
      <AppText variant="label" color={t.fg} style={{ flex: 1 }}>
        {text}
      </AppText>
    </View>
  );
}
