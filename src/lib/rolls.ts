import { getCollection, type CollectionEntry } from 'astro:content';

export type Roll = CollectionEntry<'rolls'>;
export type Exposure = Roll['data']['exposures'][number];

/** Rolls, newest first (by manual `order`, then date). */
export async function getRolls(): Promise<Roll[]> {
  const rolls = await getCollection('rolls');
  return rolls.sort((a, b) => {
    const byOrder = (b.data.order ?? 0) - (a.data.order ?? 0);
    if (byOrder !== 0) return byOrder;
    return b.data.date.valueOf() - a.data.date.valueOf();
  });
}

/** Exposures in film order, 1 → 36. */
export function inFrameOrder(exposures: Exposure[]): Exposure[] {
  return [...exposures].sort((a, b) => a.frame - b.frame);
}

/** Two-digit frame number, e.g. 1 -> "01". */
export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** "f/8 · 1/250 · ISO 100" — only the parts that exist. */
export function exifLine(e: Exposure): string[] {
  return [e.focal, e.aperture, e.shutter, e.iso ? `ISO ${e.iso}` : undefined].filter(
    (x): x is string => Boolean(x),
  );
}
