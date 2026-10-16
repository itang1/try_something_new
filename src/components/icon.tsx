import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { ICON_PATHS, type IconName } from '@/icons/paths';
import { subcategory } from '@/theme';

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 -960 960 960">
      <Path d={ICON_PATHS[name]} fill={color} />
    </Svg>
  );
}

/** An activity icon on its subcategory's gradient, as a circle or a rounded tile. */
export function GradientIcon({
  icon,
  subcategoryId,
  size,
  shape,
  style,
}: {
  icon: IconName;
  subcategoryId: string;
  size: number;
  shape: 'circle' | 'tile';
  style?: StyleProp<ViewStyle>;
}) {
  const sub = subcategory(subcategoryId);
  return (
    <LinearGradient
      colors={sub.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.center,
        { width: size, height: size, borderRadius: shape === 'circle' ? size / 2 : size / 4 },
        style,
      ]}
    >
      <Icon name={icon} size={size * (shape === 'circle' ? 0.42 : 0.55)} color="white" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
