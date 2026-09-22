import { View } from 'react-native';
import { Card, Skeleton } from '@/components/ui';
import { spacing } from '@/theme';

/** Mirrors the real layout so nothing jumps when data arrives. */
export function DetailsSkeleton() {
  return (
    <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }} accessibilityLabel="Loading competition">
      <Card style={{ gap: spacing.md }}>
        <Skeleton width="70%" height={26} />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Skeleton width={70} height={26} />
          <Skeleton width={80} height={26} />
          <Skeleton width={150} height={26} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm }}>
          <Skeleton width="30%" height={48} />
          <Skeleton width="20%" height={48} />
          <Skeleton width="40%" height={48} />
        </View>
      </Card>
      <Card style={{ flexDirection: 'row', gap: spacing.lg, alignItems: 'center' }}>
        <Skeleton width={92} height={92} style={{ borderRadius: 46 }} />
        <View style={{ flex: 1, gap: spacing.sm }}>
          <Skeleton width="30%" />
          <Skeleton width="60%" height={20} />
          <Skeleton width="80%" />
        </View>
      </Card>
      <Skeleton height={52} />
      <Card style={{ gap: spacing.md }}>
        <Skeleton width="40%" height={20} />
        <Skeleton height={150} />
      </Card>
    </View>
  );
}
