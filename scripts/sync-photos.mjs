/**
 * Pulls the original photographs from a private Cloudflare R2 bucket into
 * src/assets/photos/ so Astro can optimise them at build time. The originals
 * are NOT committed to git (see .gitignore) — R2 is the source of truth, and
 * only optimised derivatives ship in dist/. Credentials never leave the build.
 *
 * Runs automatically before `dev` and `build` (see package.json), or on demand:
 *
 *   npm run sync
 *
 * Required environment variables (set them in .env locally and in Vercel):
 *   R2_ENDPOINT           https://<account-id>.r2.cloudflarestorage.com
 *   R2_BUCKET             e.g. jamm
 *   R2_ACCESS_KEY_ID      an R2 API token (read-only is enough)
 *   R2_SECRET_ACCESS_KEY
 * Optional:
 *   R2_PREFIX             only sync keys under this prefix (stripped locally)
 */
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const assetsDir = path.join(root, 'src/assets/photos');

// Load .env locally; on Vercel the file is absent but the vars are injected.
try {
  process.loadEnvFile(path.join(root, '.env'));
} catch {}

const { R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PREFIX = '' } = process.env;

async function dirHasFiles(dir) {
  try {
    for (const entry of await fs.readdir(dir, { recursive: true })) {
      if (path.extname(entry)) return true;
    }
  } catch {}
  return false;
}

// Without credentials we can't sync. If the originals are already on disk
// (e.g. working offline) carry on; otherwise the build can't proceed.
if (!R2_ENDPOINT || !R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  if (await dirHasFiles(assetsDir)) {
    console.warn('⚠ R2 credentials not set — using the images already in src/assets/photos/.');
    process.exit(0);
  }
  console.error(
    '✗ R2 credentials not set and no local images found.\n' +
      '  Set R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY (see scripts/sync-photos.mjs).',
  );
  process.exit(1);
}

const client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  forcePathStyle: true,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

// List every object in the bucket (paginated).
const objects = [];
let ContinuationToken;
do {
  const page = await client.send(
    new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: R2_PREFIX || undefined, ContinuationToken }),
  );
  for (const o of page.Contents ?? []) objects.push(o);
  ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
} while (ContinuationToken);

let downloaded = 0;
let skipped = 0;

for (const { Key, Size } of objects) {
  if (Key.endsWith('/')) continue; // folder placeholder

  const rel = R2_PREFIX ? Key.slice(R2_PREFIX.length).replace(/^\//, '') : Key;
  const dest = path.join(assetsDir, rel);

  // Refuse to write outside the assets directory.
  if (!dest.startsWith(assetsDir + path.sep)) {
    console.warn(`  ! skipping key outside assets dir: ${Key}`);
    continue;
  }

  // Idempotent: skip if we already have a byte-identical copy.
  const existing = await fs.stat(dest).catch(() => null);
  if (existing && existing.size === Size) {
    skipped++;
    continue;
  }

  await fs.mkdir(path.dirname(dest), { recursive: true });
  const res = await client.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key }));
  await pipeline(res.Body, createWriteStream(dest));
  downloaded++;
  console.log(`  ✓ ${rel}`);
}

console.log(`\nR2 sync complete — ${downloaded} downloaded, ${skipped} already current (${objects.length} objects in ${R2_BUCKET}).`);
