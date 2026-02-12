# Repository Guidelines

## Project Structure & Module Organization

- `index.html` contains the single-page layout and wiring for the Valentine experience; update copy or structure here sparingly.
- `styles.css` holds all presentation logic. Stick with the existing utility classes and CSS variables to keep the playful palette consistent.
- `app.js` powers the interactive scenes, progress bar, and state machine. Scenes live in the `scenes` object—duplicate a block to add new stops.
- Place required and optional images/audio in `assets/`. Keep filenames lowercase with hyphens (e.g., `assets/bg-music.mp3`).

## Build, Test, and Development Commands

- `python3 -m http.server 8000` — launches a static server for local testing at http://localhost:8000.
- `npx serve` — alternative cross-platform static host if you prefer Node tooling.
- `npm install --global live-server && live-server` — auto-reloads on HTML/JS edits; point it at the repo root.

## Coding Style & Naming Conventions

- JavaScript uses 2-space indentation, template literals for HTML snippets, and descriptive camelCase identifiers (`setProgress`, `safeAsset`).
- Prefer pure functions and simple state mutations on the shared `state` object; avoid introducing frameworks.
- CSS sticks to BEM-like class names (`tile__title`) and relies on flex/grid utilities already defined; add new tokens near the top of `styles.css`.
- Keep assets optimized (≤1 MB per file) and reference them via relative paths.

## Testing Guidelines

- No automated test suite exists; rely on manual walkthroughs of each scene (intro → choose → elephant/sushi/travel → future → finale).
- Before submitting, verify progress tracking, button enablement, and optional asset fallbacks (broken image handlers should hide missing photos).
- If you add audio or hidden interactions, test on mobile Safari and desktop Chrome to ensure touch and keyboard events work.

## Commit & Pull Request Guidelines

- History currently shows short, imperative commits; follow that style (e.g., "Add weener dog soundtrack").
- Each PR should describe the narrative change, screenshots/GIFs of new scenes, and any asset requirements. Link relevant issues or planning notes.
- Call out manual test steps performed so reviewers can reproduce them quickly.
