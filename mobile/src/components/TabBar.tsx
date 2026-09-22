import Ionicons from '@expo/vector-icons/Ionicons';
import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '@/i18n';
import { useSession } from '@/session/SessionProvider';
import { colors, radius, spacing } from '@/theme';
import { AppText } from './ui';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];
type IconName = keyof typeof Ionicons.glyphMap;

const ITEMS: { route: string; icon: IconName; activeIcon: IconName; labelKey?: 'home' | 'explore' | 'competitions' | 'profile' }[] = [
  { route: 'home', icon: 'home-outline', activeIcon: 'home', labelKey: 'home' },
  { route: 'explore', icon: 'search-outline', activeIcon: 'search', labelKey: 'explore' },
  { route: 'create', icon: 'add', activeIcon: 'add' },
  { route: 'competitions', icon: 'trophy-outline', activeIcon: 'trophy', labelKey: 'competitions' },
  { route: 'profile', icon: 'person-outline', activeIcon: 'person', labelKey: 'profile' },
];

/** The design's bottom bar: four tabs plus a raised "create" button in the middle. */
export function TabBar({ state, navigation }: TabBarProps) {
  const { t } = useI18n();
  const { user } = useSession();
  const insets = useSafeAreaInsets();
  const activeRoute = state.routes[state.index]?.name;

  return (
    <View
      accessibilityRole="tabbar"
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderColor: colors.divider,
        paddingTop: spacing.sm,
        paddingBottom: Math.max(insets.bottom, spacing.sm),
      }}
    >
      {ITEMS.map((item) => {
        const active = activeRoute === item.route;
        const go = () => navigation.navigate(item.route as never);

        if (!item.labelKey) {
          return (
            <View key={item.route} style={{ flex: 1, alignItems: 'center' }}>
              <Pressable
                onPress={go}
                accessibilityRole="button"
                accessibilityLabel="Create"
                style={({ pressed }) => ({
                  width: 64,
                  height: 50,
                  marginTop: -20,
                  borderRadius: radius.md,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="add" size={24} color={colors.primary} />
                </View>
              </Pressable>
            </View>
          );
        }

        const tint = active ? colors.primaryText : colors.textMuted;
        return (
          <Pressable
            key={item.route}
            onPress={go}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={{ flex: 1, alignItems: 'center', gap: 3 }}
          >
            {item.route === 'profile' && user ? (
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: active ? colors.primary : '#4A3A33',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppText variant="caption" weight="bold" color="#FFFFFF">
                  {user.name.slice(0, 1).toUpperCase()}
                </AppText>
              </View>
            ) : (
              <Ionicons name={active ? item.activeIcon : item.icon} size={26} color={tint} />
            )}
            <AppText variant="caption" weight={active ? 'semibold' : 'regular'} color={tint}>
              {t.nav[item.labelKey]}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
