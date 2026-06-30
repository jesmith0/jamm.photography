/**
 * Generates placeholder rolls of film for the reel view: colour atmospheric
 * studies (the photographs keep their colour; the interface stays monochrome)
 * plus the matching roll content files. Replace the images in
 * src/assets/photos/<roll>/ with your own — same names — and edit the
 * frontmatter in src/content/rolls/.
 *
 *   npm run images
 */
import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const assetsDir = path.join(root, 'src/assets/photos');
const rollsDir = path.join(root, 'src/content/rolls');

const W = 1500;
const H = 1000; // 3:2, the shape of a 35mm frame

const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// h in [0,360), s,l in [0,1] -> [r,g,b] 0..255
function hsl(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0,
    g = 0,
    b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function paint({ top, bottom, horizon, glow, grain = 6, tilt = 0 }) {
  const buf = Buffer.allocUnsafe(W * H * 3);
  for (let y = 0; y < H; y++) {
    const ty = y / (H - 1);
    for (let x = 0; x < W; x++) {
      const tx = x / (W - 1);
      const f = smoothstep(0, 1, ty);
      const hy = horizon + tilt * (tx - 0.5);
      const g = glow * Math.exp(-(((ty - hy) / 0.08) ** 2));
      const haze = 0.035 * Math.sin(ty * Math.PI * 3 + tx * 0.6) + 0.02 * Math.sin(ty * Math.PI * 7 + 1.3);
      const dx = tx - 0.5;
      const dy = ty - 0.5;
      const vig = 0.13 * (dx * dx + dy * dy) * 4;
      const n = (Math.random() - 0.5) * grain * 2;
      const i = (y * W + x) * 3;
      buf[i] = clamp(lerp(top[0], bottom[0], f) + g * 40 + haze * 26 - vig * 36 + n);
      buf[i + 1] = clamp(lerp(top[1], bottom[1], f) + g * 40 + haze * 26 - vig * 36 + n);
      buf[i + 2] = clamp(lerp(top[2], bottom[2], f) + g * 40 + haze * 26 - vig * 36 + n);
    }
  }
  return sharp(buf, { raw: { width: W, height: H, channels: 3 } }).jpeg({
    quality: 86,
    chromaSubsampling: '4:2:0',
  });
}

// deterministic pseudo-random from an integer seed
function rng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const FIRST = ['Low','High','First','Last','Slack','Spring','Grey','Pale','Far','Near','Cold','Still','Long','Thin','Soft','Deep','Flat','Bright','Dark','Quiet','Lone','Open','Drawn','Held','Spent','Wide','Close','Faint','Late','Early','Blue','White','Hard','Worn','Plain','Bare'];
const SECOND = ['Light','Tide','Water','Fog','Field','Shore','Horizon','Weather','Salt','Snow','Wind','Cloud','Mark','Line','Edge','Rise','Fall','Drift','Wash','Bank','Reach','Verge','Hour','Distance','Cover','Break','Calm','Channel','Crossing','Margin','Passage','Season','Shadow','Surface','Tideline','Wake'];

const APERTURE = ['f/2.8', 'f/4', 'f/5.6', 'f/8', 'f/11', 'f/16'];
const SHUTTER = ['1/60', '1/125', '1/250', '1/500', '1/1000', '1/2000'];
const ISO = ['50', '100', '200', '320', '400'];

const ROLLS = [
  {
    roll: '012',
    title: 'Coastlines',
    order: 2,
    date: '2026-02-20',
    hue: 205, // cool blue-grey
    sat: 0.24,
    camera: 'Hasselblad 500C/M',
    lens: '80mm Planar',
    focal: '80mm',
    locations: ['Morecambe Bay, England', 'Point Reyes, California', 'Ólafsfjörður, Iceland', 'Achill Island, Ireland', 'Cape Cod, Massachusetts', 'Jæren, Norway', 'Tofino, Canada', 'Sylt, Germany'],
  },
  {
    roll: '011',
    title: 'Interior',
    order: 1,
    date: '2025-11-05',
    hue: 48, // warm amber-grey
    sat: 0.2,
    camera: 'Leica M6',
    lens: '35mm Summicron',
    focal: '35mm',
    locations: ['Skåne, Sweden', 'Hardangervidda, Norway', 'Castile, Spain', 'Burgundy, France', 'Salar de Uyuni, Bolivia', 'Hokkaidō, Japan', 'Pampas, Argentina', 'Tuscany, Italy'],
  },
];

function yamlStr(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

await fs.mkdir(rollsDir, { recursive: true });

for (const spec of ROLLS) {
  const dir = path.join(assetsDir, `roll-${spec.roll}`);
  await fs.mkdir(dir, { recursive: true });
  const rand = rng(Number(spec.roll) * 1000 + 7);

  const lines = [];
  lines.push('---');
  lines.push(`roll: ${yamlStr(spec.roll)}`);
  lines.push(`title: ${yamlStr(spec.title)}`);
  lines.push(`date: ${spec.date}`);
  lines.push(`order: ${spec.order}`);
  lines.push('exposures:');

  for (let i = 1; i <= 36; i++) {
    // colour: drift the hue gently across the roll, vary lightness per frame
    const hue = (spec.hue + (rand() - 0.5) * 34 + 360) % 360;
    const sat = spec.sat * (0.8 + rand() * 0.4);
    const topL = 0.55 + (rand() - 0.5) * 0.22;
    const botL = topL - (0.14 + rand() * 0.16);
    const top = hsl(hue, sat, topL);
    const bottom = hsl((hue + 8) % 360, sat * 0.9, botL);
    const horizon = 0.4 + rand() * 0.25;
    const glow = 0.2 + rand() * 0.45;
    const tilt = (rand() - 0.5) * 0.05;

    const name = `${String(i).padStart(2, '0')}.jpg`;
    await paint({ top, bottom, horizon, glow, tilt }).toFile(path.join(dir, name));

    const title = `${FIRST[(i - 1) % FIRST.length]} ${SECOND[(i * 7 + spec.order) % SECOND.length]}`;
    const location = spec.locations[(i - 1) % spec.locations.length];
    const aperture = APERTURE[Math.floor(rand() * APERTURE.length)];
    const shutter = SHUTTER[Math.floor(rand() * SHUTTER.length)];
    const iso = ISO[Math.floor(rand() * ISO.length)];

    lines.push(`  - frame: ${i}`);
    lines.push(`    title: ${yamlStr(title)}`);
    lines.push(`    image: ../../assets/photos/roll-${spec.roll}/${name}`);
    lines.push(`    alt: ${yamlStr(`${spec.title} roll, exposure ${i} — an atmospheric study at ${location}.`)}`);
    lines.push(`    location: ${yamlStr(location)}`);
    lines.push(`    date: ${spec.date}`);
    lines.push(`    camera: ${yamlStr(spec.camera)}`);
    lines.push(`    lens: ${yamlStr(spec.lens)}`);
    lines.push(`    focal: ${yamlStr(spec.focal)}`);
    lines.push(`    aperture: ${yamlStr(aperture)}`);
    lines.push(`    shutter: ${yamlStr(shutter)}`);
    lines.push(`    iso: ${yamlStr(iso)}`);
  }

  lines.push('---');
  lines.push('');
  await fs.writeFile(path.join(rollsDir, `roll-${spec.roll}.md`), lines.join('\n'));
  console.log(`  ✓ roll ${spec.roll} — 36 exposures`);
}

console.log(`\nWrote ${ROLLS.length} rolls (${ROLLS.length * 36} frames) to src/assets/photos/ and src/content/rolls/`);
