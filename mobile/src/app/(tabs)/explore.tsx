import { ComingSoonScreen } from '@/components/ComingSoonScreen';
import { useI18n } from '@/i18n';

export default function ExploreTab() {
  const { t } = useI18n();
  return <ComingSoonScreen title={t.nav.explore} icon="search-outline" />;
}
