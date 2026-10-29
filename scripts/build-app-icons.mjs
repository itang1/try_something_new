// Renders the app icon, Android adaptive icon layers, splash image and favicon from the SVGs
// in assets/brand to the PNG sizes Expo expects. Run with `npm run app-icons` after editing them.
import { readFileSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const OUTPUTS = [
  { src: 'icon.svg', out: 'icon.png', size: 1024 },
  { src: 'android-background.svg', out: 'android-icon-background.png', size: 512 },
  { src: 'android-foreground.svg', out: 'android-icon-foreground.png', size: 512 },
  // The themed icon is the foreground glyph alone; Android tints it.
  { src: 'android-foreground.svg', out: 'android-icon-monochrome.png', size: 432 },
  { src: 'splash.svg', out: 'splash-icon.png', size: 400 },
  { src: 'icon.svg', out: 'favicon.png', size: 48 },
];

for (const { src, out, size } of OUTPUTS) {
  const svg = readFileSync(`assets/brand/${src}`, 'utf8');
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  writeFileSync(`assets/images/${out}`, png);
  console.log(`Wrote assets/images/${out} (${size}px)`);
}
