import { Pressable, View } from 'react-native';
import { useI18n, type Lang } from '@/i18n';
import { colors, radius } from '@/theme';
import { AppText } from './ui';

const OPTIONS: { lang: Lang; label: string }[] = [
  { lang: 'en', label: 'ENG' },
  { lang: 'hi', label: 'हिंदी' },
];

export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <View
      accessibilityRole="radiogroup"
      style={{ flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, padding: 3 }}
    >
      {OPTIONS.map((o) => {
        const active = o.lang === lang;
        return (
          <Pressable
            key={o.lang}
            onPress={() => setLang(o.lang)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            hitSlop={6}
            style={{
              backgroundColor: active ? colors.primary : 'transparent',
              borderRadius: radius.pill,
              paddingHorizontal: 16,
              paddingVertical: 6,
            }}
          >
            <AppText variant="label" weight="semibold" color={active ? colors.onPrimary : colors.text}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
