# My Lists — PWA

A clean, installable iPhone web app with three tabs:

| Tab | What it does |
| --- | --- |
| **📝 To-Do** (left) | A typical to-do list — add tasks, tick them off, delete. Optionally assign a task to **a certain day**; dated tasks show a badge (red if overdue, green for today) and also appear in the calendar. |
| **📅 Calendar** (middle) | A calendar that **starts the day you first open the app** and grows every day. Tap any day to write a note and to see/add the tasks scheduled for it. Dots mark days with a note (blue) or a task (green). A **search bar** finds any note by text, with the match highlighted. Tap the month title to jump back to today. |
| **🛒 Shopping** (right) | Create multiple lists (profiles), add items, and tap **To buy / ✓ Bought** on the right of each item. |

Each tab header shows a live summary (e.g. *“3 open · 2 done”*).

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
