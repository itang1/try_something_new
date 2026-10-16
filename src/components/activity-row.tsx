import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { Entry } from '@/data/catalog';
import { formatMinutes } from '@/data/drive';
import { subcategory, useColors } from '@/theme';
import type { IconName } from '@/icons/paths';
import { GradientIcon, Icon } from './icon';

export type PlaceProgress = { visited: number; total: number; names: string };

export const ActivityRow = memo(function ActivityRow({
  activity,
  done,
  saved,
  minutes,
  hint,
  progress,
  planned,
  onToggle,
  onOpen,
}: {
  activity: Entry;
  done: boolean;
  saved: boolean;
  minutes: number | null;
  hint: string;
  /** Shown once you've visited one of several places. */
  progress: PlaceProgress | null;
  /** The planned day, already formatted. */
  planned?: string;
  onToggle: (entry: Entry) => void;
  onOpen: (id: string) => void;
}) {
  const colors = useColors();
  const tint = subcategory(activity.subcategory).color;
  return (
    <Pressable
      onPress={() => onOpen(activity.id)}
      accessibilityRole="button"
      accessibilityLabel={[
        activity.name,
        done && 'done',
        planned && `planned for ${planned}`,
        activity.cost,
        activity.duration,
        minutes != null && `${formatMinutes(minutes)} drive`,
        progress && `${progress.visited} of ${progress.total} places`,
      ]
        .filter(Boolean)
        .join(', ')}
      accessibilityHint="Shows places and directions"
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: done ? colors.doneSoft : colors.card, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <GradientIcon icon={activity.icon} subcategoryId={activity.subcategory} size={40} shape="tile" />

      <View style={styles.text}>
        <View style={styles.titleLine}>
          <Text
            style={[
              styles.name,
              { color: colors.label },
              done && { textDecorationLine: 'line-through', color: colors.secondary },
            ]}
          >
            {activity.name}
          </Text>
          {saved && <Icon name="bookmark" size={14} color={colors.accent} />}
        </View>
        <View style={styles.meta}>
          <Meta icon="payments" text={activity.cost} color={colors.secondary} />
          <Meta icon="schedule" text={activity.duration} color={colors.secondary} />
          {minutes != null && <Meta icon="directions_car" text={formatMinutes(minutes)} color={colors.secondary} />}
          {planned && <Meta icon="calendar_month" text={planned} color={colors.accent} />}
        </View>
        {progress ? (
          <>
            <Text style={[styles.hint, { color: colors.secondary }]} numberOfLines={1}>
              {progress.visited} of {progress.total} places · {progress.names}
            </Text>
            <View style={[styles.track, { backgroundColor: colors.fill }]}>
              <View
                style={[styles.bar, { width: `${(progress.visited / progress.total) * 100}%`, backgroundColor: tint }]}
              />
            </View>
          </>
        ) : (
          !!hint && (
            <Text style={[styles.hint, { color: colors.tertiary }]} numberOfLines={1}>
              {hint}
            </Text>
          )
        )}
      </View>

      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          onToggle(activity);
        }}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={`${activity.name} done`}
      >
        <Animated.View key={done ? 'done' : 'todo'} entering={ZoomIn.springify().damping(14)}>
          <Icon
            name={done ? 'check_circle' : 'radio_button_unchecked'}
            size={26}
            color={done ? colors.done : colors.tertiary}
          />
        </Animated.View>
      </Pressable>
    </Pressable>
  );
});

function Meta({ icon, text, color }: { icon: IconName; text: string; color: string }) {
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
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 13 },
  hint: { fontSize: 12 },
  track: { height: 3, borderRadius: 2, overflow: 'hidden', marginTop: 2 },
  bar: { height: 3, borderRadius: 2 },
});
