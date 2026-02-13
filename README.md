# LoganValentinesDay 💛

An open-world Valentine from **David** to **Logan** built with vanilla HTML/CSS/JS plus a tiny Node server for the AI “Love Line.”

## Highlights

- Free-roam **Virginia-Highland** map packed with glowing hotspots (elephants, sushi, travel loft, date-night studio, Starlight outlook)
- Cinematic chapter sequencer, postcards, footprints, memory log, and the hidden **future dachshund** easter egg (tap the paw five times!)
- Romantic + playful AI chat so Logan can type anything and hear from David in his voice
- Three.js “hospital” side quest you can jump into via `window.launchHospital()` or the UI triggers

## Repo layout

- `index.html` – single-page layout and wiring for the whole experience
- `styles.css` – palette + layout utilities (keep new tokens near the top)
- `app.js` – main IIFE for scenes, sequencer, chat, and interactions, exposes `window.returnFromHospital()`
- `hospital.js` – Three.js adventure (surgery clicks → WASD roaming)
- `server.js` – local Node helper that serves static files and proxies `/api/chat`
- `api/chat.js` – Vercel serverless version of the chat proxy for production
- `assets/` – photos, music loop, paw prints, etc. (≤1 MB per file)

## Assets checklist

| Type | File | Notes |
| --- | --- | --- |
| Required | `assets/*.jpg|png` | Add the photos of David + Logan referenced in `app.js` |
| Optional | `assets/willow.png` | Illustration/photo of the future dachshund |
| Optional | `assets/bg-music.(mp3|m4a|wav)` | Replace the included `assets/bg-music.m4a` synth pad with your own loop |

Missing optional assets gracefully fall back to hidden states, so feel free to launch without them.

## Getting started

1. Create `.env` (copy from `.env.example` if you have one) and set `GEMINI_API_KEY=...`.
2. Install dependencies (none besides built-in Node modules) and run one of the dev flows below.

### Full experience (AI chat + static files)

```bash
npm start
# open http://localhost:3000
```

`server.js` reads `.env`, serves `/`, and proxies `/api/chat` straight to Gemini so the conversation stays romantic, brief (≤120 words), and playful.

### Static-only preview

```bash
python3 -m http.server 8000
# or use VS Code Live Server
```

Great for layout tweaking, but the “Logan ↔ David” chat will show its offline message.

### Vercel runtime parity

```bash
vercel dev
```

This uses `api/chat.js` so you can test the exact serverless function that production will run.

## Configure the AI Love Line

- Local dev: `.env` must contain `GEMINI_API_KEY=...`.
- Vercel: set the same key via `vercel env` or the dashboard and it will be available to `api/chat.js`.
- Front-end sends `{ prompt, history }` and the instructions in both server files keep Gemini flirty. Tune that copy if you want a different tone.
- Never commit secrets—`.env` is ignored.

## Deploy

### Recommended: Vercel

```bash
vercel --prod
```

- Static assets deploy directly.
- `api/chat.js` runs as a serverless function next to the site, so `/api/chat` just works.

### Static hosting (no AI)

You can technically drop `index.html` + assets onto GitHub Pages or any static host, but the chat UI will remain offline without the Vercel (or Node) proxy—ship to Vercel if you want the full story.

## Customize the story

- Amend scenes, prompts, and memory strings inside `app.js`.
- Swap background music via `assets/bg-music.*` and any photo referenced in the script.
- Update AI tone by editing the `instructions` constant inside both `server.js` and `api/chat.js`.
- Add new utility classes or colors at the top of `styles.css` to keep the palette organized.

## Manual test checklist

- Walk the full Virginia-Highland map and trigger every hotspot interaction.
- Enter the hospital sequence (click-to-surgery then WASD roaming) and confirm `window.returnFromHospital()` restores the main flow.
- Exercise the “Logan ↔ David” chat with and without connectivity to ensure errors stay gentle.
- Confirm button enablement/progress tracking, plus the dachshund easter egg tap sequence.
- Load on desktop Chrome + mobile Safari to validate touch + keyboard inputs.

Share screenshots/GIFs plus any manual test notes in your PR so reviewers can relive the story.
