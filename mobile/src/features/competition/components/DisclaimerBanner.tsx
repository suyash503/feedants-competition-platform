import Ionicons from '@expo/vector-icons/Ionicons';
import { AppText, Card } from '@/components/ui';
import { useI18n, type Localized } from '@/i18n';
import { colors, spacing } from '@/theme';

export function DisclaimerBanner({ text }: { text?: Localized }) {
  const { t, pick } = useI18n();
  if (!text) return null;
  return (
    <Card tone="tint" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md }}>
      <Ionicons name="information-circle-outline" size={22} color={colors.primaryText} />
      <AppText variant="label" color={colors.text} style={{ flex: 1 }}>
        <AppText variant="label" weight="semibold" color={colors.primaryText}>
          {t.disclaimer}{' '}
        </AppText>
        {pick(text)}
      </AppText>
    </Card>
  );
}
