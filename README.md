# Fulcrum — Revenue Architect

A one-page editorial marketing site for **Fulcrum**, an independent revenue
architect consultancy. Positioning: *grow without spending more* — find the
revenue a company already owns, sharpen the foundation, and scale spend only
once it's proven. **Leverage before spend. Proof before budget.**

The entire interface demonstrates leverage rather than just describing it: a
scroll-driven **tipping balance beam** in the hero, **pinned sequential
"wrong order vs. the order that compounds"** sections, oversized numerals, and
restrained, weighted motion throughout.

It also includes an integrated **Clarity Check** lead generator — an
interactive demonstration of "move 01, Diagnose" that scores a visitor's site
and gates the full breakdown behind an email.

## Stack

Deliberately light, to keep the motion brief fast and the deploy clean:

- **Hand-crafted `index.html`** + modern CSS (`assets/css/style.css`)
- **Vanilla JS** for the tool (`assets/js/clarity.js`)
- **GSAP + ScrollTrigger** (CDN, deferred) for the beam and pinned scenes,
  with a full IntersectionObserver / static fallback (`assets/js/motion.js`)
- **Netlify Functions** for the clarity-check backend (`netlify/functions/`)

No build step. The site is fully static and works by opening `index.html`.

## Project layout

```
index.html                  # the page
assets/css/style.css        # design system + all sections
assets/js/motion.js         # scroll choreography, count-ups, cursor, magnetics
assets/js/clarity.js        # clarity-check tool (DEMO_MODE on by default)
netlify/functions/analyze.js# fetches a site + scores it via Claude
netlify/functions/lead.js   # captures the email lead
netlify.toml                # publish dir, /api/* redirects, headers
```

## Run locally

It's static — just serve the folder:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Open the site. The clarity check runs in **DEMO_MODE** (a built-in sample
result), so everything works with no backend.

To exercise the real functions locally, use the Netlify CLI:

```bash
npm i -g netlify-cli
netlify dev
```

## Deploy to Netlify

1. Connect the repo (or drag-and-drop the folder). `netlify.toml` sets the
   publish dir (`.`) and the functions dir — no build command needed.
2. Add the env var **`ANTHROPIC_API_KEY`** (Site settings → Environment).
3. In `assets/js/clarity.js`, set `DEMO_MODE = false`.
4. (Optional) Wire `netlify/functions/lead.js` to your CRM / Resend / a sheet.

`netlify.toml` redirects `/api/analyze` and `/api/lead` to the functions, so
the front end keeps clean paths.

## Clarity check — how it works

- `POST /api/analyze { url, offer }` → fetches the public page, extracts the
  signal a buyer reads (title, meta, headings, CTAs, body), asks Claude for a
  structured scorecard, and returns JSON.
- The first two dimensions show immediately; the rest plus the top-three fixes
  are gated behind a consented email.
- `POST /api/lead { email, url, consent }` → validates and logs the lead;
  wire it to your destination of choice.

**GDPR:** store only email + url + consent + timestamp, and keep a record of
the consent text shown. You are the data controller.

## Accessibility & motion

- Semantic HTML, ordered headings, visible focus states, skip link, keyboard
  navigable, AA contrast.
- `prefers-reduced-motion` is fully honoured: the beam settles, steps are
  shown, the custom cursor and scroll choreography are disabled — a calm,
  equally complete static experience. Motion is never required to understand
  the content.

## Design notes

- **Palette:** soft ivory `#F7F6F2`, near-black ink `#0A0A0A`, a single
  electric-cobalt accent `#1B4DFF`, with an inverted near-black block for the
  integrations diagram fallback, pricing and founder.
- **Type:** Bricolage Grotesque (display), Hanken Grotesk (body), Space Mono
  (labels, numerals, the 01–04 sequence).
- **Motion is restrained by design:** a gentle scroll-tip on the hero beam,
  calm in-view reveals, count-ups, and a sequential reveal of the two order
  paths. No GSAP, no custom cursor, no magnetic buttons — driven by a small
  native-scroll handler and IntersectionObserver only.
- **Approach diagram** renders the four moves as a connected flow (leverage
  first → spend last). The **integrations section** wires common revenue tools
  into a central Fulcrum hub.
- **Tool logos** load from [Simple Icons](https://simpleicons.org) via
  `cdn.simpleicons.org` at runtime (monochrome, on-palette). They degrade
  gracefully if unreachable. To remove the external dependency entirely,
  download the SVGs into `assets/logos/` and point the `href`/`src` at them.
- The clarity check shares the site's palette and type for one cohesive piece.

© 2026 Fulcrum.
