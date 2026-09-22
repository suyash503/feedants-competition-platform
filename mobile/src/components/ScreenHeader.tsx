import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useI18n } from '@/i18n';
import { colors, spacing } from '@/theme';
import { LanguageToggle } from './LanguageToggle';
import { AppText } from './ui';

export function ScreenHeader({ showBack = true, title }: { showBack?: boolean; title?: string }) {
  const { t } = useI18n();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/competitions'));
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
      }}
    >
      {showBack ? (
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={t.goBack}
          hitSlop={10}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
          <AppText variant="heading" weight="medium">
            {t.goBack}
          </AppText>
        </Pressable>
      ) : (
        <AppText variant="title">{title}</AppText>
      )}
      <LanguageToggle />
    </View>
  );
}
