import { getCollection, type CollectionEntry } from 'astro:content';

export type Photo = CollectionEntry<'photos'>;

/** The roll, in display order: newest first, ties broken by manual `order`. */
export async function getRoll(): Promise<Photo[]> {
  const photos = await getCollection('photos');
  return photos.sort((a, b) => {
    const byOrder = (b.data.order ?? 0) - (a.data.order ?? 0);
    if (byOrder !== 0) return byOrder;
    return b.data.date.valueOf() - a.data.date.valueOf();
  });
}

/** Two-digit frame number, e.g. 1 -> "01". */
export function frameNo(n: number): string {
  return String(n).padStart(2, '0');
}

/** "f/8 · 1/250 · ISO 100" — only the parts that exist. */
export function exifLine(data: Photo['data']): string[] {
  return [data.focal, data.aperture, data.shutter, data.iso ? `ISO ${data.iso}` : undefined].filter(
    (x): x is string => Boolean(x),
  );
}
