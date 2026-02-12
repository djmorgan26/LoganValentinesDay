# LoganValentinesDay 💛

A cozy open-world Valentine site (vanilla HTML/CSS/JS + tiny Node server) from **David** to **Logan**.

## What’s inside

- Free-roam **Virginia-Highland** map with glowing hotspots (elephants, sushi, travel loft, date-night studio, Starlight outlook)
- Inline mini-interactions (footprints, postcard flips, etc.) plus a persistent memory log
- Romantic + playful AI chat where Logan can type anything and “David” answers in his voice
- Hidden easter egg: **future dachshund** (tap the paw five times or button prompts)

## Add your assets

Put these in `assets/`:

**Required**

- images of David and Logan in assets folder

**Optional**

- `assets/willow.png` (any weener dog image to represent the future dog)
- `assets/bg-music.(mp3|m4a|wav)` if you’d like to swap in your own vibe. The repo already ships with a gentle synth pad at `assets/bg-music.m4a`.

If you don’t add optional assets, the site still works.

## Run locally

### Option A: Full experience (AI chat + static files)

```bash
npm start
# open http://localhost:3000
```

This loads `.env`, serves the static files, and proxies `/api/chat` to Gemini.

### Option B: Static-only preview

- VS Code Live Server, or
- `python3 -m http.server 8000` → open http://localhost:8000

The site renders, but the “Logan ↔ David” chat will show an offline message without the Node server.

## AI Love Line configuration

- Put your Google Generative AI key in `.env` as `GEMINI_API_KEY=...` (already done if you’re reading this repo).
- `server.js` reads `.env` (no extra deps) and exposes POST `/api/chat`.
- The front-end sends the recent conversation so Gemini replies stay in David’s playful tone.

## Deploy

### GitHub Pages

Repo → Settings → Pages → Deploy from `main` branch (root).  
Then send Logan the URL.

## Customize the text

Edit `app.js` scenes, memory strings, or the AI `instructions` inside `server.js`. Swap background music in `assets/bg-music.*` for a new vibe.
