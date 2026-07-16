# VisionSpark — AI Image Generator

A browser-based AI image generator: type a prompt, pick a style and aspect ratio, and get one or several AI-generated images back — no sign-up, no API key, no backend. Built with plain HTML/CSS/JS on top of the free [Pollinations.AI](https://pollinations.ai) image API.

**Live demo:** _add your deployed link here (e.g. GitHub Pages)_

## Features

- **Style presets** — Photorealistic, Digital Art, Anime, 3D Render, Watercolor, Oil Painting, Pixel Art, Cyberpunk, appended to the prompt as tuned modifier phrases.
- **Aspect ratio presets** — Square, Portrait, Landscape, Wide.
- **Batch variations** — generate 1, 2, or 4 images from one prompt in a single click.
- **Seed control** — randomize or lock a seed for reproducible results while you iterate on wording.
- **AI prompt enhancement & quality boost** — optional toggles that improve prompt-to-image accuracy.
- **Dynamic model list** — the model dropdown is fetched live from the API at page load, so it never goes stale.
- **Real cancellation & timeouts** — generation uses `fetch` + `AbortController` (with a graceful fallback to an `<img>` loader if a response can't be fetched directly), so a hung request can actually be cancelled instead of leaving a spinner running forever.
- **Automatic retries** — a failed generation is retried with a fresh seed before it's reported as an error.
- **Generation history** — every successful image is saved to `localStorage`, with favorites, a "favorites only" filter, and a clear-history option.
- **Lightbox preview** — full-size view with download, copy-prompt, and favorite actions.
- **Light/dark theme**, persisted across visits.
- **Accessible & responsive** — keyboard-operable controls, `aria-live` status updates, alt text drawn from the prompt, and a layout that collapses to a single column on mobile.

## Tech stack

Vanilla HTML, CSS, and JavaScript — no framework, no build step, no dependencies. It runs by opening `index.html` or by serving the folder with any static file host (GitHub Pages, Netlify, Vercel, etc.).

## Getting started

```bash
# clone the repo, then from the project folder:
python3 -m http.server 8000
# open http://localhost:8000
```

Or just open `index.html` directly in a browser.

## How it works

1. The prompt, selected style, and quality-boost toggle are combined into a single descriptive prompt string.
2. A request is built against `https://image.pollinations.ai/prompt/{prompt}` with `width`, `height`, `seed`, and optional `model`/`enhance` query parameters.
3. Each image is fetched with an `AbortController`-backed timeout; on failure it's retried automatically (up to 2 times) with a new seed before the slot is marked as failed.
4. Successful images are stored as object URLs, rendered with a short "developing photo" reveal animation, and saved into a `localStorage`-backed history.

## Known limitations / ideas for future work

- Object URLs created for generated images aren't revoked until the page reloads — fine for a single session, but a longer-running version could revoke them on history clearing.
- The free Pollinations endpoint doesn't support true negative prompts; style control is done entirely through prompt phrasing.
- Could add: image-to-image (using an uploaded reference image), prompt history search, exporting the whole history as a zip, and a PWA/offline shell.

## Why this project

This started as a small single-file prompt-to-image demo and was rebuilt to focus on things that matter in a real product: error handling and cancellation that actually work, a UI that gives the user real control (style, ratio, seed, batch size) instead of just a text box, and persistence so a session's work isn't thrown away on refresh.