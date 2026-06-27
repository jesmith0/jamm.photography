/**
 * Generates atmospheric duotone placeholder photographs into
 * src/assets/photos/. These stand in for real frames so the layout and
 * Astro's image pipeline can be seen end-to-end — replace them with your
 * own files (same names) and rebuild.
 *
 *   npm run images
 */
import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../src/assets/photos');

const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Paints a vertical sky→ground blend with an atmospheric glow band near a
 * horizon, gentle low-frequency haze, a soft vignette and fine film grain.
 */
function paint({ w, h, top, bottom, horizon = 0.55, glow = 0.35, grain = 7, tilt = 0 }) {
  const buf = Buffer.allocUnsafe(w * h * 3);
  for (let y = 0; y < h; y++) {
    const ty = y / (h - 1);
    for (let x = 0; x < w; x++) {
      const tx = x / (w - 1);
      const f = smoothstep(0, 1, ty);
      const hy = horizon + tilt * (tx - 0.5);
      const g = glow * Math.exp(-(((ty - hy) / 0.07) ** 2));
      const haze = 0.04 * Math.sin(ty * Math.PI * 3 + tx * 0.6) + 0.022 * Math.sin(ty * Math.PI * 7 + 1.3);
      const dx = tx - 0.5;
      const dy = ty - 0.5;
      const vig = 0.14 * (dx * dx + dy * dy) * 4;
      const n = (Math.random() - 0.5) * grain * 2;
      const i = (y * w + x) * 3;
      buf[i] = clamp(lerp(top[0], bottom[0], f) + g * 42 + haze * 30 - vig * 38 + n);
      buf[i + 1] = clamp(lerp(top[1], bottom[1], f) + g * 42 + haze * 30 - vig * 38 + n);
      buf[i + 2] = clamp(lerp(top[2], bottom[2], f) + g * 44 + haze * 30 - vig * 38 + n);
    }
  }
  return sharp(buf, { raw: { width: w, height: h, channels: 3 } }).jpeg({
    quality: 90,
    chromaSubsampling: '4:4:4',
  });
}

const frames = [
  // name, dimensions, tones (sky → ground), atmosphere
  { name: 'low-tide', w: 1600, h: 2000, top: [206, 199, 191], bottom: [118, 113, 107], horizon: 0.5, glow: 0.5 },
  { name: 'fog-bank', w: 2000, h: 1125, top: [199, 204, 207], bottom: [151, 157, 161], horizon: 0.6, glow: 0.18, grain: 5 },
  { name: 'salt', w: 2000, h: 1333, top: [184, 195, 205], bottom: [216, 215, 210], horizon: 0.46, glow: 0.22 },
  { name: 'the-long-field', w: 2000, h: 1125, top: [178, 182, 179], bottom: [104, 110, 92], horizon: 0.58, glow: 0.3, tilt: 0.03 },
  { name: 'harbour-6am', w: 2000, h: 1333, top: [118, 132, 149], bottom: [54, 64, 79], horizon: 0.4, glow: 0.7 },
  { name: 'snowline', w: 2000, h: 1600, top: [205, 211, 217], bottom: [227, 230, 233], horizon: 0.52, glow: 0.16, grain: 5 },
];

await fs.mkdir(outDir, { recursive: true });
for (const frame of frames) {
  const file = path.join(outDir, `${frame.name}.jpg`);
  await paint(frame).toFile(file);
  console.log(`  ✓ ${frame.name}.jpg  ${frame.w}×${frame.h}`);
}
console.log(`\nWrote ${frames.length} frames to src/assets/photos/`);
