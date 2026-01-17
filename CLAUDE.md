# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Rider Triangle is a React PWA for comparing motorcycle riding positions - a self-service alternative to Cycle Ergo. Users overlay bike side-view images, calibrate using tire diameter, and calculate ergonomic measurements.

**Live Demo:** https://damn-fine-pizza.github.io/rider-triangle/

**Priority document:** `RAW-DESCRIPTION.md` contains the full product vision and takes priority.

## Commands

```bash
npm install      # Install dependencies
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Production build to dist/
npm run preview  # Preview production build
npm run test     # Run tests (vitest)
npm run test:run # Run tests once
```

## Project Structure

```
src/
├── main.jsx              # Entry point
├── App.jsx               # Main application component
├── index.css             # Tailwind imports
├── components/
│   ├── Marker.jsx            # Draggable point with mouse/touch support
│   ├── CalibrationMarker.jsx # Calibration crosshair markers (TOP/BOT)
│   ├── ClickGuide.jsx        # Instruction tooltip
│   ├── BikeCard.jsx          # Bike configuration card
│   ├── ImageUpload.jsx       # Drag & drop image upload
│   ├── RiderProfile.jsx      # Rider measurements form
│   ├── ManualMeasurements.jsx # Direct measurement input (bypass photo)
│   ├── AngleDisplay.jsx      # Angle comparison table with zones
│   ├── SkeletonOverlay.jsx   # SVG stick figure visualization
│   ├── ExportButton.jsx      # Export PNG / share link dropdown
│   ├── EditMode.jsx          # Fullscreen immersive marker placement
│   ├── EditModeHeader.jsx    # Tool indicator pill with exit button
│   └── TouchLoupe.jsx        # Magnifying glass for precise touch
├── hooks/
│   ├── useImage.js           # Image loading hook
│   ├── useCalibration.js     # Calibration state & calculations
│   ├── useMarkers.js         # Rider triangle markers state
│   ├── useRiderProfile.js    # Rider body measurements
│   ├── useBikeStore.js       # Bike library management
│   ├── useMeasurementMode.js # Photo vs manual mode toggle
│   ├── useEditMode.js        # Immersive edit mode state
│   └── usePinchZoom.js       # Pinch-to-zoom gesture handling
├── utils/
│   ├── tire.js               # Tire spec parsing and diameter calculation
│   ├── geometry.js           # Distance, scale, translation calculations
│   ├── ergonomics.js         # Angle calculations (knee, hip, back, arm)
│   ├── skeleton.js           # Joint position calculations (two-circle intersection)
│   ├── export.js             # PNG export, URL encoding, session storage
│   └── ergonomics.test.js    # Unit tests for angle calculations
├── data/
│   ├── bikes.js              # Default bike configurations
│   ├── imageProvider.js      # Abstraction for image URLs
│   ├── bodyProportions.js    # NASA-based body proportion ratios
│   └── comfortZones.js       # Angle comfort/warning/extreme ranges
└── test/
    └── setup.js              # Vitest setup
```

## Tech Stack

- **Build**: Vite 5
- **Framework**: React 18
- **Styling**: Tailwind CSS
- **PWA**: vite-plugin-pwa (Workbox service worker)
- **Testing**: Vitest + React Testing Library
- **Export**: html2canvas

## Architecture

### Hooks

- **useCalibration(bikes)** - Manages wheel selection, calibration points, axle positions, and derived calculations (pxPerMM, scale, translation)
- **useMarkers(bikeKeys)** - Manages rider triangle markers (seat, peg, bar) and distance calculations
- **useRiderProfile()** - Manages rider body measurements with localStorage persistence
- **useMeasurementMode()** - Toggles between photo-based and manual measurement input
- **useBikeStore()** - Manages bike library with add/remove/update and localStorage persistence
- **useImage(src)** - Tracks image loading and natural dimensions
- **useEditMode(options)** - Manages immersive fullscreen edit mode (enter, exit, tool advance, swipe-to-exit)
- **usePinchZoom(options)** - Handles pinch-to-zoom and pan gestures for mobile

