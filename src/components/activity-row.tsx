import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { Entry } from '@/data/catalog';
import { formatMinutes } from '@/data/drive';
import { useColors } from '@/theme';
import { GradientIcon, Icon } from './icon';

export const ActivityRow = memo(function ActivityRow({
  activity,
  done,
  minutes,
  hint,
  onToggle,
}: {
  activity: Entry;
  done: boolean;
  minutes: number | null;
  hint: string;
  onToggle: (id: string) => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onToggle(activity.id);
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={activity.name}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: done ? colors.doneSoft : colors.card, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <GradientIcon icon={activity.icon} subcategoryId={activity.subcategory} size={40} shape="tile" />

      <View style={styles.text}>
        <Text
          style={[
            styles.name,
            { color: colors.label },
            done && { textDecorationLine: 'line-through', color: colors.secondary },
          ]}
        >
          {activity.name}
        </Text>
        <View style={styles.meta}>
          <Meta icon="payments" text={activity.cost} color={colors.secondary} />
          <Meta icon="schedule" text={activity.duration} color={colors.secondary} />
          {minutes != null && <Meta icon="directions_car" text={formatMinutes(minutes)} color={colors.secondary} />}
        </View>
        {!!hint && (
          <Text style={[styles.hint, { color: colors.tertiary }]} numberOfLines={1}>
            {hint}
          </Text>
        )}
      </View>

      <Animated.View key={done ? 'done' : 'todo'} entering={ZoomIn.springify().damping(14)}>
        <Icon
          name={done ? 'check_circle' : 'radio_button_unchecked'}
          size={24}
          color={done ? colors.done : colors.tertiary}
        />
      </Animated.View>
    </Pressable>
  );
});

function Meta({ icon, text, color }: { icon: 'payments' | 'schedule' | 'directions_car'; text: string; color: string }) {
  return (
    <View style={styles.metaItem}>
      <Icon name={icon} size={13} color={color} />
      <Text style={[styles.metaText, { color }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderCurve: 'continuous',
  },
  text: { flex: 1, gap: 4 },
  name: { fontSize: 15, fontWeight: '600' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 13 },
  hint: { fontSize: 12 },
});
