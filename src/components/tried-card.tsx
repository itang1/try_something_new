import type { ComponentRef, Ref } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientIcon, Icon } from '@/components/icon';
import { SHARE_LINK, type CardShape } from '@/data/share-card';
import type { IconName } from '@/icons/paths';
import { subcategory } from '@/theme';

/** The card is laid out on a 360-wide grid and drawn at any width, so the preview and the image match. */
export const CARD_UNITS = 360;
export const CARD_ASPECT: Record<CardShape, number> = { story: 16 / 9, square: 1 };

/** What the card is drawn into, for capturing it as an image. */
export type CardView = ComponentRef<typeof View>;

export type TriedCardProps = {
  ref?: Ref<CardView>;
  shape: CardShape;
  width: number;
  name: string;
  icon: IconName;
  subcategoryId: string;
  /** "#12 in Seattle" */
  badge: string;
  place: string | null;
  loved: boolean;
  photo: string | null;
};

/** A "tried it" card: the user's photo (or the activity's colors), what they did, where, and the app's name. */
export function TriedCard({ ref, shape, width, name, icon, subcategoryId, badge, place, loved, photo }: TriedCardProps) {
  const u = width / CARD_UNITS;
  const height = width * CARD_ASPECT[shape];
  const story = shape === 'story';
  const sub = subcategory(subcategoryId);
  const pad = (story ? 24 : 20) * u;

  return (
    // collapsable={false} keeps the view on Android so it can be captured as an image.
    <View ref={ref} collapsable={false} style={{ width, height, overflow: 'hidden', backgroundColor: sub.gradient[1] }}>
      {photo ? (
        <>
          <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <LinearGradient
            colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.8)']}
            locations={[0, 0.25, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
        </>
      ) : (
        <LinearGradient colors={sub.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill}>
          <View style={[StyleSheet.absoluteFill, styles.center, { opacity: 0.18 }]}>
            <Icon name={icon} size={(story ? 300 : 220) * u} color="white" />
          </View>
        </LinearGradient>
      )}

      <View style={[styles.layout, { padding: pad }]}>
        <View style={[styles.badge, { paddingHorizontal: 12 * u, paddingVertical: 6 * u, borderRadius: 999 }]}>
          <Text style={[styles.white, { fontSize: 15 * u, fontWeight: '800' }]}>{badge}</Text>
        </View>

        <View style={{ gap: 10 * u }}>
          <Text style={[styles.white, styles.kicker, { fontSize: 13 * u, letterSpacing: 1.5 * u }]}>I TRIED</Text>
          <View style={[styles.row, { gap: 12 * u }]}>
            <GradientIcon
              icon={icon}
              subcategoryId={subcategoryId}
              size={(story ? 52 : 44) * u}
              shape="tile"
              style={{ borderWidth: 2 * u, borderColor: 'rgba(255,255,255,0.9)' }}
            />
            <Text
              style={[styles.white, styles.name, { fontSize: (story ? 30 : 26) * u, lineHeight: (story ? 35 : 30) * u }]}
              numberOfLines={3}
            >
              {name}
            </Text>
          </View>
          {(place || loved) && (
            <View style={[styles.row, { gap: 8 * u, flexWrap: 'wrap' }]}>
              {place && (
                <View style={[styles.row, { gap: 4 * u, flexShrink: 1 }]}>
                  <Icon name="location_on" size={16 * u} color="white" />
                  <Text style={[styles.white, { fontSize: 15 * u, fontWeight: '600', flexShrink: 1 }]} numberOfLines={1}>
                    {place}
                  </Text>
                </View>
              )}
              {loved && (
                <View style={[styles.row, styles.loved, { gap: 4 * u, paddingHorizontal: 10 * u, paddingVertical: 4 * u }]}>
                  <Icon name="favorite" size={14 * u} color="#F0405A" />
                  <Text style={{ color: '#23151A', fontSize: 13 * u, fontWeight: '700' }}>Loved it</Text>
                </View>
              )}
            </View>
          )}

          <CardBrand u={u} style={{ marginTop: (story ? 14 : 6) * u }} />
        </View>
      </View>
    </View>
  );
}

/** The app's icon, name and website, at the foot of every shared card. */
export function CardBrand({ u, style }: { u: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.row, { gap: 8 * u }, style]}>
      <Image source={require('../../assets/images/icon.png')} style={{ width: 22 * u, height: 22 * u, borderRadius: 5 * u }} />
      <Text style={[cardText.white, { fontSize: 13 * u, fontWeight: '700', opacity: 0.95 }]}>
        Try Something New{SHARE_LINK ? `  ·  ${SHARE_LINK}` : ''}
      </Text>
    </View>
  );
}

/** White text with a soft shadow, readable over photos and gradients. */
export const cardText = StyleSheet.create({
  white: { color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },
  kicker: { fontWeight: '800', opacity: 0.9 },
});

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  layout: { flex: 1, justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center' },
  white: { color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },
  kicker: { fontWeight: '800', opacity: 0.9 },
  name: { flex: 1, fontWeight: '800' },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.35)' },
  loved: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999 },
});
