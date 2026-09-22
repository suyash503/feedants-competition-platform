import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from './ScreenHeader';
import { StateView } from './ui';
import { useI18n } from '@/i18n';
import { colors } from '@/theme';
import type Ionicons from '@expo/vector-icons/Ionicons';

/** Placeholder for tabs outside this module's scope. */
export function ComingSoonScreen({ title, icon }: { title: string; icon: keyof typeof Ionicons.glyphMap }) {
  const { t } = useI18n();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScreenHeader showBack={false} title={title} />
      <StateView icon={icon} title={t.comingSoon} />
    </SafeAreaView>
  );
}
