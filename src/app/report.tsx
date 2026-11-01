import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { emailPlaceReport, REASONS, sendPlaceReport, type Reason } from '@/data/report';
import { useAppState } from '@/state/app-state';
import { useToast } from '@/state/toast';
import { useColors } from '@/theme';
import { FilterChip } from '@/components/chips';
import { Icon } from '@/components/icon';

/** "Report a problem" with one place, filed as a GitHub issue through the Worker. */
export default function ReportSheet() {
  const colors = useColors();
  const router = useRouter();
  const toast = useToast();
  const { place: placeId, entry: entryId } = useLocalSearchParams<{ place: string; entry: string }>();
  const { city, findEntry } = useAppState();
  const entry = findEntry(entryId);
  const place = entry?.places.find((p) => p.id === placeId);
  const [reason, setReason] = useState<Reason | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!entry || !place) {
    return (
      <View style={[styles.screen, styles.content]}>
        <Text style={[styles.hint, { color: colors.secondary }]}>This place isn&apos;t in the list anymore.</Text>
      </View>
    );
  }

  const send = async () => {
    if (!reason) return;
    setSending(true);
    setFailed(false);
    try {
      await sendPlaceReport({
        placeId: place.id,
        placeName: place.name,
        activityId: entry.activityId,
        activityName: entry.name,
        city: city.name,
        reason,
        note: note.trim(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast(`Thanks, we'll check ${place.name}`);
      router.back();
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.label }]}>Report a problem</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityLabel="Close"
            style={[styles.close, { backgroundColor: colors.fill }]}
          >
            <Icon name="close" size={18} color={colors.secondary} />
          </Pressable>
        </View>
        <Text style={[styles.hint, { color: colors.secondary }]}>
          {place.name}, for {entry.name}. Reports are public on GitHub, so leave out anything personal.
        </Text>

        <Text style={[styles.groupTitle, { color: colors.label }]}>What&apos;s wrong?</Text>
        <View style={styles.chips}>
          {REASONS.map((r) => (
            <FilterChip
              key={r.reason}
              title={r.label}
              icon="flag"
              color={colors.accent}
              selected={reason === r.reason}
              onPress={() => {
                Haptics.selectionAsync();
                setReason(r.reason);
              }}
            />
          ))}
        </View>

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Anything that helps us fix it (optional)"
          placeholderTextColor={colors.tertiary}
          multiline
          maxLength={500}
          accessibilityLabel="Details"
          style={[styles.input, { backgroundColor: colors.card, color: colors.label }]}
        />

        {failed && (
          <View style={styles.failed}>
            <Text style={[styles.hint, { color: colors.secondary }]}>That didn&apos;t send. Check your connection and try again, or</Text>
            <Pressable accessibilityRole="button" onPress={() => emailPlaceReport(place, entry, city.name, note.trim())} hitSlop={8}>
              <Text style={[styles.link, { color: colors.accent }]}>send it another way</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.separator, backgroundColor: colors.background }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !reason || sending, busy: sending }}
          onPress={send}
          disabled={!reason || sending}
          style={({ pressed }) => [styles.button, { backgroundColor: colors.accent, opacity: !reason ? 0.4 : pressed ? 0.8 : 1 }]}
        >
          {sending ? <ActivityIndicator color={colors.onAccent} /> : <Text style={[styles.buttonText, { color: colors.onAccent }]}>Send report</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingTop: 24, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, fontSize: 24, fontWeight: '700' },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 15 },
  link: { fontSize: 15, fontWeight: '600' },
  failed: { gap: 4 },
  input: { minHeight: 100, borderRadius: 14, paddingHorizontal: 14, paddingTop: 12, fontSize: 17, textAlignVertical: 'top' },
  groupTitle: { fontSize: 17, fontWeight: '700', marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footer: { padding: 16, paddingBottom: 32, borderTopWidth: StyleSheet.hairlineWidth },
  button: { minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