### Key Calculations

**Geometry (`src/utils/geometry.js`):**
- `distance(a, b)` - Euclidean distance between points
- `calculatePxPerMM(calibPts, tireDiameter)` - Pixel-to-mm ratio
- `calculateScale(pxPerMM_A, pxPerMM_B)` - Scale factor for alignment
- `calculateTranslation(axleA, axleB, scale)` - Translation for axle alignment

**Ergonomics (`src/utils/ergonomics.js`):**
- `calculateKneeAngle(seatPegDist, thigh, lowerLeg)` - Law of cosines
- `calculateHipAngle(seat, peg, bar, torso)` - Vector angle
- `calculateBackAngle(seat, bar)` - Angle from vertical
- `calculateArmAngle(seatBarDist, upperArm, forearm)` - Law of cosines

**Skeleton (`src/utils/skeleton.js`):**
- `calculateSkeletonJoints(markers, measurements, pxPerMM)` - Two-circle intersection for natural joint positions

### Calibration Flow

1. User selects wheel (front/rear) for each bike
2. Clicks TOP and BOTTOM points on tire sidewall (auto-advances)
3. Clicks rear axle center (auto-advances)
4. Places rider triangle points: seat, footpeg, handlebar
5. App calculates px-to-mm ratio and aligns images

### Keyboard Shortcuts

- `1-6` - Select tools (calibTop, calibBot, axle, seat, peg, bar)
- `Tab` - Switch active bike

### PWA Features

- Service worker caches static assets
- External images cached for 30 days
- Installable on mobile/desktop
- iOS/Android meta tags for home screen

## Development Practices

### Centralized Constants

All magic numbers and configurable values should be in `src/constants.js`:
- `TOUCH` - Touch interaction thresholds (tap duration, movement, loupe delay)
- `LOUPE` - Touch loupe appearance (size, magnification, offset)
- `ZOOM` - Pinch-zoom limits and behavior
- `EDIT_MODE` - Immersive edit mode settings (animation, header height, swipe threshold)
- `TOOL_SEQUENCE` / `TOOL_LABELS` - Calibration tool definitions
- `MARKER_TYPES` - Rider triangle marker types
- `STAGE_MIN_HEIGHT_PX` - Minimum stage height

When adding features, check if constants should be centralized.

### Code Quality

Build fails if linting or formatting fails:

```bash
npm run lint        # ESLint (v9 flat config)
npm run lint:fix    # Auto-fix lint issues
npm run format      # Format with Prettier
npm run format:check # Check formatting
npm run build       # Runs lint + format:check + vite build
```

### TDD Approach

When implementing new features or fixing bugs, follow Test-Driven Development:
1. **Write the test first** - define expected behavior
2. **Run test** - verify it fails (red)
3. **Implement the feature** - minimal code to pass
4. **Run test** - verify it passes (green)
5. **Refactor** if needed

Map new features to tests in README.md and ROADMAP.md.

## Testing

### Unit Tests (Vitest)

```bash
npm run test      # Watch mode
npm run test:run  # Single run
```

Tests are in `src/utils/*.test.js`. Currently testing ergonomics calculations.

### E2E Tests (Playwright)

```bash
npx playwright test                    # Run all E2E tests
npx playwright test --project=chromium # Chromium only
npx playwright test e2e/pwa.spec.js    # Specific test file
```

E2E tests are in `e2e/` directory:
- `pwa.spec.js` - PWA manifest, service worker, install prompts
- `mobile-markers.spec.js` - Touch/tap marker placement, pinch-zoom

**Playwright config:** `playwright.config.js`
- Projects: chromium, android-chrome (Pixel 5), ios-safari (iPhone 13)
- Base URL: `http://localhost:4173/rider-triangle/`

## Deployment

GitHub Pages via GitHub Actions. Push to `main` triggers build and deploy.

Workflow: `.github/workflows/deploy.yml`

## Legacy

- `RAW.md` - Original ChatGPT prototype (for reference only)
- `RAW-DESCRIPTION.md` - Product vision document (priority)
