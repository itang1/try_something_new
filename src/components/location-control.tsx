import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppState } from '@/state/app-state';
import { useColors } from '@/theme';
import { Icon } from '@/components/icon';
import type { IconName } from '@/icons/paths';

export function LocationControl() {
  const colors = useColors();
  const router = useRouter();
  const { city, home, trip } = useAppState();

  let icon: IconName = 'location_on';
  let title = 'Set your location';
  let subtitle = `Showing ${city.name}. Add yours for drive times.`;
  if (trip) {
    icon = 'flight';
    title = `Trip to ${city.name}`;
    subtitle = trip.start ? `From ${trip.start.name}` : "Set where you're staying";
  } else if (home) {
    title = `Near ${home.name}`;
    subtitle = `Things to do around ${city.name}`;
  }

  return (
    <Pressable
      onPress={() => router.push('/location')}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      accessibilityHint="Changes where drive times start"
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Icon name={icon} size={20} color={colors.accent} />
      <View style={styles.text}>
        <Text style={[styles.title, { color: colors.accent }]} numberOfLines={2}>
          {title}
        </Text>
        <Text style={[styles.subtitle, { color: colors.secondary }]} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <Icon name="keyboard_arrow_down" size={20} color={colors.accent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, alignSelf: 'flex-start' },
  text: { flexShrink: 1 },
  title: { fontSize: 17, fontWeight: '600' },
  subtitle: { fontSize: 13 },
});
