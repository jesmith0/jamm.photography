# Jamm — a monochrome photo reel

A quiet, image-first photo blog built with [Astro](https://astro.build).
Photographs are shown as **rolls of film** — one horizontal strip per roll, up
to 36 exposures each — and any frame opens full-size in an overlay with its
exposure details. The interface is strictly **monochrome** (no colour, no
serifs, no italics); the only colour on the page comes from the photographs
themselves. Light/dark follow the visitor's system setting.

- **Almost no JavaScript** — one small inlined script powers the overlay; everything else is HTML + CSS.
- **Responsive images** generated at build time (AVIF/WebP, lazy-loaded).
- **Content collections** — every roll is one Markdown file.
- Type set in **Space Grotesk** (titles) and **Space Mono** (data), self-hosted.

## Develop

```sh
npm install
npm run images   # generate placeholder rolls (first run only)
npm run dev      # http://localhost:4321
```

Other scripts:

```sh
npm run build    # static site → dist/
npm run preview  # serve the built site locally
```

## Add or edit a roll

Each roll is one file in `src/content/rolls/` with its exposures listed in
frontmatter. Drop the images into `src/assets/photos/<roll>/` and reference them
by relative path:

```yaml
---
roll: '013'
title: 'Estuary'
date: 2026-05-01
order: 3            # higher sorts first; falls back to date
exposures:
  - frame: 1
    title: 'First Light'        # shown UPPERCASE
    image: ../../assets/photos/roll-013/01.jpg
    alt: 'Short description, for screen readers.'
    location: 'Somewhere, Earth'
    date: 2026-05-01
    camera: 'Leica M6'          # the technical fields are optional
    lens: '35mm Summicron'
    aperture: 'f/8'
    shutter: '1/250'
    iso: '100'
  # …up to 36 exposures
---
```

Exposures display in `frame` order (1 → 36). The exposure number, EXIF line and
the modal's spec sheet are derived automatically.

## Replace the placeholders

The sample rolls are generated colour studies (`npm run images`, see
`scripts/generate-placeholders.mjs`, which writes both the images and the roll
files). To use real photographs, replace the files in
`src/assets/photos/<roll>/` with your own — same names — and edit the matching
frontmatter, or add new roll files as above.

## How the overlay works

Each frame is a link to its full-size optimised image (so it still works with
JavaScript off). With JS on, a single native `<dialog>` (`src/components/Lightbox.astro`)
reads the frame's `data-*` attributes and shows the image plus its exposure
details — closable with Esc, the ✕, or a click outside; arrow keys step through
the roll; and a frame is shareable via a `#r<roll>f<frame>` URL.

## Project layout

```
src/
  assets/photos/<roll>/   original images (optimised at build)
  content/rolls/          one Markdown file per roll
  components/             Masthead, Roll, Frame, Lightbox, SiteFooter
  layouts/Base.astro      <head>, masthead, footer
  pages/
    index.astro           the reel + the overlay
    about.astro
  lib/rolls.ts            sorting + formatting helpers
  styles/global.css       the whole design system
```

## Deploy

It's a static site — `npm run build` outputs `dist/`, deployable to any static
host (Netlify, Cloudflare Pages, GitHub Pages, etc.). Set the real domain in
`site:` in `astro.config.mjs` so the sitemap and canonical URLs are correct.
