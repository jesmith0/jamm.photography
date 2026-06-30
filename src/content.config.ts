import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// One file per roll of film; each roll holds up to 36 exposures.
const rolls = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/rolls' }),
  schema: ({ image }) =>
    z.object({
      roll: z.string(),
      title: z.string(),
      date: z.coerce.date(),
      order: z.number().optional(),
      exposures: z.array(
        z.object({
          frame: z.number(),
          title: z.string(),
          image: image(),
          alt: z.string(),
          location: z.string(),
          date: z.coerce.date().optional(),
          // The technical record — all optional, shown in the modal in mono.
          camera: z.string().optional(),
          lens: z.string().optional(),
          aperture: z.string().optional(),
          shutter: z.string().optional(),
          iso: z.string().optional(),
        }),
      ),
    }),
});

export const collections = { rolls };
