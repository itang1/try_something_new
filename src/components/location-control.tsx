import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ANYWHERE_ID } from '@/data/cities';
import { useAppState } from '@/state/app-state';
import { useColors } from '@/theme';
import { Icon } from '@/components/icon';
import type { IconName } from '@/icons/paths';

/** Where Explore and the Map are showing, and a clear Change button that opens the location sheet. */
export function LocationControl() {
  const colors = useColors();
  const router = useRouter();
  const { city, pendingCity, home, trip, cityChoice, nearest } = useAppState();

  const anywhere = city.id === ANYWHERE_ID && !pendingCity;
  const cityName = (pendingCity ?? city).name;
  let icon: IconName = 'location_on';
  let title: string;
  let subtitle: string;
  if (trip) {
    icon = 'flight';
    title = `Trip to ${cityName}`;
    subtitle = trip.start ? `Travel times from ${trip.start.name}` : "Set where you're staying for travel times";
  } else if (!home) {
    title = anywhere ? 'Set your location' : cityName;
    subtitle = anywhere ? 'Ideas for home and anywhere. Pick a city or set yours for places nearby.' : 'Add where you are for travel times';
  } else if (anywhere) {
    title = home.name;
    subtitle =
      cityChoice === ANYWHERE_ID || !nearest
        ? 'Ideas for home and anywhere'
        : `No places mapped here yet. ${nearest.city.name} is the nearest city.`;
  } else {
    title = home.name;
    subtitle = cityChoice ? `Places around ${cityName}, your pick` : `Places around ${cityName}, or right at home`;
  }

  return (
    <Pressable
      onPress={() => router.push('/location')}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      accessibilityHint="Changes your location or city"
      style={({ pressed }) => [styles.row, { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
        <Icon name={icon} size={20} color={colors.accent} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, { color: colors.label }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.subtitle, { color: colors.secondary }]} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <View style={[styles.change, { backgroundColor: colors.accentSoft }]}>
        <Text style={[styles.changeText, { color: colors.accent }]}>{anywhere && !home && !trip ? 'Set' : 'Change'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16 },
  badge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 13, marginTop: 1 },
  change: { minHeight: 32, paddingHorizontal: 12, borderRadius: 16, justifyContent: 'center' },
  changeText: { fontSize: 14, fontWeight: '600' },
});
