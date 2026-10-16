import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { currentLocation, geocodeAddress } from '@/data/location';
import { useAppState, type HomeLocation } from '@/state/app-state';
import { useColors } from '@/theme';
import { Icon } from '@/components/icon';

export default function LocationSheet() {
  const colors = useColors();
  const router = useRouter();
  const { setLocation, recentAddresses } = useAppState();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<'gps' | 'address' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const finish = (found: HomeLocation | null, remember: boolean, failure: string) => {
    setBusy(null);
    if (!found) {
      setError(failure);
      return;
    }
    setLocation(found, { remember });
    router.back();
  };

  const useGps = async () => {
    setError(null);
    setBusy('gps');
    finish(await currentLocation(), false, "Couldn't get your location. Check location permission in Settings.");
  };

  const lookUp = async (address: string) => {
    const trimmed = address.trim();
    if (!trimmed) return;
    setError(null);
    setBusy('address');
    finish(await geocodeAddress(trimmed), true, `Couldn't find "${trimmed}".`);
  };

  return (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.label }]}>Your Location</Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.done, { color: colors.blue }]}>Done</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={useGps}
        disabled={busy !== null}
        style={({ pressed }) => [
          styles.gps,
          { backgroundColor: `${colors.blue}1A`, opacity: pressed || busy === 'gps' ? 0.6 : 1 },
        ]}
      >
        <Icon name="my_location" size={18} color={colors.blue} />
        <Text style={[styles.gpsText, { color: colors.blue }]}>
          {busy === 'gps' ? 'Locating…' : 'Use My Current Location'}
        </Text>
      </Pressable>

      <View style={[styles.field, { backgroundColor: colors.fill }]}>
        <TextInput
          value={text}
          onChangeText={(t) => {
            setText(t);
            setError(null);
          }}
          onSubmitEditing={() => lookUp(text)}
          placeholder="Enter a city or address"
          placeholderTextColor={colors.tertiary}
          returnKeyType="search"
          autoCorrect={false}
          style={[styles.input, { color: colors.label }]}
        />
        {busy === 'address' ? (
          <ActivityIndicator />
        ) : (
          !!text && (
            <Pressable onPress={() => lookUp(text)} hitSlop={8} accessibilityLabel="Search">
              <Icon name="search" size={22} color={colors.blue} />
            </Pressable>
          )
        )}
      </View>

      {error && <Text style={[styles.error, { color: '#FF3B30' }]}>{error}</Text>}

      {!text && recentAddresses.length > 0 && (
        <View>
          <Text style={[styles.recentLabel, { color: colors.secondary }]}>Recent</Text>
          {recentAddresses.map((address, i) => (
            <Pressable
              key={address}
              onPress={() => lookUp(address)}
              disabled={busy !== null}
              style={({ pressed }) => [
                styles.recent,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Icon name="history" size={18} color={colors.secondary} />
              <Text style={[styles.recentText, { color: colors.label }]}>{address}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, padding: 16, paddingTop: 24, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 17, fontWeight: '600' },
  done: { fontSize: 17, fontWeight: '600' },
  gps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  gpsText: { fontSize: 17, fontWeight: '500' },
  field: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, paddingHorizontal: 12 },
  input: { flex: 1, fontSize: 17, paddingVertical: 10 },
  error: { fontSize: 13 },
  recentLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4, marginLeft: 4 },
  recent: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 4 },
  recentText: { fontSize: 15 },
});
