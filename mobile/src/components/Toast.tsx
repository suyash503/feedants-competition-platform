import Ionicons from '@expo/vector-icons/Ionicons';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/theme';
import { AppText } from './ui';

type Tone = 'success' | 'error' | 'info';
type ToastState = { id: number; message: string; tone: Tone } | null;

const ToastContext = createContext<((message: string, tone?: Tone) => void) | null>(null);

const TONES: Record<Tone, { bg: string; icon: 'checkmark-circle' | 'alert-circle' | 'information-circle' }> = {
  success: { bg: colors.primary, icon: 'checkmark-circle' },
  error: { bg: colors.danger, icon: 'alert-circle' },
  info: { bg: '#34464A', icon: 'information-circle' },
};

/** Lightweight feedback banner for outcomes that outlive a sheet (e.g. "Registration confirmed"). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const insets = useSafeAreaInsets();
  const nextId = useRef(0);

  const show = useCallback((message: string, tone: Tone = 'success') => {
    nextId.current += 1;
    setToast({ id: nextId.current, message, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const hide = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(null));
    }, 3200);
    return () => clearTimeout(hide);
  }, [toast, opacity]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <Animated.View
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={{ position: 'absolute', pointerEvents: 'none', left: spacing.lg, right: spacing.lg, top: insets.top + spacing.sm, opacity }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              backgroundColor: TONES[toast.tone].bg,
              borderRadius: radius.md,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
            }}
          >
            <Ionicons name={TONES[toast.tone].icon} size={20} color="#FFFFFF" />
            <AppText variant="label" weight="medium" color="#FFFFFF" style={{ flex: 1 }}>
              {toast.message}
            </AppText>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast must be used inside <ToastProvider>');
  return show;
}
