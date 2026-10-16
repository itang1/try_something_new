import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Venue } from './data';

function openDirections(v: Venue) {
  const url = Platform.select({
    ios: `maps://?daddr=${v.lat},${v.lng}`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}`,
  });
  Linking.openURL(url);
}

export function VenueCard({ venue, onClose }: { venue: Venue | null; onClose: () => void }) {
  // Keep the last venue so the card can slide out with its content still showing.
  const [shown, setShown] = useState<Venue | null>(venue);
  const offset = useSharedValue(300);
  if (venue && venue !== shown) setShown(venue);

  useEffect(() => {
    if (venue) {
      offset.value = withSpring(0, { damping: 18, stiffness: 180 });
    } else {
      offset.value = withTiming(300, { duration: 200 });
    }
  }, [venue, offset]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));

  if (!shown) return null;
  return (
    <Animated.View style={[styles.card, style]}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: shown.subcategory.color }]}>
          <MaterialCommunityIcons name={shown.icon} size={28} color="white" />
        </View>
        <View style={styles.text}>
          <Text style={styles.name}>{shown.name}</Text>
          <Text style={styles.meta}>
            {shown.subcategory.label} · {shown.city}
          </Text>
        </View>
        <Pressable onPress={onClose} hitSlop={12}>
          <MaterialCommunityIcons name="close-circle" size={26} color="#9CA3AF" />
        </Pressable>
      </View>
      <Pressable style={styles.button} onPress={() => openDirections(shown)}>
        <Text style={styles.buttonText}>Directions</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
  name: { fontSize: 18, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  button: { backgroundColor: '#F97316', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});
