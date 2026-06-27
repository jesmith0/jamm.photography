# Jamm — a minimalist photo journal

A quiet, image-first photo blog built with [Astro](https://astro.build). The
interface is deliberately achromatic so the only colour on the page comes from
the photographs; a darkroom "safelight" red surfaces only on hover and focus.
Automatic light/dark themes follow the visitor's system setting.

- **Zero JavaScript** shipped to the browser — pure HTML + CSS.
- **Responsive images** generated at build time (AVIF/WebP, lazy-loaded).
- **Content collections** — every photo is one Markdown file.
- Type set in **Spectral** (serif) and **Space Mono** (data), self-hosted.

## Develop

```sh
npm install
npm run images   # generate placeholder photographs (first run only)
npm run dev      # http://localhost:4321
```

Other scripts:

```sh
npm run build    # static site → dist/
npm run preview  # serve the built site locally
```

## Add a photograph

1. Drop your image into `src/assets/photos/` (e.g. `morning.jpg`).
2. Create `src/content/photos/morning.md`:

   ```yaml
   ---
   title: 'Morning'
   date: 2026-06-01
   location: 'Somewhere, Earth'
   image: ../../assets/photos/morning.jpg
   alt: 'A short description of the frame, for screen readers.'
   camera: 'Leica M6'        # the fields below are optional
   lens: '35mm Summicron'
   focal: '35mm'
   aperture: 'f/8'
   shutter: '1/250'
   iso: '100'
   ---

   A few words about the frame. This becomes the notes on the photo's page.
   ```

The roll orders newest-first by `date`. The frame number, EXIF line and spec
sheet are derived automatically. Use the optional `order:` number to override
ordering.

## Replace the placeholders

The sample frames are generated atmospheric studies (`npm run images`, see
`scripts/generate-placeholders.mjs`). To use real photographs, delete the files
in `src/assets/photos/` and add your own with the same names — or add new
entries as above and remove the placeholder Markdown in `src/content/photos/`.

## Project layout

```
src/
  assets/photos/         original images (optimised at build)
  content/photos/        one Markdown file per frame
  components/            Masthead, Frame, Exif, SiteFooter
  layouts/Base.astro     <head>, masthead, footer
  pages/
    index.astro          the roll (feed)
    photos/[...id].astro a single frame
    about.astro
  styles/global.css      the whole design system
```

## Deploy

It's a static site — `npm run build` outputs `dist/`, deployable to any static
host (Netlify, Cloudflare Pages, GitHub Pages, etc.). Set the real domain in
`site:` in `astro.config.mjs` so the sitemap and canonical URLs are correct.
