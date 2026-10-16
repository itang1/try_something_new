import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAppState } from './app-state';

/**
 * What Undo puts back. It's data rather than a callback, so it runs against the state at the moment
 * Undo is tapped, not the state from when the toast appeared.
 */
export type UndoAction =
  | { type: 'done'; ids: string[]; done: boolean; visit?: { placeId: string; activityId: string; visited: boolean } }
  | { type: 'hide'; id: string };

type Toast = { message: string; undo?: UndoAction; key: number };

const ToastContext = createContext<(message: string, undo?: UndoAction) => void>(() => {});

const VISIBLE_MS = 5000;
// Clears the floating tab bar.
const TAB_BAR_SPACE = 92;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const show = (message: string, undo?: UndoAction) => setToast({ message, undo, key: Date.now() });

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), VISIBLE_MS);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <ToastContext value={show}>
      {children}
      {toast && <ToastView key={toast.key} toast={toast} onDone={() => setToast(null)} />}
    </ToastContext>
  );
}

function ToastView({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const { setDone, setVisited, unhide } = useAppState();

  const undo = () => {
    const action = toast.undo;
    if (!action) return;
    Haptics.selectionAsync();
    if (action.type === 'hide') unhide(action.id);
    else {
      setDone(action.ids, action.done);
      if (action.visit) setVisited(action.visit.placeId, action.visit.activityId, action.visit.visited);
    }
    onDone();
  };

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(16)}
      exiting={FadeOutDown.duration(160)}
      style={[styles.toast, { bottom: insets.bottom + TAB_BAR_SPACE }]}
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.message} numberOfLines={2}>
        {toast.message}
      </Text>
      {toast.undo && (
        <Pressable onPress={undo} hitSlop={10} accessibilityRole="button">
          <Text style={styles.undo}>Undo</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

export function useToast() {
  return use(ToastContext);
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(28,28,30,0.94)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
  },
  message: { flex: 1, color: 'white', fontSize: 15, fontWeight: '500' },
  undo: { color: '#FF9F0A', fontSize: 15, fontWeight: '700' },
});
