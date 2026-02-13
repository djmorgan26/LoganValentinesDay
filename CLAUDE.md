# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A cinematic Valentine's Day love letter site from David to Logan. Vanilla HTML/CSS/JS frontend with a tiny Node server (zero runtime deps). Two main experiences:

1. **Cinematic Love Letter** — Auto-playing chapters with typewriter text, 3 interactive moments (fortune cookie flip, postcard flips, tap-to-count love reasons), particles, AI chat
2. **3D Hospital Scene** — Three.js (CDN, no build step) voxel-style surgery + roaming scene launched from the love letter finale

## Deployment

Hosted on Vercel (free tier). Production URL: `https://logan-valentines-day.vercel.app` (or current Vercel-assigned URL).

- **Static files** (HTML/CSS/JS/assets) served directly by Vercel.
- **API route** `POST /api/chat` handled by the serverless function in `api/chat.js`.
- **Environment variable** `GEMINI_API_KEY` is set in Vercel project settings (not committed).
- Redeploy: `vercel --prod` from the repo root.

## Commands

```bash
npm start          # node server.js → http://localhost:3000 (local dev with AI chat)
vercel --prod      # deploy to Vercel production
```

No build step, no deps to install, no test suite. Manual testing only.

## Architecture

- **`index.html`** — Single page: curtain overlay → 6 chapter `<section>` elements → hospital `<canvas>` overlay. Three.js loaded via CDN.
- **`styles.css`** — All presentation. Uses CSS custom properties in `:root`. BEM-like naming. 3D card flips use `perspective` + `transform-style: preserve-3d`.
- **`app.js`** — IIFE. Chapter sequencer auto-advances through chapters, pausing at interactive moments (Promise-based). Typewriter engine, particle spawner, IntersectionObserver for dot nav, AI chat. Exposes `window.returnFromHospital()` for hospital.js to call back.
- **`hospital.js`** — IIFE. All Three.js code. Two phases: surgery (raycaster click on 4 glowing spheres) → roaming (WASD movement, proximity triggers). Exposes `window.launchHospital()`. Characters built from `BoxGeometry` — no external 3D models.
- **`server.js`** — Zero-dep Node HTTP server for local dev. Serves static files + proxies `POST /api/chat` to Gemini API. Reads `.env` manually (no dotenv package). AI persona instructions are in `fetchGeminiReply()`.
- **`api/chat.js`** — Vercel serverless function. Mirrors the chat endpoint from `server.js` for production deployment. Uses `GEMINI_API_KEY` from Vercel env vars.
- **`vercel.json`** — Minimal Vercel config (no build command, rewrites for `/api/chat`).

## Key Patterns

- **No frameworks, no bundler.** All vanilla JS with template literals for HTML. Do not introduce npm dependencies.
- **Chapter flow is Promise-based.** `runShow()` is an async loop that awaits typewriter completion and interaction Promises before advancing. Interactive chapters return a Promise that resolves when the user completes the interaction.
- **Two-script bridge.** `app.js` and `hospital.js` communicate via `window.launchHospital()` and `window.returnFromHospital()`.
- **AI chat** sends `{ prompt, history }` to `POST /api/chat`. Server forwards to Gemini with a system instruction for David's romantic/playful tone. History capped at 8 messages.
- **Assets:** `assets/david.jpg`, `assets/logan.jpg` (avatars), `assets/willow.png` (dachshund), `assets/bg-music.m4a` (background music). All optional with graceful fallbacks (`onerror="this.style.display='none'"`).

## Environment

- **Local dev:** `.env` must contain `GEMINI_API_KEY=...`. The server reads it without any package.
- **Production (Vercel):** `GEMINI_API_KEY` is set as an environment variable in the Vercel project settings. Managed via `vercel env` CLI or the Vercel dashboard.
