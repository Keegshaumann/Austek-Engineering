# Austek Engineering CC — landing page

Single-page site for Austek Engineering CC (Brakpan, Gauteng). Static HTML/CSS/JS,
no build step, no dependencies to install. Animation is [anime.js](https://animejs.com) v4.5.0,
vendored at `assets/js/anime.umd.min.js`.

## Run it

```bash
python3 -m http.server 4820 --directory .
```

Then open http://localhost:4820. Any static host works — Netlify, Vercel, Cloudflare
Pages, S3, or plain shared hosting: upload the folder as-is.

## Structure

```
index.html
assets/css/styles.css
assets/js/anime.umd.min.js     anime.js v4.5.0 (UMD, vendored — no CDN dependency)
assets/js/main.js              all motion + interactions
assets/img/                    photos lifted from the 2025 company profile PDF
```

Fonts (Space Grotesk / Inter / JetBrains Mono) load from Google Fonts. Everything
else is local.

## Design notes

Visual language follows animejs.com — near-black stage, monospace technical
callouts, a theme flip to steel-paper, a scroll-scrubbed hero mechanism — retuned
for a fabricator: weld-arc orange instead of red, and two pieces of steel that
build themselves.

- **Hero** — a steel platform erects itself on a loop: base plates land, columns
  rise, the main beam lands, gussets and walkway go in, bracing shoots across,
  handrail stands, with a weld flash and spark burst at every joint and a live
  status line (*Raising columns · Landing the main beam · Bracing the frame*).
- **Process** — a scroll-scrubbed **pipe spool assembling itself** through the
  five passes of a real weld (cut & prep → fit-up → root → fill & cap → inspect),
  annotated like a shop drawing with a title block.

Motion is anime.js end to end — no hand-rolled scroll listeners, no
IntersectionObserver:

- `createTimeline()` for the hero copy, and for the looping hero build.
- **Scroll Observer** (`onScroll()` / `new ScrollObserver()`) for everything
  scroll-driven: section reveals, the stat counters, the nav's sticky and
  light/dark inversion, the contact image drift, and the scrubbed spool.
- `onScroll({ sync: 0.2 })` scrubs the whole spool timeline off scroll position.
- `svg.createDrawable()` for the line-draw on leaders, braces and handrails.
- `stagger()` throughout.

Two API notes worth keeping, both verified against the v4.5.0 bundle:

- The string form `ease: 'cubicBezier(...)'` was **removed** in v4 — pass the
  `cubicBezier()` function instead. The string form fails silently and takes the
  whole `animate()` call with it.
- On a Scroll Observer, `enter`/`leave` read as `"<container> <target>"` and
  default to `'end start'` / `'start end'`. The play-once flag is `repeat: false`,
  **not** `once: true` — and it is deliberately not used here, because on
  completion the observer reverts the animation and wipes the reveal.

`prefers-reduced-motion` is respected — the spool renders finished, the hero
structure renders assembled, and the choreography is skipped.

## Content

All copy is drawn from the 2025 company profile PDF and the client's own notes.
Nothing about certifications, standards or clients is invented. Specifically:

- "Coded welders" and "stainless steel specialists" — the client's stated
  differentiators.
- Heineken South Africa (Sedibeng) and Edward Snell & Co. (Isando) — current sites,
  per the client.
- Founded 1995, black-owned, CK 96/26279/23, 15 Milner Avenue Brakpan — from the profile.

## Before it goes live

1. **The quote form has no backend.** It opens the visitor's mail client via
   `mailto:` (`assets/js/main.js`, the `#quoteForm` submit handler). Swap it for a
   real endpoint — Formspree, Netlify Forms, or a small handler — so enquiries
   aren't lost when someone has no mail client configured.
2. **Email address.** `ykhunoo@yahoo.com` is what's on the profile. A domain address
   (e.g. `info@austekengineering.co.za`) would read better to industrial buyers.
3. **Logo.** The client said they don't really have one. The mark in the nav/footer
   is a new SVG (chevron plates + arc dot), redrawn clean so it scales and works on
   light and dark. The original raster logo from the profile PDF is kept at
   `assets/img/austek-logo.png` for reference. If they want the original instead,
   it needs a proper vector redraw — the PDF copy is only 250px.
4. **Photos.** All from the profile PDF; two were cropped to remove a phone
   watermark. Better on-site photography would lift the Work section a lot. The
   silo, pipework and plant-room shots are genuine Austek jobs; the stainless-stock
   and valve-manifold images came from the profile's stock imagery — worth replacing
   with real job photos.
5. **MD portrait.** The client is sending one. There's a natural slot in the About
   section beside the Yehgandra Khunoo quote.
6. Add a real domain, then set the `og:image` URL to an absolute one for link previews.
