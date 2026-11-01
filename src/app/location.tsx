import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { cityLabel, type CitySummary } from '@/data/catalog';
import { ANYWHERE_ID, cityIdFor, cityIndex, nearestCity, RANGES, roughDrive } from '@/data/cities';
import { haversineKm } from '@/data/drive';
import { currentLocation, geocodeAddress, type GeocodeFailure } from '@/data/location';
import { useAppState, type HomeLocation } from '@/state/app-state';
import { useColors } from '@/theme';
import { Icon } from '@/components/icon';
import type { IconName } from '@/icons/paths';

// With more cities than this, the trip picker searches instead of listing them all.
const MAX_TRIP_CHIPS = 8;

/** Matches a typed name against the cities with places, like "sea" or "Seattle, WA". */
function matchingCities(cities: CitySummary[], text: string): CitySummary[] {
  const query = text.trim().toLocaleLowerCase();
  if (query.length < 2) return [];
  return cities.filter((c) => {
    const label = cityLabel(c).toLocaleLowerCase();
    return label.startsWith(query) || c.name.toLocaleLowerCase().includes(query) || query.startsWith(c.name.toLocaleLowerCase());
  });
}

export default function LocationSheet() {
  const colors = useColors();
  const router = useRouter();
  const { city, pendingCity, home, trip, origin, setLocation, startTrip, endTrip, recentPlaces, cityChoice, chooseCity, rangeKm, setRangeKm, nearest } =
    useAppState();
  const [text, setText] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [busy, setBusy] = useState<'gps' | 'address' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const finish = (found: HomeLocation | null, remember: boolean, failure: string) => {
    setBusy(null);
    if (!found) {
      setError(failure);
      return;
    }
    Haptics.selectionAsync();
    setLocation(found, { remember });
    router.back();
  };

  const useGps = async () => {
    setError(null);
    setBusy('gps');
    finish(await currentLocation(), false, "Couldn't get your location. Check location permission in Settings, or search for your town.");
  };

  const lookUp = async (address: string) => {
    const trimmed = address.trim();
    if (!trimmed || busy) return;
    setError(null);
    setBusy('address');
    const found: HomeLocation | GeocodeFailure = await geocodeAddress(trimmed);
    const failure =
      found === 'no-permission'
        ? 'Searching needs location permission on Android. Turn it on in Settings, or pick a city below.'
        : `Couldn't find "${trimmed}". Try a town and state, like "Pasadena, CA", or a ZIP code.`;
    finish(typeof found === 'string' ? null : found, true, failure);
  };

  const pickCity = (id: string | null) => {
    Haptics.selectionAsync();
    chooseCity(id);
    router.back();
  };

  const cities = cityIndex();
  // The city on screen, even while a stand-in shows until it downloads.
  const shownId = pendingCity?.id ?? city.id;
  const autoId = cityIdFor(home, rangeKm);
  const covered = !trip && shownId !== ANYWHERE_ID;
  const byDistance = [...cities].sort((a, b) =>
    home ? haversineKm(home, a.lat, a.lng) - haversineKm(home, b.lat, b.lng) : a.name.localeCompare(b.name),
  );
  const typedCities = trip ? [] : matchingCities(cities, text);

  // Far from every city, the nearest one is still a trip.
  const otherCities = cities.filter((c) => c.id !== shownId);
  const searchable = otherCities.length > MAX_TRIP_CHIPS;
  const query = cityQuery.trim().toLocaleLowerCase();
  const tripCities = otherCities
    .filter((c) => !query || cityLabel(c).toLocaleLowerCase().includes(query))
    .sort((a, b) =>
      home && !query ? haversineKm(home, a.lat, a.lng) - haversineKm(home, b.lat, b.lng) : a.name.localeCompare(b.name),
    )
    .slice(0, MAX_TRIP_CHIPS);
  // On a trip, only places in that city make sense as a starting point.
  const recents = trip ? recentPlaces.filter((p) => nearestCity(p).city.id === trip.cityId) : recentPlaces;

  // What the app is showing, and why, so nobody has to guess.
  let status: { icon: IconName; tint: string; title: string; body: string; action?: { label: string; onPress: () => void } };
  const shownName = pendingCity?.name ?? city.name;
  if (cityChoice === ANYWHERE_ID) {
    status = {
      icon: 'cottage',
      tint: colors.accent,
      title: 'Ideas for home and anywhere',
      body: 'You chose no city, so there are no places or drive times.',
      action: home ? { label: 'Follow my location', onPress: () => pickCity(null) } : undefined,
    };
  } else if (cityChoice) {
    status = {
      icon: 'check_circle',
      tint: colors.done,
      title: `Showing ${shownName}`,
      body: home
        ? `You picked it. ${home.name} is ${roughDrive(haversineKm(home, city.lat, city.lng))} away, and drive times start there.`
        : 'You picked it. Add where you are for drive times from your door.',
      action: home && autoId !== cityChoice ? { label: 'Follow my location', onPress: () => pickCity(null) } : undefined,
    };
  } else if (home && covered && nearest) {
    status = {
      icon: 'check_circle',
      tint: colors.done,
      title: `Showing ${shownName}`,
      body:
        nearest.km < 40
          ? `${home.name} is in the ${nearest.city.name} area.`
          : `${home.name} is ${roughDrive(nearest.km)} from ${nearest.city.name}, inside how far you'll go.`,
    };
  } else if (home && nearest) {
    status = {
      icon: 'info',
      tint: colors.blue,
      title: `${home.name} isn't covered yet`,
      body: `The nearest city with places is ${cityLabel(nearest.city)}, ${roughDrive(nearest.km)} away. Until yours is added you get ideas for home and anywhere, or use ${nearest.city.name}.`,
      action: { label: `Use ${nearest.city.name}`, onPress: () => pickCity(nearest.city.id) },
    };
  } else {
    status = {
      icon: 'location_on',
      tint: colors.accent,
      title: 'No location yet',
      body: 'For now you get ideas for home and anywhere. Search for your town, or pick a city below.',
    };
  }

  return (
    <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.label }]} accessibilityRole="header">
          {trip ? `Where are you staying in ${city.name}?` : 'Your location'}
        </Text>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.done, { color: colors.accent }]}>Done</Text>
        </Pressable>
      </View>

      {trip && (
        <View style={[styles.card, styles.tripCard, { backgroundColor: colors.card }]}>
          <Icon name="flight" size={24} color={colors.done} />
          <View style={styles.grow}>
            <Text style={[styles.optionTitle, { color: colors.label, fontWeight: '600' }]}>Trip to {(pendingCity ?? city).name}</Text>
            <Text style={[styles.optionSubtitle, { color: colors.secondary }]}>
              {pendingCity && `Downloading ${pendingCity.name}. `}
              {home ? `Ending it goes back to ${home.name}.` : 'Ending it goes back to your home location.'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={endTrip}
            style={({ pressed }) => [styles.chip, { backgroundColor: colors.fill, opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.chipText, { color: colors.label }]}>End trip</Text>
          </Pressable>
        </View>
      )}

      {!trip && (
        <View style={[styles.card, styles.status, { backgroundColor: colors.card }]}>
          <Icon name={status.icon} size={24} color={status.tint} />
          <View style={styles.grow}>
            <Text style={[styles.optionTitle, { color: colors.label, fontWeight: '600' }]}>{status.title}</Text>
            <Text style={[styles.optionSubtitle, { color: colors.secondary }]}>
              {pendingCity ? `Downloading ${pendingCity.name}. ` : ''}
              {status.body}
            </Text>
            {status.action && (
              <Pressable
                accessibilityRole="button"
                onPress={status.action.onPress}
                style={({ pressed }) => [styles.chip, styles.statusButton, { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 }]}
              >
                <Text style={[styles.chipText, { color: colors.onAccent }]}>{status.action.label}</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      <View style={styles.group}>
        <Text style={[styles.section, { color: colors.secondary }]}>{trip ? 'Drive times start here' : 'Where you live'}</Text>
        <View style={[styles.field, { backgroundColor: colors.fill }]}>
          <Icon name="search" size={20} color={colors.secondary} />
          <TextInput
            value={text}
            onChangeText={(t) => {
              setText(t);
              setError(null);
            }}
            onSubmitEditing={() => lookUp(text)}
            placeholder={trip ? 'Hotel, address, or neighborhood' : 'Town, address, or ZIP code'}
            placeholderTextColor={colors.tertiary}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel={trip ? 'Drive times start here' : 'Where you live'}
            style={[styles.input, { color: colors.label }]}
          />
          {busy === 'address' ? (
            <ActivityIndicator />
          ) : (
            text.trim().length > 0 && (
              <Pressable
                accessibilityRole="button"
                onPress={() => lookUp(text)}
                hitSlop={8}
                style={({ pressed }) => [styles.searchButton, { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 }]}
              >
                <Text style={[styles.searchText, { color: colors.onAccent }]}>Search</Text>
              </Pressable>
            )
          )}
        </View>
        {error ? (
          <Text style={[styles.note, { color: colors.red }]} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : (
          <Text style={[styles.note, { color: colors.tertiary }]}>
            {trip ? 'Drive times start from here.' : 'Used only for nearby places and drive times.'}
          </Text>
        )}
      </View>

      {typedCities.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {typedCities.map((c, i) => (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityHint="Shows this city's places"
              onPress={() => pickCity(c.id === autoId ? null : c.id)}
              style={({ pressed }) => [styles.option, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator }, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Icon name="location_city" size={20} color={colors.accent} />
              <View style={styles.grow}>
                <Text style={[styles.optionTitle, { color: colors.label }]}>{cityLabel(c)}</Text>
                <Text style={[styles.optionSubtitle, { color: colors.secondary }]}>Has places mapped. Tap to use it.</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {!text && (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Pressable
            accessibilityRole="button"
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
            const near = nearestCity(place);
            const area = near.km <= rangeKm ? `${near.city.name} area` : 'No city nearby yet';
            const current = place.name === origin?.name;
            return (
              <Pressable
                accessibilityRole="button"
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
                  {!trip && <Text style={[styles.optionSubtitle, { color: colors.secondary }]}>{area}</Text>}
                </View>
                {current && <Icon name="check" size={20} color={colors.accent} />}
              </Pressable>
            );
          })}
        </View>
      )}

      {!trip && home && (
        <View style={styles.group}>
          <Text style={[styles.section, { color: colors.secondary }]}>How far will you go?</Text>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {RANGES.map((r) => {
              const selected = r.km === rangeKm;
              return (
                <Pressable
                  key={r.km}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Up to ${r.label} away`}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setRangeKm(r.km);
                  }}
                  style={({ pressed }) => [
                    styles.chip,
                    { backgroundColor: selected ? colors.accent : colors.accentSoft, opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Text style={[styles.chipText, { color: selected ? colors.onAccent : colors.accent }]}>{r.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.note, { color: colors.tertiary }]}>
            A rough drive from home. A city within it becomes your city, so a neighboring town still gets its places.
          </Text>
        </View>
      )}

      {!trip && (
        <View style={styles.group}>
          <Text style={[styles.section, { color: colors.secondary }]}>Cities with places</Text>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            {byDistance.map((c, i) => {
              const selected = c.id === shownId && cityChoice !== ANYWHERE_ID;
              const km = home ? haversineKm(home, c.lat, c.lng) : null;
              const detail = km == null ? null : km <= rangeKm ? `${roughDrive(km)} · in range` : roughDrive(km);
              return (
                <Pressable
                  key={c.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityHint="Shows this city's places"
                  onPress={() => pickCity(c.id === autoId ? null : c.id)}
                  style={({ pressed }) => [
                    styles.option,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Icon name="location_city" size={20} color={colors.accent} />
                  <View style={styles.grow}>
                    <Text style={[styles.optionTitle, { color: colors.label }]}>{cityLabel(c)}</Text>
                    {detail && <Text style={[styles.optionSubtitle, { color: colors.secondary }]}>{detail}</Text>}
                  </View>
                  <Icon
                    name={selected ? 'check_circle' : 'radio_button_unchecked'}
                    size={22}
                    color={selected ? colors.accent : colors.tertiary}
                  />
                </Pressable>
              );
            })}
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: shownId === ANYWHERE_ID }}
              onPress={() => pickCity(home && autoId === ANYWHERE_ID ? null : ANYWHERE_ID)}
              style={({ pressed }) => [
                styles.option,
                { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Icon name="cottage" size={20} color={colors.accent} />
              <View style={styles.grow}>
                <Text style={[styles.optionTitle, { color: colors.label }]}>No city</Text>
                <Text style={[styles.optionSubtitle, { color: colors.secondary }]}>Just ideas for home and anywhere</Text>
              </View>
              <Icon
                name={shownId === ANYWHERE_ID ? 'check_circle' : 'radio_button_unchecked'}
                size={22}
                color={shownId === ANYWHERE_ID ? colors.accent : colors.tertiary}
              />
            </Pressable>
          </View>
          <Text style={[styles.note, { color: colors.tertiary }]}>
            More cities are on the way. Anywhere else, you still get ideas for home and anywhere outside.
          </Text>
        </View>
      )}

      {!trip && otherCities.length > 0 && (
        <View style={styles.group}>
          <Text style={[styles.section, { color: colors.secondary }]}>Going somewhere?</Text>
          <View style={[styles.card, styles.tripCard, { backgroundColor: colors.card }]}>
            <Icon name="flight" size={24} color={colors.done} />
            <View style={styles.grow}>
              <Text style={[styles.optionTitle, { color: colors.label, fontWeight: '600' }]}>Plan a trip</Text>
              <Text style={[styles.optionSubtitle, { color: colors.secondary }]}>
                Pick a city, then where you&apos;re staying. Your home city stays as it is.
              </Text>
              {searchable && (
                <View style={[styles.field, styles.cityField, { backgroundColor: colors.fill }]}>
                  <Icon name="search" size={18} color={colors.secondary} />
                  <TextInput
                    value={cityQuery}
                    onChangeText={setCityQuery}
                    placeholder="Search cities"
                    placeholderTextColor={colors.tertiary}
                    autoCorrect={false}
                    accessibilityLabel="Search cities"
                    style={[styles.input, styles.cityInput, { color: colors.label }]}
                  />
                </View>
              )}
              <View style={[styles.chips, styles.tripChips]}>
                {tripCities.map((c) => (
                  <Pressable
                    accessibilityRole="button"
                    key={c.id}
                    onPress={() => startTrip(c.id)}
                    style={({ pressed }) => [styles.chip, { backgroundColor: colors.accentSoft, opacity: pressed ? 0.6 : 1 }]}
                  >
                    <Text style={[styles.chipText, { color: colors.accent }]}>{cityLabel(c)}</Text>
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
  sheet: { padding: 16, paddingTop: 24, paddingBottom: 40, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 20, fontWeight: '700', flexShrink: 1 },
  done: { fontSize: 17, fontWeight: '600' },
  group: { gap: 6 },
  section: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginLeft: 4 },
  note: { fontSize: 13, marginLeft: 4 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingLeft: 12, paddingRight: 6, minHeight: 48 },
  input: { flex: 1, fontSize: 17, paddingVertical: 12 },
  searchButton: { minHeight: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: 'center' },
  searchText: { fontSize: 15, fontWeight: '600' },
  card: { borderRadius: 16, overflow: 'hidden' },
  status: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  statusButton: { alignSelf: 'flex-start', marginTop: 10 },
  tripCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 14, paddingVertical: 8 },
  optionTitle: { fontSize: 16 },
  optionSubtitle: { fontSize: 13, marginTop: 2 },
  grow: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tripChips: { marginTop: 10 },
  cityField: { marginTop: 10, borderRadius: 10 },
  cityInput: { fontSize: 16, paddingVertical: 8 },
  chip: { minHeight: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: 'center' },
  chipText: { fontSize: 15, fontWeight: '600' },
});
