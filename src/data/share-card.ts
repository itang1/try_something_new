import type { ComponentRef, RefObject } from 'react';
import type { View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

export type CardShape = 'story' | 'square';

/**
 * The short link printed in the card's corner. Empty until "Invite links that open the idea"
 * gives the app a web page to link to; the card shows just the app's name until then.
 */
export const SHARE_LINK: string = '';

/** Pixel sizes for Instagram and TikTok stories (9:16) and feed posts (1:1). */
const PIXELS: Record<CardShape, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
};

/** Draws the card as a PNG and opens the share sheet with it. */
export async function shareCard(card: RefObject<ComponentRef<typeof View> | null>, shape: CardShape, title: string): Promise<void> {
  const uri = await captureRef(card, { format: 'png', result: 'tmpfile', ...PIXELS[shape] });
  await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: title });
}
