import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// A "photo" is one frame on the roll: an image plus the technical record.
const photos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/photos' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      location: z.string(),
      image: image(),
      alt: z.string(),
      // The technical record — all optional, all set in mono on the page.
      camera: z.string().optional(),
      lens: z.string().optional(),
      focal: z.string().optional(),
      aperture: z.string().optional(),
      shutter: z.string().optional(),
      iso: z.string().optional(),
      // Manual ordering on the roll; falls back to date when absent.
      order: z.number().optional(),
    }),
});

export const collections = { photos };
