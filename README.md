# Batch HTML Downloader Pro — v2.0

A Chrome extension for downloading series of sequentially numbered files from any URL pattern. Version 2 brings a fully redesigned dark-mode interface, per-session statistics, download history, and smarter download controls.

## What's new in v2.0

The original extension worked well but had a plain interface with no persistence, no configurable parameters, and batch sizes hard-coded to 100 files with 500 failure tolerance. This version addresses all of that.

**Interface** — Four-tab layout (Download, Progress, History, Settings) with a dark glassmorphism design, live stats cards, and a color-coded progress bar.

**Statistics** — Real-time counters for files downloaded, total failures, current failure streak, and a files-per-minute speed indicator. Elapsed time and a visual streak progress bar help you judge when to stop early.

**History** — Completed sessions are saved automatically with their base URL, file counts, and timestamp. Click any history entry to reload that URL and folder into the form instantly.

**Configurable parameters** — Batch size (1–50), max consecutive failures (5–500), and inter-file delay (0–5000ms) are all adjustable per session from the Download tab.

**File extension** — No longer locked to `.html`. You can set any extension (`.htm`, `.php`, `.aspx`, etc.) in the form.

**Smart stop** — Can be toggled in Settings. When enabled, the download stops as soon as the failure streak hits the limit. When disabled it always runs the full batch before checking.

**Service Worker** — Background.js is a proper MV3 service worker that listens to `chrome.downloads.onChanged` for accurate status relay.

## How to use

Paste a URL ending with a number and the target extension into the Start URL field, for example `https://example.com/archive/00100.html`. The extension extracts the number, starts there, and works upward through numbers in batches. It stops automatically when consecutive failures hit the configured maximum.

Use the subfolder field to organize downloaded files into a named folder inside your Chrome downloads directory. This is especially useful for large batches.

You can pause at any time and resume without losing progress. The Stop button ends the session and logs it to History.

## Install

1. Clone or download this repo
2. Open Chrome and go to `chrome://extensions`
3. Enable Developer Mode (top right)
4. Click **Load unpacked**
5. Select this folder

## Permissions

- `downloads` — required to save files to disk
- `storage` — used only for persisting session history and settings locally in the browser

No network requests are made by the extension itself. All data stays on your machine.
