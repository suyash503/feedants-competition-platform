import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';

type Props = {
  visible: boolean;
  title?: string;
  onClose: () => void;
  /** Block closing while something irreversible is in flight (e.g. a payment). */
  dismissable?: boolean;
  children: ReactNode;
};

export function BottomSheet({ visible, title, onClose, dismissable = true, children }: Props) {
  const insets = useSafeAreaInsets();
  const close = () => dismissable && onClose();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable
          onPress={close}
          accessibilityLabel="Close"
          style={{ flex: 1, backgroundColor: 'rgba(10, 30, 32, 0.45)' }}
        />
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            maxHeight: '88%',
            paddingBottom: Math.max(insets.bottom, spacing.lg),
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: spacing.sm }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.md }}>
            <AppText variant="heading" style={{ flex: 1, fontSize: 18 }} accessibilityRole="header">
              {title}
            </AppText>
            {dismissable ? (
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: spacing.xl, paddingTop: spacing.lg, gap: spacing.lg }}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
