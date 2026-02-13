# Repository Guidelines

## Project Structure & Module Organization

- `index.html` contains the single-page layout and wiring for the Valentine experience; update copy or structure here sparingly.
- `styles.css` holds all presentation logic. Stick with the existing utility classes and CSS variables to keep the playful palette consistent.
- `app.js` — IIFE powering the cinematic chapter sequencer, typewriter engine, interactive moments, particles, and AI chat UI. Exposes `window.returnFromHospital()`.
- `hospital.js` — IIFE with all Three.js code. Surgery phase (raycaster clicks) → roaming phase (WASD movement, proximity triggers). Exposes `window.launchHospital()`.
- `server.js` is a tiny Node server for **local dev** that serves static assets and proxies `/api/chat` to Gemini using `.env`.
- `api/chat.js` — Vercel serverless function mirroring the chat endpoint from `server.js` for **production**.
- `vercel.json` — Minimal Vercel deployment config.
- `package.json` only provides the `npm start` script (no runtime deps) so you can keep the stack portable.
- Place required and optional images/audio in `assets/`. Keep filenames lowercase with hyphens (e.g., `assets/bg-music.m4a`).

## Build, Test, and Development Commands

- `npm start` — runs `node server.js` (serves static files + AI chat). Visit http://localhost:3000 for the full experience.
- `vercel --prod` — deploy to Vercel production. Static files served directly; `api/chat.js` runs as a serverless function.
- `vercel dev` — local dev using Vercel's runtime (uses `api/chat.js` instead of `server.js`).
- `python3 -m http.server 8000` — static-only preview when you don't need AI.
- Music: the repo ships with `assets/bg-music.m4a`; swap it out with your own loop (mp3/m4a/wav) to personalize the sound.

## Coding Style & Naming Conventions

- JavaScript uses 2-space indentation, template literals for HTML snippets, and descriptive camelCase identifiers (`setProgress`, `safeAsset`).
- Prefer pure functions and simple state mutations on the shared `state` object; avoid introducing frameworks.
- CSS sticks to BEM-like class names (`tile__title`) and relies on flex/grid utilities already defined; add new tokens near the top of `styles.css`.
- Keep assets optimized (≤1 MB per file) and reference them via relative paths.

## Testing Guidelines

- No automated test suite exists; rely on manual walkthroughs of the map + each hotspot.
- Test the “Logan ↔ David” chat with and without connectivity so errors stay friendly.
- Verify progress tracking, button enablement, and optional asset fallbacks (broken image handlers should hide missing photos).
- If you add audio or hidden interactions, test on mobile Safari and desktop Chrome to ensure touch and keyboard events work.

## AI Chat & Secrets

- **Local dev:** `.env` should contain `GEMINI_API_KEY=...`. `server.js` reads it into `process.env`.
- **Production (Vercel):** `GEMINI_API_KEY` is set as a Vercel environment variable. Manage via `vercel env` CLI or the Vercel dashboard.
- The AI endpoint expects payload `{ prompt, history }`. Keep responses ≤120 words and romantic/playful; edit `instructions` in both `server.js` and `api/chat.js` if you need a different tone.
- Never commit the actual key—use `.env` locally, Vercel env vars in production.

## Commit & Pull Request Guidelines

- History currently shows short, imperative commits; follow that style (e.g., "Add weener dog soundtrack").
- Each PR should describe the narrative change, screenshots/GIFs of new scenes, and any asset requirements. Link relevant issues or planning notes.
- Call out manual test steps performed so reviewers can reproduce them quickly.
