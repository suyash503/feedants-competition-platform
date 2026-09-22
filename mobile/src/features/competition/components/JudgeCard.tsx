import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import type { Judge } from '@/api/types';
import { AppText, Card } from '@/components/ui';
import { useI18n } from '@/i18n';
import { colors, spacing } from '@/theme';

export function JudgeCard({ judge, onPlayIntro }: { judge: Judge; onPlayIntro?: (url: string) => void }) {
  const { t, pick } = useI18n();
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
      <Image
        source={judge.photoUrl}
        style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: colors.surfaceMuted }}
        contentFit="cover"
        transition={200}
        accessibilityLabel={judge.name}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="label">{t.judge}</AppText>
        <AppText variant="heading" style={{ fontSize: 18 }}>
          {judge.name}
        </AppText>
        <AppText variant="label" style={{ marginTop: 4 }}>
          {pick(judge.designation)}
        </AppText>
        {judge.yearsOfExperience ? <AppText variant="label">{t.yearsExperience(judge.yearsOfExperience)}</AppText> : null}
      </View>
      {judge.introVideoUrl ? (
        <Pressable
          onPress={() => onPlayIntro?.(judge.introVideoUrl!)}
          accessibilityRole="button"
          accessibilityLabel={`${t.introVideo}: ${judge.name}`}
          style={({ pressed }) => ({ alignItems: 'center', gap: spacing.sm, opacity: pressed ? 0.7 : 1 })}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: colors.primaryTint,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="play" size={24} color={colors.primary} style={{ marginLeft: 3 }} />
          </View>
          <AppText variant="label">{t.introVideo}</AppText>
        </Pressable>
      ) : null}
    </Card>
  );
}
