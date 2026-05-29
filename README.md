# My Lists — PWA

A clean, installable iPhone web app with three tabs:

| Tab | What it does |
| --- | --- |
| **📝 To-Do** (left) | A typical to-do list — add tasks, tick them off, delete. |
| **📅 Calendar** (middle) | A calendar starting **30 May 2026**. Each day up to today is open for notes. Tap a day to write what you want to remember and look it back up any time. Days with a note show a dot. |
| **🛒 Shopping** (right) | Create multiple lists (profiles), add items, and tap **To buy / ✓ Bought** on the right of each item. |

Everything is saved **locally on the device** (localStorage) and works **offline** thanks to a service worker — no account, no server.

## Install on iPhone

1. Open the deployed URL in **Safari**.
2. Tap the **Share** button → **Add to Home Screen**.
3. Launch it from the home screen — it runs full-screen like a native app.

## Deploy with GitHub Pages

This is a static site (plain HTML/CSS/JS), so no build step is needed.

1. Go to **Settings → Pages**.
2. Set **Source: Deploy from a branch**, **Branch: `main`**, folder **`/ (root)`**.
3. Save — your app will be live at `https://<user>.github.io/list/`.

All asset paths are relative, so it works correctly under the `/list/` sub-path.

## Project structure

```
index.html              App shell (3 screens + bottom tab bar)
styles.css              Styling (light + dark mode, safe-area aware)
app.js                  All logic (todo, calendar, shopping, storage)
manifest.webmanifest    PWA manifest
service-worker.js       Offline caching
icons/                  App icons (192 / 512 / 180 / maskable)
tools/gen_icons.py      Regenerates the icons (pure stdlib)
```

## Regenerate icons

```bash
python3 tools/gen_icons.py
```
