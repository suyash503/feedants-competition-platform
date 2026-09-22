import { View } from 'react-native';
import { colors, radius } from '@/theme';

export function ProgressBar({ value, height = 5 }: { value: number; height?: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={{ height, borderRadius: radius.pill, backgroundColor: colors.track, overflow: 'hidden' }}
    >
      {/* A sliver stays visible at 0-5% so the bar never looks broken. */}
      <View style={{ width: `${Math.max(pct * 100, pct > 0 ? 6 : 0)}%`, height, backgroundColor: colors.primaryText }} />
    </View>
  );
}
