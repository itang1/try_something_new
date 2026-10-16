import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { COSTS, DURATIONS } from '@/data/catalog';
import { useAppState } from '@/state/app-state';
import { useToast } from '@/state/toast';
import { SUBCATEGORIES, useColors } from '@/theme';
import { FilterChip } from '@/components/chips';
import { Icon } from '@/components/icon';

export default function AddSheet() {
  const colors = useColors();
  const router = useRouter();
  const toast = useToast();
  const { city, addCustom } = useAppState();
  const [name, setName] = useState('');
  const [kind, setKind] = useState('outdoor');
  const [duration, setDuration] = useState('1-2 hours');
  const [cost, setCost] = useState('$');
  const trimmed = name.trim();

  const add = () => {
    if (!trimmed) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addCustom({ name: trimmed, subcategory: kind, duration, cost });
    toast(`Added ${trimmed} to ${city.name}`);
    router.back();
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.label }]}>Add your own</Text>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityLabel="Close"
            style={[styles.close, { backgroundColor: colors.fill }]}
          >
            <Icon name="close" size={18} color={colors.secondary} />
          </Pressable>
        </View>
        <Text style={[styles.hint, { color: colors.secondary }]}>
          Something you want to try in {city.name} that isn&apos;t on the list yet.
        </Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Learn to make pasta"
          placeholderTextColor={colors.tertiary}
          returnKeyType="done"
          submitBehavior="blurAndSubmit"
          maxLength={60}
          accessibilityLabel="Name"
          style={[styles.input, { backgroundColor: colors.card, color: colors.label }]}
        />

        <Text style={[styles.groupTitle, { color: colors.label }]}>Kind</Text>
        <View style={styles.chips}>
          {Object.entries(SUBCATEGORIES).map(([id, sub]) => (
            <FilterChip
              key={id}
              title={sub.label}
              icon={sub.icon}
              color={sub.color}
              selected={kind === id}
              onPress={() => setKind(id)}
            />
          ))}
        </View>

        <Text style={[styles.groupTitle, { color: colors.label }]}>Time</Text>
        <View style={styles.chips}>
          {DURATIONS.map((d) => (
            <FilterChip
              key={d}
              title={d}
              icon="schedule"
              color={colors.accent}
              selected={duration === d}
              onPress={() => setDuration(d)}
            />
          ))}
        </View>

        <Text style={[styles.groupTitle, { color: colors.label }]}>Cost</Text>
        <View style={styles.chips}>
          {COSTS.map((c) => (
            <FilterChip
              key={c}
              title={c}
              icon="payments"
              color={colors.accent}
              selected={cost === c}
              onPress={() => setCost(c)}
            />
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.separator, backgroundColor: colors.background }]}>
        <Pressable
          onPress={add}
          disabled={!trimmed}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.accent, opacity: !trimmed ? 0.4 : pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={styles.buttonText}>Add to my list</Text>
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
  input: { minHeight: 50, borderRadius: 14, paddingHorizontal: 14, fontSize: 17 },
  groupTitle: { fontSize: 17, fontWeight: '700', marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footer: { padding: 16, paddingBottom: 32, borderTopWidth: StyleSheet.hairlineWidth },
  button: { minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});
