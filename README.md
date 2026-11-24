# VeloX Time Travel - Fake Date & Timezone Changer

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-success.svg)]()
[![Firefox & Chrome](https://img.shields.io/badge/Browsers-Firefox%20%7C%20Chrome-orange.svg)]()

> **The ultimate developer instrument for mocking `Date`, fast-forwarding time, freezing clocks, and spoofing IANA timezones across client-side and server-side workflows.**

---

## 🌟 Highlights

- **Multi-Browser Manifest V3**: Native implementation for Mozilla Firefox (128+) and Google Chrome / Chromium.
- **Obsidian Monochrome UI**: Developer-first interface with instant **Light & Dark theme** toggling (defaults to Light).
- **ES5 Pure Compatibility**: Zero transpiler runtime dependencies; robust execution across all modern and legacy frame contexts.
- **Instant Date Mocking**: Freeze time, set target dates/times, jump ahead (+15m, +1h, +1d, +1w, +1m) with one click.
- **Full Timezone Spoofing**: Seamlessly overrides `Intl.DateTimeFormat` and browser system timezone to match any IANA zone or client IP.
- **On-Page HUD Capsule**: Non-intrusive floating HUD with draggable controls, instant freeze, and time display matching the extension theme.
- **Side Panel & Sidebar**: Native Firefox Sidebar and Chrome Side Panel support.
- **HTTP Header Injection**: Inject `X-Mock-Date` into outgoing fetch/XHR requests for backend synchronization.

---

## 📁 Repository Structure

```
VeloX-Time-Travel/
├── logo.png                # Official high-resolution brand artwork
├── package.bat             # Production build & zip packaging script
├── README.md               # Documentation & developer guide
├── .gitignore              # Git ignore rules
├── src/
│   ├── firefox/            # Firefox Manifest V3 Extension Source
│   │   ├── manifest.json   # Gecko-specific MV3 manifest
│   │   ├── background.js   # Background service worker / event script
│   │   ├── content/        # Page injection & isolated communication scripts
│   │   ├── shared/         # TimeEngine & IANA timezones catalog
│   │   ├── popup/          # Popup UI controller & Obsidian styles
│   │   ├── sidepanel/      # Firefox sidebar panel controller
│   │   ├── icons/          # Extension toolbar & brand logos
│   │   └── lib/            # Bootstrap & Flatpickr dependencies
│   └── chrome/             # Chrome Manifest V3 Extension Source
│       ├── manifest.json   # Chromium MV3 manifest
│       ├── background.js   # Service worker
│       ├── content/        # Page injection & isolated communication scripts
│       ├── shared/         # TimeEngine & IANA timezones catalog
│       ├── popup/          # Popup UI controller & Obsidian styles
│       ├── sidepanel/      # Chrome side panel controller
│       ├── icons/          # Extension toolbar & brand logos
│       └── lib/            # Bootstrap & Flatpickr dependencies
```

---

## 🚀 Quick Start / Installation

### Firefox
1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**
3. Select `src/firefox/manifest.json`.

### Google Chrome / Chromium
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `src/chrome` directory.

---

## 📦 Building Distribution Packages

Run the included automated batch script:

```cmd
package.bat
```

This compiles:
- `dist/velox-time-travel-firefox-v1.0.0.zip`
- `dist/velox-time-travel-chrome-v1.0.0.zip`

---

## 👤 Author

Developed by **[Vishwas R](https://vishwas.me)**.
