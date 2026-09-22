import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AppText, Card, SectionTitle } from '@/components/ui';
import { useI18n } from '@/i18n';
import { DEMO_PHONE, useSession } from '@/session/SessionProvider';
import { colors, radius, spacing } from '@/theme';

const DEMO_USERS = [
  { phone: DEMO_PHONE, name: 'Demo User', note: 'Not registered anywhere yet' },
  { phone: '+919000000002', name: 'Kavya Nair', note: 'Already registered for Classical Dance' },
];

/**
 * Stand-in profile. Sign-in is a development phone login, so this screen lets a
 * reviewer hop between users to see per-user states (and race each other for seats).
 */
export function ProfileScreen() {
  const { t } = useI18n();
  const { user, signIn } = useSession();
  const [busy, setBusy] = useState<string | null>(null);

  const switchTo = async (phone: string, name: string) => {
    setBusy(phone);
    try {
      await signIn(phone, name);
    } finally {
      setBusy(null);
    }
  };

  const freshUser = () => {
    const phone = `+9198${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;
    return switchTo(phone, `Guest ${phone.slice(-4)}`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScreenHeader showBack={false} title={t.nav.profile} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, gap: spacing.md }}>
        {user ? (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <AppText variant="title" color="#FFFFFF">
                {user.name.slice(0, 1).toUpperCase()}
              </AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="heading">{user.name}</AppText>
              <AppText variant="label">{user.phone}</AppText>
              <AppText variant="caption" color={colors.primaryText}>
                Referral code: {user.referralCode}
              </AppText>
            </View>
          </Card>
        ) : null}

        <Card>
          <SectionTitle title="Switch demo user" />
          <View style={{ gap: spacing.sm }}>
            {DEMO_USERS.map((u) => (
              <UserRow
                key={u.phone}
                title={u.name}
                subtitle={u.note}
                active={user?.phone === u.phone}
                busy={busy === u.phone}
                onPress={() => switchTo(u.phone, u.name)}
              />
            ))}
            <UserRow title="New guest user" subtitle="A brand-new account" icon="person-add-outline" busy={busy?.startsWith('+9198') ?? false} onPress={freshUser} />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function UserRow(props: {
  title: string;
  subtitle: string;
  onPress: () => void;
  active?: boolean;
  busy?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.active || props.busy}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: props.active ? colors.primaryText : colors.border,
        backgroundColor: props.active ? colors.primaryTint : pressed ? colors.surfaceMuted : colors.surface,
      })}
    >
      <Ionicons name={props.icon ?? 'person-circle-outline'} size={26} color={colors.primaryText} />
      <View style={{ flex: 1 }}>
        <AppText variant="subheading">{props.title}</AppText>
        <AppText variant="caption">{props.subtitle}</AppText>
      </View>
      {props.busy ? <ActivityIndicator color={colors.primary} /> : props.active ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
    </Pressable>
  );
}
