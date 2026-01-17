# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Rider Triangle is a React PWA for comparing motorcycle riding positions - a self-service alternative to Cycle Ergo. Users overlay bike side-view images, calibrate using tire diameter, and calculate ergonomic measurements.

**Vision (see ROADMAP.md):** Upload any bike photo, input rider measurements, get ergonomic angle calculations (knee, hip, arm, torso).

**Priority document:** `RAW-DESCRIPTION.md` contains the full product vision and takes priority.

## Commands

```bash
npm install      # Install dependencies
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Production build to dist/
npm run preview  # Preview production build
```

## Project Structure

```
src/
├── main.jsx              # Entry point
├── App.jsx               # Main application component
├── index.css             # Tailwind imports
├── components/
│   ├── Marker.jsx        # Draggable point with mouse/touch support
│   └── ClickGuide.jsx    # Instruction tooltip
├── hooks/
│   └── useImage.js       # Image loading hook
├── utils/
│   └── tire.js           # Tire spec parsing and diameter calculation
└── data/
    ├── bikes.js          # Bike configurations (uses imageProvider)
    └── imageProvider.js  # Abstraction for image URLs (swappable)
```

## Tech Stack

- **Build**: Vite 5
- **Framework**: React 18
- **Styling**: Tailwind CSS
- **PWA**: vite-plugin-pwa (Workbox service worker)

## Architecture

### Image Provider Pattern

`src/data/imageProvider.js` abstracts image source resolution. Currently uses external URLs from moto.suzuki.it. Can be swapped to:
- Local bundle (`/images/vstrom.jpg`)
- Custom CDN
- Backend proxy

### Calibration Flow

1. User selects wheel (front/rear) for each bike
2. Clicks TOP and BOTTOM points on tire sidewall
3. Clicks rear axle center
4. App calculates px-to-mm ratio from known tire diameter
5. Second bike image is scaled/translated to align axles

### Key Calculations

- `pxPerMM` - Pixel-to-millimeter ratio from tire calibration
- `scaleB` - Scale factor normalizing second bike to first bike's ratio
- `translateB` - Translation to align rear axles
- `mmBetween()` - Distance in mm between rider triangle points

### PWA Features

- Service worker caches static assets
- External images cached for 30 days
- Installable on mobile/desktop

## Known Issues (Milestone 0)

Current code has bugs inherited from original ChatGPT prototype:
- Marker drag uses wrong coordinate system
- Moving one point can affect others
- Calibration procedure requires trial and error

See `ROADMAP.md` for fix plan.

## Legacy

- `RAW.md` - Original ChatGPT prototype (buggy, for reference only)
- `RAW-DESCRIPTION.md` - Product vision document (priority)
