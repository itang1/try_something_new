import type { Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientIcon, Icon } from '@/components/icon';
import { CARD_ASPECT, CARD_UNITS, CardBrand, cardText, type CardView } from '@/components/tried-card';
import { fitGrid } from '@/data/card-grid';
import type { CardShape } from '@/data/share-card';
import type { IconName } from '@/icons/paths';
import { BRAND } from '@/theme';

export type BucketItem = { id: string; icon: IconName; subcategory: string; done: boolean };

/** A city's bucket list as a poster: a tile for every idea, lit up in color when it's done, dim when it's still to try. */
export function BucketCard({
  ref,
  shape,
  width,
  cityName,
  items,
}: {
  ref?: Ref<CardView>;
  shape: CardShape;
  width: number;
  cityName: string;
  items: BucketItem[];
}) {
  const u = width / CARD_UNITS;
  const height = width * CARD_ASPECT[shape];
  const story = shape === 'story';
  const pad = (story ? 24 : 18) * u;
  const done = items.filter((i) => i.done).length;
  const percent = items.length ? Math.floor((done / items.length) * 100) : 0;
  // Everything between the heading and the footer is the grid.
  const head = (story ? 120 : 78) * u;
  const foot = (story ? 44 : 34) * u;
  const box = { width: width - 2 * pad, height: height - 2 * pad - head - foot };
  const gap = Math.max(2, (items.length > 80 ? 4 : 6) * u);
  const { columns, size } = fitGrid(items.length, box.width, box.height, gap);

  return (
    <View ref={ref} collapsable={false} style={{ width, height, overflow: 'hidden', backgroundColor: '#23151A' }}>
      <LinearGradient colors={['#2E1A2A', '#23151A', '#1A1014']} style={StyleSheet.absoluteFill} />

      <View style={{ flex: 1, padding: pad }}>
        <View style={{ height: head, gap: 4 * u }}>
          <Text style={[cardText.white, cardText.kicker, { fontSize: 13 * u, letterSpacing: 1.5 * u }]} numberOfLines={1}>
            MY {cityName.toUpperCase()} BUCKET LIST
          </Text>
          <Text style={[cardText.white, styles.big, { fontSize: (story ? 40 : 30) * u, lineHeight: (story ? 46 : 35) * u }]}>
            {done} of {items.length} tried
          </Text>
          <View style={[styles.track, { height: 8 * u, borderRadius: 4 * u, marginTop: 6 * u }]}>
            <LinearGradient
              colors={[BRAND.gold, BRAND.rose]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ width: `${Math.max(percent, done ? 2 : 0)}%`, height: '100%', borderRadius: 4 * u }}
            />
          </View>
        </View>

        <View style={[styles.center, { width: box.width, height: box.height }]}>
          <View style={[styles.grid, { gap, width: columns * size + (columns - 1) * gap }]}>
            {items.map((i) =>
              i.done ? (
                <GradientIcon key={i.id} icon={i.icon} subcategoryId={i.subcategory} size={size} shape="tile" />
              ) : (
                <View key={i.id} style={[styles.center, styles.dim, { width: size, height: size, borderRadius: size / 4 }]}>
                  <Icon name={i.icon} size={size * 0.55} color="rgba(255,255,255,0.28)" />
                </View>
              ),
            )}
          </View>
        </View>

        <View style={{ height: foot, justifyContent: 'flex-end' }}>
          <CardBrand u={u} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  big: { fontWeight: '800' },
  track: { backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignContent: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  dim: { backgroundColor: 'rgba(255,255,255,0.07)' },
});
