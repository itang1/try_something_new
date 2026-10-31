import { useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, useColorScheme, View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  accountsAvailable,
  deleteAccount,
  describeSession,
  lastSyncedAt,
  signIn,
  signOut,
  syncNow,
  useSession,
  type Provider,
} from '@/data/account';
import { restoreBackup, shareBackup } from '@/data/backup';
import { CREDITS, openCredit } from '@/data/credits';
import { allowNudges } from '@/data/nudge';
import { canReport, sendFeedback } from '@/data/report';
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

  const session = useSession();
  const [syncedAt, setSyncedAt] = useState(lastSyncedAt);

  const runSync = async () => {
    const { pulled } = await syncNow();
    setSyncedAt(lastSyncedAt());
    if (pulled) reload();
    return pulled;
  };

  const startSignIn = (provider: Provider) =>
    run(async () => {
      if (!(await signIn(provider))) return;
      const pulled = await runSync();
      showToast(pulled ? `Signed in and added ${pulled} ${pulled === 1 ? 'item' : 'items'}` : 'Signed in and backed up');
    });

  const syncAgain = () =>
    run(async () => {
      const pulled = await runSync();
      showToast(pulled ? `Added ${pulled} ${pulled === 1 ? 'item' : 'items'} from your account` : 'Up to date');
    });

  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'Everything stays on this phone. Changes made while signed out won’t sync.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        onPress: () =>
          run(async () => {
            await signOut();
            setSyncedAt(null);
          }),
      },
    ]);

  const confirmDelete = () =>
    Alert.alert(
      'Delete your account?',
      'This removes your account and everything backed up to it. This phone keeps its own copy. It can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () =>
            run(async () => {
              await deleteAccount();
              setSyncedAt(null);
              showToast('Account deleted');
            }),
        },
      ],
    );

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
          accessibilityRole="button"
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

      {accountsAvailable() && session !== undefined && (
        <>
          <Text style={[styles.section, { color: colors.secondary }]}>Back up and sync</Text>
          {session ? (
            <View style={[styles.list, { backgroundColor: colors.card }]}>
              <View style={styles.row}>
                <Icon name="person" size={22} color={colors.accent} />
                <View style={styles.grow}>
                  <Text style={[styles.name, { color: colors.label }]}>Signed in</Text>
                  <Text style={[styles.use, { color: colors.secondary }]}>{describeSession(session)}</Text>
                </View>
              </View>
              <ActionRow
                icon="sync"
                title="Sync now"
                detail={syncedAt ? `Last synced ${formatSynced(syncedAt)}` : 'Not synced yet'}
                onPress={syncAgain}
                disabled={busy}
                divider
              />
              <ActionRow icon="logout" title="Sign out" detail="Keeps everything on this phone" onPress={confirmSignOut} disabled={busy} divider />
              <ActionRow
                icon="delete"
                title="Delete account"
                detail="Removes your account and its backup"
                onPress={confirmDelete}
                disabled={busy}
                divider
              />
            </View>
          ) : (
            <SignInButtons onSignIn={startSignIn} disabled={busy} />
          )}
          <Text style={[styles.footnote, { color: colors.secondary }]}>
            {session
              ? 'Your list, plans and memories sync with your other phones. Photos stay on each phone for now.'
              : 'Optional. Sign in to back up your list, plans and memories and keep them the same on your other phones. The app works the same without an account.'}
          </Text>
        </>
      )}

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
        {session
          ? 'A backup file also keeps your photos, which syncing doesn’t yet.'
          : 'Everything stays on this phone. A backup is the way to move it to a new one.'}
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

      {canReport && (
        <>
          <Text style={[styles.section, { color: colors.secondary }]}>Feedback</Text>
          <View style={[styles.list, { backgroundColor: colors.card }]}>
            <ActionRow
              icon="send"
              title="Send feedback"
              detail="An idea, a bug, or a place we should add"
              onPress={() => sendFeedback(version, `${Platform.OS} ${Platform.Version}`)}
            />
          </View>
        </>
      )}

      <Text style={[styles.version, { color: colors.tertiary }]}>
        Try Something New{version ? ` ${version}` : ''}
      </Text>
    </ScrollView>
  );
}

function formatSynced(iso: string): string {
  const at = new Date(iso);
  const time = at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return at.toDateString() === new Date().toDateString() ? `today at ${time}` : `${at.toLocaleDateString()} at ${time}`;
}

/** Apple's own button on iPhone, as Apple asks, and plain matching buttons elsewhere. */
function SignInButtons({ onSignIn, disabled }: { onSignIn: (provider: Provider) => void; disabled: boolean }) {
  const colors = useColors();
  const dark = useColorScheme() === 'dark';
  const button = (provider: Provider, label: string) => (
    <Pressable
      key={provider}
      onPress={() => onSignIn(provider)}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.signIn,
        { backgroundColor: dark ? '#fff' : '#000', opacity: pressed || disabled ? 0.6 : 1 },
      ]}
    >
      <Text style={[styles.signInText, { color: dark ? '#000' : '#fff' }]}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={[styles.list, styles.signInList, { backgroundColor: colors.card }]}>
      {Platform.OS === 'ios' ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={
            dark ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={12}
          style={[styles.signIn, disabled && { opacity: 0.6 }]}
          onPress={() => !disabled && onSignIn('apple')}
        />
      ) : (
        button('apple', 'Continue with Apple')
      )}
      {button('google', 'Continue with Google')}
    </View>
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
  signInList: { padding: 14, gap: 10 },
  signIn: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  signInText: { fontSize: 17, fontWeight: '600' },
  version: { fontSize: 13, textAlign: 'center', marginTop: 16 },
});
