# Rider Triangle

A React PWA for comparing motorcycle riding positions. Upload bike photos, calibrate with tire diameter, input rider measurements, and get ergonomic angle analysis.

**Live Demo:** [https://damn-fine-pizza.github.io/rider-triangle/](https://damn-fine-pizza.github.io/rider-triangle/)

## Features

- **Photo-based calibration** - Use tire diameter to scale images accurately
- **Manual measurements** - Input exact measurements if you have physical access to the bike
- **Ergonomic angles** - Calculate knee, hip, back, and arm angles
- **Skeleton overlay** - Visual stick figure representation of rider position
- **Comfort zones** - Color-coded feedback (green/yellow/red) based on riding style
- **Export & Share** - Save comparison as PNG, copy shareable link
- **PWA** - Installable on mobile/desktop, works offline

## Quick Start

```bash
npm install      # Install dependencies
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Production build
npm run test     # Run tests
```

## Usage

1. **Add bikes** - Upload side-view photos or use defaults
2. **Select wheel** - Choose front or rear, enter tire specs
3. **Calibrate** - Click TOP and BOTTOM of tire, then rear axle center
4. **Place markers** - Click Seat, Footpeg, Handlebar positions
5. **Enter measurements** - Input rider height, inseam, etc.
6. **Compare** - View angles, distances, and skeleton overlay

### Keyboard Shortcuts

- `1-6` - Select calibration/marker tools
- `Tab` - Switch between bikes

## Tech Stack

- **Build:** Vite 5
- **Framework:** React 18
- **Styling:** Tailwind CSS
- **PWA:** vite-plugin-pwa (Workbox)
- **Testing:** Vitest + React Testing Library
- **Export:** html2canvas

## Project Structure

```
src/
├── components/        # React components
│   ├── Marker.jsx           # Draggable point marker
│   ├── CalibrationMarker.jsx # Calibration crosshair
│   ├── SkeletonOverlay.jsx   # Stick figure visualization
│   ├── AngleDisplay.jsx      # Angle comparison table
│   ├── RiderProfile.jsx      # Rider measurements form
│   ├── ManualMeasurements.jsx # Direct measurement input
│   └── ExportButton.jsx      # Export/share dropdown
├── hooks/             # Custom React hooks
│   ├── useCalibration.js     # Calibration state
│   ├── useMarkers.js         # Marker positions
│   ├── useRiderProfile.js    # Rider measurements
│   └── useMeasurementMode.js # Photo vs manual mode
├── utils/             # Utility functions
│   ├── geometry.js           # Distance, scale calculations
│   ├── ergonomics.js         # Angle calculations
│   ├── skeleton.js           # Joint position math
│   ├── tire.js               # Tire diameter parsing
│   └── export.js             # PNG export, URL encoding
└── data/              # Static data
    ├── bodyProportions.js    # Default body ratios
    └── comfortZones.js       # Angle comfort ranges
```

## Documentation

- `ROADMAP.md` - Development milestones and progress
- `CLAUDE.md` - AI assistant context file
- `RAW-DESCRIPTION.md` - Original product vision

## License

MIT
