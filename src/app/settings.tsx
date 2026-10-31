import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { restoreBackup, shareBackup } from '@/data/backup';
import { CREDITS, openCredit } from '@/data/credits';
import { allowNudges } from '@/data/nudge';
import { canReport } from '@/data/report';
import { useAppState } from '@/state/app-state';
import { useToast } from '@/state/toast';
import { readable, useColors } from '@/theme';
import { Icon } from '@/components/icon';
import type { IconName } from '@/icons/paths';

export default function SettingsSheet() {
  const colors = useColors();
  const router = useRouter();
  const { weekendNudge, setWeekendNudge, reload } = useAppState();
  const showToast = useToast();
  const version = Constants.expoConfig?.version;

  const [busy, setBusy] = useState(false);
  const run = async (work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await work();
    } catch (e) {
      Alert.alert("Couldn't finish", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const toggleNudges = async (on: boolean) => {
    if (!on) {
      setWeekendNudge(false);
      return;
    }
    const allowed = await allowNudges();
    setWeekendNudge(allowed);
    if (!allowed) {
      Alert.alert('Notifications are off', 'Turn on notifications for Try Something New in your phone’s settings.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
    }
  };

  const restore = () =>
    run(async () => {
      const added = await restoreBackup();
      if (added == null) return;
      reload();
      showToast(added ? `Restored ${added} ${added === 1 ? 'item' : 'items'}` : 'Everything in that backup was already here');
    });

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.label }]}>Settings</Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityLabel="Close"
          style={[styles.close, { backgroundColor: colors.fill }]}
        >
          <Icon name="close" size={18} color={colors.secondary} />
        </Pressable>
      </View>

      <Text style={[styles.section, { color: colors.secondary }]}>Reminders</Text>
      <View style={[styles.list, { backgroundColor: colors.card }]}>
        <View style={styles.row}>
          <Icon name="notifications" size={22} color={colors.accent} />
          <View style={styles.grow}>
            <Text style={[styles.name, { color: colors.label }]}>Weekend ideas</Text>
            <Text style={[styles.use, { color: colors.secondary }]}>One idea on Thursday evenings, saved ones first</Text>
          </View>
          <Switch
            value={weekendNudge}
            onValueChange={toggleNudges}
            trackColor={{ true: colors.accent }}
            accessibilityLabel="Weekend ideas"
          />
        </View>
      </View>

      <Text style={[styles.section, { color: colors.secondary }]}>Your data</Text>
      <View style={[styles.list, { backgroundColor: colors.card }]}>
        <ActionRow
          icon="ios_share"
          title="Export backup"
          detail="Your list, plans, memories and photos in one file"
          onPress={() => run(shareBackup)}
          disabled={busy}
        />
        <ActionRow
          icon="history"
          title="Restore from backup"
          detail="Adds a backup to what's here. Nothing is removed."
          onPress={restore}
          disabled={busy}
          divider
        />
      </View>
      <Text style={[styles.footnote, { color: colors.secondary }]}>
        Everything stays on this phone. A backup is the way to move it to a new one.
      </Text>

      <Text style={[styles.section, { color: colors.secondary }]}>Data and credits</Text>
      <View style={[styles.list, { backgroundColor: colors.card }]}>
        {CREDITS.map((credit, i) => (
          <Pressable
            key={credit.id}
            onPress={() => openCredit(credit)}
            accessibilityRole="link"
            accessibilityHint={`Opens ${credit.name}'s license and attribution page`}
            style={({ pressed }) => [
              styles.row,
              i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <View style={styles.grow}>
              <Text style={[styles.name, { color: colors.label }]}>{credit.name}</Text>
              <Text style={[styles.use, { color: colors.secondary }]}>{credit.use}</Text>
              <Text style={[styles.notice, { color: colors.tertiary }]}>
                {credit.notice} · {credit.license}
              </Text>
            </View>
            <Icon name="open_in_new" size={18} color={colors.accent} />
          </Pressable>
        ))}
      </View>

      <Text style={[styles.footnote, { color: colors.secondary }]}>
        Every place comes from people who mapped their own cities. The map itself is Apple Maps on iOS and Google Maps on
        Android, credited in its corner.
        {canReport ? ' Places can be out of date, and the flag next to a place reports it.' : ''}
      </Text>

      <Text style={[styles.version, { color: colors.tertiary }]}>
        Try Something New{version ? ` ${version}` : ''}
      </Text>
    </ScrollView>
  );
}

type ActionRowProps = {
  icon: IconName;
  title: string;
  detail: string;
  onPress: () => void;
  disabled?: boolean;
  divider?: boolean;
};

function ActionRow({ icon, title, detail, onPress, disabled, divider }: ActionRowProps) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        divider && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
        { opacity: pressed || disabled ? 0.6 : 1 },
      ]}
    >
      <Icon name={icon} size={22} color={colors.accent} />
      <View style={styles.grow}>
        <Text style={[styles.name, { color: colors.label }]}>{title}</Text>
        <Text style={[styles.use, { color: colors.secondary }]}>{detail}</Text>
      </View>
      <Icon name="chevron_right" size={20} color={colors.tertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { ...readable, padding: 16, paddingTop: 24, paddingBottom: 40, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '700' },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  section: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginLeft: 4, marginTop: 8 },
  list: { borderRadius: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  grow: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  use: { fontSize: 14, marginTop: 2 },
  notice: { fontSize: 12, marginTop: 4 },
  footnote: { fontSize: 13, lineHeight: 18, marginHorizontal: 4 },
  version: { fontSize: 13, textAlign: 'center', marginTop: 16 },
});
