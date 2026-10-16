import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Venue } from './data';

// tracksViewChanges stays off: re-snapshotting marker views on every frame is what makes
// react-native-maps stutter. A selection change remounts the marker via its key instead.
export const VenuePin = memo(function VenuePin({
  venue,
  selected,
  onPress,
}: {
  venue: Venue;
  selected: boolean;
  onPress: (venue: Venue) => void;
}) {
  const size = selected ? 48 : 34;
  return (
    <Marker
      coordinate={{ latitude: venue.lat, longitude: venue.lng }}
      tracksViewChanges={false}
      onPress={() => onPress(venue)}
      zIndex={selected ? 2 : 1}
    >
      <View
        style={[
          styles.pin,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: venue.subcategory.color },
        ]}
      >
        <MaterialCommunityIcons name={venue.icon} size={size * 0.55} color="white" />
      </View>
    </Marker>
  );
});

export const ClusterPin = memo(function ClusterPin({
  latitude,
  longitude,
  count,
  onPress,
}: {
  latitude: number;
  longitude: number;
  count: number;
  onPress: () => void;
}) {
  const size = count < 10 ? 38 : count < 100 ? 46 : 56;
  return (
    <Marker coordinate={{ latitude, longitude }} tracksViewChanges={false} onPress={onPress}>
      <View style={[styles.cluster, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={styles.count}>{count >= 1000 ? `${Math.round(count / 100) / 10}k` : count}</Text>
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  pin: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  cluster: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  count: { color: 'white', fontWeight: '700', fontSize: 15 },
});
