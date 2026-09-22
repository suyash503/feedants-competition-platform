import { View } from 'react-native';
import { spacing } from '@/theme';
import { AppText } from './AppText';

export function SectionTitle({ title, suffix }: { title: string; suffix?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: spacing.md }}>
      <AppText variant="subheading" weight="semibold">
        {title}
      </AppText>
      {suffix ? <AppText variant="label">{suffix}</AppText> : null}
    </View>
  );
}
