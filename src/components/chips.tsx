import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { IconName } from '@/icons/paths';
import { readableOn, useColors } from '@/theme';
import { Icon } from './icon';

export function MetadataTag({ icon, text }: { icon: IconName; text: string }) {
  const colors = useColors();
  return (
    <View style={[styles.tag, { backgroundColor: colors.fill }]}>
      <Icon name={icon} size={14} color={colors.secondary} />
      <Text style={[styles.tagText, { color: colors.label }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

export function FilterChip({
  title,
  icon,
  color,
  selected,
  onPress,
}: {
  title: string;
  icon: IconName;
  color: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? color : `${color}1A`, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Icon name={icon} size={14} color={selected ? readableOn(color) : color} />
      <Text style={[styles.chipText, { color: selected ? readableOn(color) : color }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  tagText: { fontSize: 13 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  chipText: { fontSize: 13, fontWeight: '700' },
});
