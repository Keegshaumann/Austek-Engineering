# Austek Engineering CC — website

Static marketing site for Austek Engineering CC (Brakpan, Gauteng): coded welding,
stainless fabrication, boilermaking, pipefitting and plant maintenance.

No build step, no framework, no runtime dependencies.

## Files

```
index.html              markup + copy
assets/css/styles.css   all styling (design tokens in :root at the top)
assets/js/main.js       ~6KB of progressive enhancement
assets/img/             photography, logo, favicon
```

## Running locally

```bash
python3 -m http.server 4820
```

Then open http://localhost:4820

## Hosting

Upload the folder as-is to the Hostinger document root. It works unchanged on any
static host (Hostinger, Netlify, Vercel, Cloudflare Pages, nginx, Apache). Nothing
to compile, no server-side runtime.

## Principles this rebuild follows

1. **Content first.** Every word is in the HTML and readable with JavaScript
   disabled, blocked or broken. Animation is enhancement, never a prerequisite
   for seeing the page. `main.js` adds a `.js` class before anything is hidden,
   and a 4-second failsafe reveals anything an observer missed.
2. **Fast.** The previous build shipped ~790KB of JavaScript (three.js 670KB +
   anime.js 118KB) to render a WebGL scene. This one ships ~6.5KB. All images
   carry explicit `width`/`height` so nothing shifts while loading, and
   below-the-fold images are lazy-loaded.
3. **Built to convert.** The phone number is in the header, in the hero, in the
   contact block, in the footer, and in a floating call button on mobile — a
   plant manager with a breakdown should never hunt for it.
4. **Findable.** Descriptive title and meta description, Open Graph tags, and
   `LocalBusiness` JSON-LD carrying the address, phone, founding date and
   service list.
5. **Accessible.** Skip link, labelled form fields with inline validation
   messages, visible focus rings, and `prefers-reduced-motion` respected.

## The enquiry form

By default the form validates, then opens the visitor's email client addressed to
Austek. That works, but it loses enquiries whenever someone has no mail client
configured — which on a phone is common.

To capture enquiries properly, set `FORM_ENDPOINT` at the top of
`assets/js/main.js`:

```js
var FORM_ENDPOINT = 'https://formspree.io/f/XXXXXXX';
```

It posts JSON and works with Formspree or Web3Forms as-is. On success the form
shows a confirmation inline; on failure it falls back to the mailto behaviour so
an enquiry is never silently lost. A honeypot field is already in place for bots.

## Things worth doing next

- [ ] Point `FORM_ENDPOINT` at a real endpoint so enquiries land in an inbox.
- [ ] Update the canonical URL in `index.html` if the live domain differs from
      `austekengineering.co.za`.
- [ ] Export a dedicated 1200x630 Open Graph share image; it currently reuses
      the hero photograph.
- [ ] Self-host the two Google fonts to drop the third-party request.
- [ ] Confirm the "31 years" and "20 years at Heineken" figures with the client
      before they go stale — they are hardcoded in the trust bar.
- [ ] Add real project names/dates to the gallery captions if the client is
      happy to publish them.
