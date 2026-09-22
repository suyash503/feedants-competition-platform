import { ActivityIndicator, Pressable, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

const looks: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, fg: colors.onPrimary },
  secondary: { bg: colors.surface, fg: colors.primaryText, border: colors.primaryTintBorder },
  ghost: { bg: 'transparent', fg: colors.primaryText },
  danger: { bg: 'transparent', fg: colors.danger },
};

export function Button({ label, onPress, variant = 'primary', loading, disabled, style }: Props) {
  const look = looks[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        {
          minHeight: variant === 'ghost' || variant === 'danger' ? 40 : 50,
          borderRadius: radius.sm,
          paddingHorizontal: spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: look.bg,
          borderWidth: look.border ? 1 : 0,
          borderColor: look.border,
          opacity: disabled && !loading ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={look.fg} />
      ) : (
        <AppText variant="subheading" weight="semibold" color={look.fg} align="center">
          {label}
        </AppText>
      )}
    </Pressable>
  );
}
