import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CITIES, nearestCity } from '@/data/catalog';
import { currentLocation, geocodeAddress } from '@/data/location';
import { useAppState, type HomeLocation } from '@/state/app-state';
import { useColors } from '@/theme';
import { Icon } from '@/components/icon';

// Farther than this from every city center, a place gets no "area" label.
const AREA_KM = 150;

function areaName(place: HomeLocation): string | null {
  const { city, km } = nearestCity(place);
  return km <= AREA_KM ? `${city.name} area` : null;
}

export default function LocationSheet() {
  const colors = useColors();
  const router = useRouter();
  const { city, home, trip, origin, setLocation, startTrip, endTrip, recentPlaces } = useAppState();
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

  const homeCityId = home ? nearestCity(home).city.id : null;
  const tripCities = CITIES.filter((c) => c.id !== homeCityId);
  // On a trip, only places in that city make sense as a starting point.
  const recents = trip ? recentPlaces.filter((p) => nearestCity(p).city.id === trip.cityId) : recentPlaces;

  return (
    <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.label }]}>
          {trip ? `Where are you staying in ${city.name}?` : 'Where are you?'}
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.done, { color: colors.accent }]}>Done</Text>
        </Pressable>
      </View>

      {trip && (
        <View style={[styles.card, styles.tripCard, { backgroundColor: colors.card }]}>
          <Icon name="flight" size={24} color={colors.done} />
          <View style={styles.grow}>
            <Text style={[styles.optionTitle, { color: colors.label, fontWeight: '600' }]}>Trip to {city.name}</Text>
            <Text style={[styles.optionSubtitle, { color: colors.secondary }]}>
              {home ? `Ending it goes back to ${home.name}.` : 'Ending it goes back to your home location.'}
            </Text>
          </View>
          <Pressable
            onPress={endTrip}
            style={({ pressed }) => [styles.chip, { backgroundColor: colors.fill, opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.chipText, { color: colors.label }]}>End trip</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.group}>
        <Text style={[styles.label, { color: colors.secondary }]}>Drive times start here</Text>
        <View style={[styles.field, { backgroundColor: colors.fill }]}>
          <Icon name="search" size={20} color={colors.secondary} />
          <TextInput
            value={text}
            onChangeText={(t) => {
              setText(t);
              setError(null);
            }}
            onSubmitEditing={() => lookUp(text)}
            placeholder={trip ? 'Hotel, address, or neighborhood' : 'Search a city or address'}
            placeholderTextColor={colors.tertiary}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Drive times start here"
            style={[styles.input, { color: colors.label }]}
          />
          {busy === 'address' && <ActivityIndicator />}
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      {!text && (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Pressable
            onPress={useGps}
            disabled={busy !== null}
            style={({ pressed }) => [styles.option, { opacity: pressed || busy === 'gps' ? 0.6 : 1 }]}
          >
            <Icon name="my_location" size={20} color={colors.blue} />
            <Text style={[styles.optionTitle, styles.grow, { color: colors.blue, fontWeight: '600' }]}>
              {busy === 'gps' ? 'Locating…' : 'Use my current location'}
            </Text>
          </Pressable>
          {recents.map((place) => {
            const area = areaName(place);
            const current = place.name === origin?.name;
            return (
              <Pressable
                key={place.name}
                onPress={() => finish(place, true, '')}
                disabled={busy !== null}
                accessibilityState={{ selected: current }}
                style={({ pressed }) => [
                  styles.option,
                  { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Icon name="history" size={20} color={colors.secondary} />
                <View style={styles.grow}>
                  <Text style={[styles.optionTitle, { color: colors.label }]}>{place.name}</Text>
                  {area && <Text style={[styles.optionSubtitle, { color: colors.secondary }]}>{area}</Text>}
                </View>
                {current && <Icon name="check" size={20} color={colors.accent} />}
              </Pressable>
            );
          })}
        </View>
      )}

      {!trip &&
        tripCities.length > 0 && (
          <View style={styles.group}>
            <Text style={[styles.section, { color: colors.secondary }]}>Going somewhere?</Text>
            <View style={[styles.card, styles.tripCard, { backgroundColor: colors.card }]}>
              <Icon name="flight" size={24} color={colors.done} />
              <View style={styles.grow}>
                <Text style={[styles.optionTitle, { color: colors.label, fontWeight: '600' }]}>Plan a trip</Text>
                <Text style={[styles.optionSubtitle, { color: colors.secondary }]}>
                  Pick a city, then where you&apos;re staying. Your home checklist stays as it is.
                </Text>
                <View style={styles.chips}>
                  {tripCities.map((c) => (
                    <Pressable
                      key={c.id}
                      onPress={() => startTrip(c.id)}
                      style={({ pressed }) => [
                        styles.chip,
                        { backgroundColor: colors.accentSoft, opacity: pressed ? 0.6 : 1 },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: colors.accent }]}>
                        {c.name}, {c.state}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sheet: { padding: 16, paddingTop: 24, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 20, fontWeight: '700', flexShrink: 1 },
  done: { fontSize: 17, fontWeight: '600' },
  group: { gap: 6 },
  label: { fontSize: 13, marginLeft: 4 },
  section: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginLeft: 4 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12 },
  input: { flex: 1, fontSize: 17, paddingVertical: 12 },
  error: { fontSize: 13, color: '#FF3B30', marginLeft: 4 },
  card: { borderRadius: 16, overflow: 'hidden' },
  tripCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 14 },
  optionTitle: { fontSize: 16 },
  optionSubtitle: { fontSize: 13, marginTop: 2 },
  grow: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { minHeight: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: 'center' },
  chipText: { fontSize: 15, fontWeight: '600' },
});
