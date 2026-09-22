import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, View } from 'react-native';
import { AppText, Card } from '@/components/ui';
import { useI18n } from '@/i18n';
import { colors, radius, spacing } from '@/theme';

export function TestimonialsRow({ onPress }: { onPress?: () => void }) {
  const { t } = useI18n();
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md }}>
        <Ionicons name="chatbubble-ellipses-outline" size={26} color={colors.text} />
        <View style={{ flex: 1 }}>
          <AppText variant="label" weight="semibold" color={colors.text}>
            {t.hearFromUsers}
          </AppText>
          <AppText variant="caption">{t.hearFromUsersSub}</AppText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.text} />
      </Card>
    </Pressable>
  );
}

/** Reserved sponsor slot, as in the design. */
export function AdSlot() {
  const { t } = useI18n();
  return (
    <View
      style={{
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#C9D2D4',
        borderRadius: radius.sm,
        paddingVertical: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
      }}
    >
      <MaterialCommunityIcons name="bullhorn-outline" size={20} color={colors.textSubtle} />
      <AppText variant="label" weight="medium" color={colors.textSubtle}>
        {t.adHere}
      </AppText>
    </View>
  );
}
