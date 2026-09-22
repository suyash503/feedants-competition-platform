import { ComingSoonScreen } from '@/components/ComingSoonScreen';
import { useI18n } from '@/i18n';

export default function HomeTab() {
  const { t } = useI18n();
  return <ComingSoonScreen title={t.nav.home} icon="home-outline" />;
}
