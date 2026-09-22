import { ActivityIndicator, Pressable, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { ActionDescription } from '../describeAction';

type Props = { description: ActionDescription | null; loading?: boolean; onPress?: () => void };

/** The sticky primary CTA at the bottom of the screen. */
export function ActionBar({ description, loading, onPress }: Props) {
  const disabled = !description?.enabled || loading;
  return (
    <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm, backgroundColor: colors.background }}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled, busy: !!loading }}
        accessibilityLabel={description ? [description.label, description.sublabel].filter(Boolean).join(', ') : undefined}
        style={({ pressed }) => ({
          minHeight: 56,
          borderRadius: radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: spacing.sm,
          backgroundColor: description?.enabled ? colors.primary : '#9DB5B7',
          opacity: pressed ? 0.88 : 1,
        })}
      >
        {!description || loading ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <>
            <AppText variant="heading" color={colors.onPrimary} align="center" style={{ fontSize: 17 }}>
              {description.label}
            </AppText>
            {description.sublabel ? (
              <AppText variant="label" color="#D5E7E7" align="center">
                {description.sublabel}
              </AppText>
            ) : null}
          </>
        )}
      </Pressable>
    </View>
  );
}
