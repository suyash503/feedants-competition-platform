import { View, type ViewProps } from 'react-native';
import { colors, radius, shadow, spacing } from '@/theme';

type Props = ViewProps & { tone?: 'default' | 'tint' | 'referral'; padded?: boolean; flat?: boolean };

const backgrounds = { default: colors.surface, tint: colors.primaryTint, referral: colors.referralTint };

export function Card({ tone = 'default', padded = true, flat = false, style, ...rest }: Props) {
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: backgrounds[tone],
          borderRadius: radius.md,
          borderWidth: tone === 'default' ? 1 : 0,
          borderColor: colors.border,
        },
        padded && { padding: spacing.lg },
        tone === 'default' && !flat && shadow,
        style,
      ]}
    />
  );
}
