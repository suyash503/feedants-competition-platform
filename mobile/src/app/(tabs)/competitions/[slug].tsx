import { useLocalSearchParams } from 'expo-router';
import { CompetitionDetailsScreen } from '@/features/competition/CompetitionDetailsScreen';

export default function CompetitionRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <CompetitionDetailsScreen slug={slug} />;
}
