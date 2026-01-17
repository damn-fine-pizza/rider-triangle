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
│   ├── useImage.js       # Image loading hook
│   ├── useCalibration.js # Calibration state & calculations
│   └── useMarkers.js     # Rider triangle markers state
├── utils/
│   ├── tire.js           # Tire spec parsing and diameter calculation
│   └── geometry.js       # Distance, scale, translation calculations
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

### Hooks

- **useCalibration(bikes)** - Manages wheel selection, calibration points, axle positions, and derived calculations (pxPerMM, scale, translation)
- **useMarkers(bikeKeys)** - Manages rider triangle markers (seat, peg, bar) and distance calculations
- **useImage(src)** - Tracks image loading and natural dimensions

### Image Provider Pattern

`src/data/imageProvider.js` abstracts image source resolution. Currently uses external URLs from moto.suzuki.it. Can be swapped to local bundle, custom CDN, or backend proxy.

### Calibration Flow

1. User selects wheel (front/rear) for each bike
2. Clicks TOP and BOTTOM points on tire sidewall (auto-advances)
3. Clicks rear axle center (auto-advances)
4. Places rider triangle points: seat, footpeg, handlebar
5. App calculates px-to-mm ratio and aligns images

### Key Calculations (in `src/utils/geometry.js`)

- `distance(a, b)` - Euclidean distance between points
- `calculatePxPerMM(calibPts, tireDiameter)` - Pixel-to-mm ratio
- `calculateScale(pxPerMM_A, pxPerMM_B)` - Scale factor for alignment
- `calculateTranslation(axleA, axleB, scale)` - Translation for axle alignment
- `distanceInMM(pointA, pointB, pxPerMM)` - Real-world distance
- `angleBetween(a, vertex, c)` - Angle calculation (for future ergonomics)

### PWA Features

- Service worker caches static assets
- External images cached for 30 days
- Installable on mobile/desktop

## Legacy

- `RAW.md` - Original ChatGPT prototype (for reference only)
- `RAW-DESCRIPTION.md` - Product vision document (priority)
