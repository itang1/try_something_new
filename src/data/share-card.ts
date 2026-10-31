import type { ComponentRef, RefObject } from 'react';
import type { View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { track } from './analytics';
import { displayLink, webOrigin } from './web-links';

export type CardShape = 'story' | 'square';

/**
 * The short link printed in the card's corner: the website's host, like "trysomething.new", which an image can't
 * make tappable but people can type. Empty when EXPO_PUBLIC_WEB_URL isn't set; the card shows just the app's name then.
 */
export const SHARE_LINK: string = displayLink(webOrigin()) ?? '';

/** Pixel sizes for Instagram and TikTok stories (9:16) and feed posts (1:1). */
const PIXELS: Record<CardShape, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
};

/** Draws the card as a PNG and opens the share sheet with it. */
export async function shareCard(card: RefObject<ComponentRef<typeof View> | null>, shape: CardShape, title: string): Promise<void> {
  const uri = await captureRef(card, { format: 'png', result: 'tmpfile', ...PIXELS[shape] });
  await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: title });
  track('card_shared');
}
