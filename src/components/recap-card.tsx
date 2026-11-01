import type { Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientIcon, Icon } from '@/components/icon';
import { CARD_ASPECT, CARD_UNITS, CardBrand, cardText, type CardView } from '@/components/tried-card';
import { fitGrid } from '@/data/card-grid';
import type { MonthRecap } from '@/data/milestones';
import type { CardShape } from '@/data/share-card';
import { BRAND } from '@/theme';

/** A month in review as an image: how many things, how many kinds and loved, a favorite, and a tile for each thing tried. */
export function RecapCard({ ref, shape, width, recap }: { ref?: Ref<CardView>; shape: CardShape; width: number; recap: MonthRecap }) {
  const u = width / CARD_UNITS;
  const height = width * CARD_ASPECT[shape];
  const story = shape === 'story';
  const pad = (story ? 24 : 20) * u;
  const gap = 8 * u;
  // Tiles fill the space between the heading and the footer.
  const box = { width: width - 2 * pad, height: (story ? 300 : 110) * u };
  const grid = fitGrid(recap.picks.length, box.width, box.height, gap);
  const tile = Math.min(grid.size, 72 * u);
  const line = [`${recap.kinds} ${recap.kinds === 1 ? 'kind' : 'kinds'}`, recap.loved ? `${recap.loved} loved` : ''].filter(Boolean).join('  ·  ');

  return (
    <View ref={ref} collapsable={false} style={{ width, height, overflow: 'hidden' }}>
      <LinearGradient colors={[BRAND.violet, BRAND.rose, BRAND.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.35)']} style={StyleSheet.absoluteFill} />

      <View style={[styles.layout, { padding: pad }]}>
        <View style={{ gap: 4 * u }}>
          <Text style={[cardText.white, cardText.kicker, { fontSize: 13 * u, letterSpacing: 1.5 * u }]}>
            MY {recap.label.toUpperCase()} IN REVIEW
          </Text>
          <Text style={[cardText.white, styles.big, { fontSize: (story ? 44 : 34) * u, lineHeight: (story ? 50 : 39) * u }]}>
            {recap.tried} new {recap.tried === 1 ? 'thing' : 'things'}
          </Text>
          <Text style={[cardText.white, { fontSize: 16 * u, fontWeight: '700' }]}>{line}</Text>
        </View>

        <View style={[styles.grid, { gap, maxWidth: grid.columns * (tile + gap) }]}>
          {recap.picks.map((p, i) => (
            <View key={`${p.id}-${i}`}>
              <GradientIcon
                icon={p.icon}
                subcategoryId={p.subcategory}
                size={tile}
                shape="tile"
                style={{ borderWidth: 2 * u, borderColor: 'rgba(255,255,255,0.9)' }}
              />
              {p.loved && (
                <View style={[styles.heart, { right: -4 * u, top: -4 * u, padding: 3 * u, borderRadius: 999 }]}>
                  <Icon name="favorite" size={Math.max(10, tile * 0.22)} color="#F0405A" />
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={{ gap: 12 * u }}>
          {!!recap.favorite && (
            <View style={[styles.row, styles.favorite, { gap: 6 * u, paddingHorizontal: 12 * u, paddingVertical: 6 * u }]}>
              <Icon name="favorite" size={14 * u} color="#F0405A" />
              <Text style={{ color: '#23151A', fontSize: 14 * u, fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>
                Favorite: {recap.favorite}
              </Text>
            </View>
          )}
          <CardBrand u={u} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layout: { flex: 1, justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center' },
  big: { fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'center', justifyContent: 'center' },
  heart: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.95)' },
  favorite: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999 },
});
