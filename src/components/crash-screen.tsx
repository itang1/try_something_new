import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ErrorBoundaryProps } from 'expo-router';
import { readable, useColors } from '@/theme';
import { Icon } from './icon';

/**
 * Shown in place of a screen that threw while rendering, instead of a blank or red screen.
 * Nothing on the phone is lost: the data lives in SQLite, so trying again usually just works.
 */
export function CrashScreen({ error, retry }: ErrorBoundaryProps) {
  const colors = useColors();
  const [busy, setBusy] = useState(false);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
          <Icon name="undo" size={32} color={colors.accent} />
        </View>
        <Text style={[styles.title, { color: colors.label }]} accessibilityRole="header">
          Something went wrong
        </Text>
        <Text style={[styles.body, { color: colors.secondary }]}>
          This screen hit a problem and couldn&apos;t load. Your list, plans and memories are safe on this phone.
        </Text>
        <Pressable
          onPress={async () => {
            setBusy(true);
            try {
              await retry();
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, { backgroundColor: colors.accent, opacity: pressed || busy ? 0.8 : 1 }]}
        >
          <Text style={[styles.buttonText, { color: colors.onAccent }]}>Try again</Text>
        </Pressable>
        {__DEV__ && (
          <Text style={[styles.detail, { color: colors.tertiary }]} selectable>
            {error.message}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center' },
  content: { ...readable, alignItems: 'center', padding: 32, gap: 12 },
  badge: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 16, lineHeight: 22, textAlign: 'center' },
  button: { marginTop: 8, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 999 },
  buttonText: { fontSize: 17, fontWeight: '600' },
  detail: { fontSize: 12, marginTop: 12, textAlign: 'center' },
});
