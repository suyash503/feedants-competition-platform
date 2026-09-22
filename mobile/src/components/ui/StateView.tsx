import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** Full-area message for error / empty / not-found states. */
export function StateView({ icon = 'alert-circle-outline', title, message, actionLabel, onAction }: Props) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.md }}>
      <Ionicons name={icon} size={44} color={colors.primaryText} />
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText variant="body" align="center">
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          style={({ pressed }) => ({
            marginTop: spacing.sm,
            backgroundColor: colors.primary,
            borderRadius: radius.sm,
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.md,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <AppText variant="subheading" color={colors.onPrimary}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
