import { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { subcategory } from '@/theme';
import type { IconName } from '@/icons/paths';
import { Icon } from './icon';

// Markers render as snapshots. Tracking stays on briefly so the SVG icon draws, then turns off,
// because re-snapshotting on every frame is what makes react-native-maps stutter.
function useBriefTracking() {
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setTracking(false), 600);
    return () => clearTimeout(id);
  }, []);
  return tracking;
}

export const PlacePin = memo(function PlacePin({
  latitude,
  longitude,
  icon,
  subcategoryId,
  done,
  selected,
  onPress,
}: {
  latitude: number;
  longitude: number;
  icon: IconName;
  subcategoryId: string;
  done: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  const tracking = useBriefTracking();
  const size = selected ? 46 : 34;
  const { gradient } = subcategory(subcategoryId);
  return (
    <Marker
      coordinate={{ latitude, longitude }}
      tracksViewChanges={tracking}
      onPress={onPress}
      zIndex={selected ? 2 : 1}
    >
      <View style={[styles.pin, { width: size, height: size, borderRadius: size / 2, opacity: done ? 0.55 : 1 }]}>
        {/* An SVG gradient, because expo-linear-gradient inside a marker swallows the tap on iOS. */}
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgGradient id="fill" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={gradient[0]} />
              <Stop offset="1" stopColor={gradient[1]} />
            </SvgGradient>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={size / 2 - 1.25} fill="url(#fill)" stroke="white" strokeWidth={2.5} />
        </Svg>
        <Icon name={done ? 'check' : icon} size={size * 0.55} color="white" />
      </View>
    </Marker>
  );
});

export const ClusterPin = memo(function ClusterPin({
  latitude,
  longitude,
  count,
  color,
  onPress,
}: {
  latitude: number;
  longitude: number;
  count: number;
  color: string;
  onPress: () => void;
}) {
  const tracking = useBriefTracking();
  const size = count < 10 ? 38 : count < 100 ? 46 : 56;
  return (
    <Marker coordinate={{ latitude, longitude }} tracksViewChanges={tracking} onPress={onPress}>
      <View style={[styles.cluster, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.count, { color }]}>{count}</Text>
      </View>
    </Marker>
  );
});

const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.25,
  shadowRadius: 3,
  shadowOffset: { width: 0, height: 2 },
  elevation: 4,
};

const styles = StyleSheet.create({
  pin: { alignItems: 'center', justifyContent: 'center', ...shadow },
  cluster: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', ...shadow },
  count: { fontSize: 15, fontWeight: '700' },
});
