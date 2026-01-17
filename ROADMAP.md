# Rider Triangle Roadmap

**Goal:** Build a self-service Cycle Ergo alternative where users can upload bike photos, input rider measurements, and get visual ergonomic analysis with angle calculations.

**Core Value Proposition:** Unlike Cycle Ergo (which requires sending photos and waiting for manual processing), this tool provides instant, client-side analysis that users control entirely.

---

## Current State Summary

| Milestone | Status | Description |
|-----------|--------|-------------|
| 0 - Stabilization | ✅ Complete | Bug fixes, hooks architecture |
| 1 - Image Upload | ✅ Complete | Custom bikes, localStorage |
| 2 - Rider Profile | ✅ Complete | Body measurements, proportions |
| 3 - Angle Calculations | ✅ Complete | Connect rider to bike, compute angles |
| 3.5 - GitHub Pages | ✅ Complete | Deploy preview to GitHub Pages |
| 4 - Visual Feedback | ✅ Complete | Skeleton overlay, comfort zones |
| 5 - Real Measurements | ✅ Complete | Bypass photo estimation |
| 6 - Calibration UX | ✅ Complete | Visual markers, keyboard shortcuts |
| 7 - Export & Share | ✅ Complete | PNG export, shareable links |
| 8 - Mobile & Polish | ✅ Complete | Touch, wizard, dark mode, accessibility |
| 8.5 - Performance | ✅ Complete | Lazy loading, IndexedDB, compression |
| 9 - Bike Database | ⬅️ Next | Pre-configured popular bikes |
| 10 - Fit Recommendations | Planned | AI-powered suggestions |
| 11 - Multi-Position Analysis | Planned | Sport/touring/commute modes |
| 12 - Session History | Planned | Compare across time |
| 13 - Internationalization | Planned | Multi-language, unit systems |

---

## Milestone 0: Stabilization & Refactoring ✅ COMPLETE

Fix known bugs and prepare architecture for extensibility.

### Fixed Issues
- ~~Overlay alignment imprecise~~ → Proper scale/translate calculations
- ~~Moving one point affects others unexpectedly~~ → Fixed Marker drag using delta
- ~~Calibration procedure confusing~~ → Auto-advance tool after each click
- ~~Hardcoded bikes only~~ → Addressed in Milestone 1

### Completed Tasks
- [x] Refactor state into dedicated hooks (`useCalibration`, `useMarkers`)
- [x] Fix Marker drag (use delta from click, not offsetLeft/Top)
- [x] Extract geometry calculations to `src/utils/geometry.js`
- [x] Add reset/clear functionality per bike
- [x] Auto-advance tool after point placement
- [x] `angleBetween()` function ready for angle calculations

### Files
| File | Status |
|------|--------|
| `src/hooks/useCalibration.js` | ✅ Created |
| `src/hooks/useMarkers.js` | ✅ Created |
| `src/utils/geometry.js` | ✅ Created |
| `src/components/Marker.jsx` | ✅ Fixed |
| `src/App.jsx` | ✅ Refactored |

---

## Milestone 1: Custom Image Upload ✅ COMPLETE

Allow users to upload their own bike photos instead of hardcoded URLs.

### Completed Tasks
- [x] Image upload component (drag & drop + file picker)
- [x] Store images in browser (base64 in localStorage)
- [x] Dynamic bike slots (add/remove)
- [x] Manual tire spec input (front/rear)
- [x] Persist session in localStorage
- [x] Multiple bikes library with slot selection

### Files
| File | Status |
|------|--------|
| `src/components/ImageUpload.jsx` | ✅ Created |
| `src/components/BikeCard.jsx` | ✅ Created |
| `src/hooks/useBikeStore.js` | ✅ Created |
| `src/utils/storage.js` | ✅ Created |
| `src/App.jsx` | ✅ Updated |

---

## Milestone 2: Rider Profile ✅ COMPLETE

Add rider body measurements for angle calculations.

### Completed Tasks
- [x] Rider profile form: height, inseam, torso, arm length
- [x] Default proportions from height (NASA-STD-3000, ANSUR II data)
- [x] Override individual measurements with actual values
- [x] Seat position selector (forward/center/back)
- [x] Store multiple rider profiles (localStorage)
- [x] `getEffectiveMeasurements()` function ready

### Files
| File | Status |
|------|--------|
| `src/components/RiderProfile.jsx` | ✅ Created |
| `src/data/bodyProportions.js` | ✅ Created |
| `src/hooks/useRiderProfile.js` | ✅ Created |
| `src/App.jsx` | ✅ Updated |

### Gap Addressed in Milestone 3
- ~~Rider profile exists but is NOT YET connected to bike markers for angle calculation~~ ✅ Fixed

---

## Milestone 3: Ergonomic Angle Calculations ✅ COMPLETE

**Goal:** Connect rider body measurements to bike marker positions and calculate ergonomic angles.

### Background
The "rider triangle" is formed by three points: Seat, Footpeg, Handlebar. Combined with rider body proportions, we can estimate:
- **Knee angle:** How bent the knee is at the bottom of pedal stroke
- **Hip angle:** Torso-to-thigh angle (affects lower back comfort)
- **Back angle:** Torso inclination from vertical (riding posture)
- **Arm angle:** Elbow bend when reaching handlebars

### Completed Tasks
- [x] Create `src/utils/ergonomics.js` with angle calculation functions
- [x] Calculate knee angle from seat-peg distance + leg segments (law of cosines)
- [x] Calculate hip angle from torso-thigh vectors
- [x] Calculate back/torso angle from seat-bar vector vs vertical
- [x] Calculate arm angle from seat-bar distance + arm segments
- [x] Create `AngleDisplay` component with single and comparison modes
- [x] Create `RidingStyleSelector` for style-specific comfort zones
- [x] Add angle comparison table (Bike A vs Bike B) with delta display
- [x] Color-code angles (green=comfort, yellow=warning, red=extreme)
- [x] Create `src/data/comfortZones.js` with zone definitions

### Angle Calculation Logic

```
Knee Angle:
- Input: seat-peg distance (mm), inseam (mm), thigh/lower leg ratio
- Method: Law of cosines with leg segments
- Comfort zone: 140°-155° (slightly bent)

Hip Angle:
- Input: seat height relative to peg, torso length, seat position offset
- Method: Angle between torso vector and thigh vector
- Comfort zone: 90°-120° (more open = more comfort)

Back Angle:
- Input: seat-bar horizontal distance, seat-bar vertical distance
- Method: Angle from vertical
- Comfort zone: 20°-45° (sport: 45°+, touring: 20°-30°)

Arm Angle:
- Input: seat-bar distance (mm), arm length (mm)
- Method: Similar to knee - law of cosines
- Comfort zone: 150°-170° (slight bend, not locked)
```

### Files Created/Modified
| File | Status |
|------|--------|
| `src/utils/ergonomics.js` | ✅ Created - angle calculations |
| `src/data/comfortZones.js` | ✅ Created - zone definitions |
| `src/components/AngleDisplay.jsx` | ✅ Created - results + comparison |
| `src/App.jsx` | ✅ Updated - integrated angles panel |

---

## Milestone 3.5: GitHub Pages Deployment ✅ COMPLETE

**Goal:** Deploy the app to GitHub Pages for public preview.

### Completed Tasks
- [x] Configure Vite base path for GitHub Pages
- [x] Create GitHub Actions workflow for automated deployment
- [x] Enable GitHub Pages in repo settings

### Files
| File | Status |
|------|--------|
| `vite.config.js` | ✅ Updated - added `base: '/rider-triangle/'` |
| `.github/workflows/deploy.yml` | ✅ Created - CI/CD workflow |

### Deployment URL
`https://<username>.github.io/rider-triangle/`

---

## Milestone 4: Visual Feedback & Skeleton Overlay ✅ COMPLETE

**Goal:** Show a stick figure representation of the rider on the bike for intuitive understanding.

### Completed Tasks
- [x] Create SVG-based stick figure (skeleton) component
- [x] Position skeleton based on seat/peg/bar markers + body proportions
- [x] Show angle arcs visually on the skeleton (knee and hip angles)
- [x] Toggle skeleton visibility per bike
- [x] Toggle angle arcs visibility
- [x] Color skeleton segments based on comfort (green/yellow/red)

### Skeleton Segments
```
- Head (circle)
- Torso (line from hip to shoulder)
- Upper arm (shoulder to elbow)
- Forearm (elbow to hand/bar)
- Thigh (hip/seat to knee)
- Lower leg (knee to foot/peg)
```

### Technical Implementation
- Two-circle intersection algorithm for natural knee/elbow bends
- Lean calculation based on hip-to-bar vector
- Comfort zone colors applied to segments and joints
- AngleArc component for visual angle indicators

### Files
| File | Status |
|------|--------|
| `src/components/SkeletonOverlay.jsx` | ✅ Created |
| `src/utils/skeleton.js` | ✅ Created - skeleton positioning math |

### Future Enhancements (Deferred)
- [ ] Animate skeleton when changing rider profile values
- [ ] Add "ideal position" ghost overlay option

---

## Milestone 5: Real Measurements Mode ✅ COMPLETE

**Goal:** When user has physical access to bike, input exact measurements instead of photo estimates.

### Rationale
Photo-based measurements are approximations. Factors affecting accuracy:
- Camera distance and lens focal length vary between manufacturers
- Perspective distortion
- Manual point placement precision

With real measurements, user gets precise ergonomic analysis.

### Completed Tasks
- [x] Add "Measurement Mode" toggle per bike: Photo / Manual
- [x] Direct input fields for:
  - Seat → Peg (horizontal distance behind seat)
  - Seat → Peg (vertical distance below seat)
  - Seat → Bar (horizontal reach forward)
  - Seat → Bar (vertical drop)
- [x] Bypass photo calibration when manual mode active
- [x] Calculate angles from manual measurements
- [x] Display calculated distances from manual inputs

### Files
| File | Status |
|------|--------|
| `src/components/ManualMeasurements.jsx` | ✅ Created |
| `src/hooks/useMeasurementMode.js` | ✅ Created |
| `src/utils/ergonomics.js` | ✅ Updated - added calculateAllAnglesFromDistances |
| `src/App.jsx` | ✅ Updated - integrated measurement mode |

### Future Enhancements (Deferred)
- [ ] Show side-by-side: photo estimated vs manual measurements
- [ ] Allow hybrid: some measurements manual, rest from photo

---

## Milestone 6: Calibration UX Improvements ✅ COMPLETE

**Goal:** Make the calibration process more intuitive and precise.

### Completed Tasks
- [x] Show calibration point markers on image (TOP/BOTTOM crosshairs with labels)
- [x] Show calibration line with measurement label (tire diameter in mm)
- [x] Keyboard navigation between tools (1-6 keys)
- [x] Tab key to switch between bikes
- [x] Added iOS PWA support meta tags

### Files
| File | Status |
|------|--------|
| `src/components/CalibrationMarker.jsx` | ✅ Created |
| `src/App.jsx` | ✅ Updated - keyboard shortcuts, calibration markers |
| `index.html` | ✅ Updated - iOS/Android PWA meta tags |

### Deferred to Future Milestones
- [ ] Add zoom/pan for image (pinch on mobile, scroll wheel on desktop)
- [ ] Add "guide mode" with animated hints
- [ ] Snap-to-edge option for wheel calibration
- [ ] Undo last point placement

---

## Milestone 7: Export & Share ✅ COMPLETE

**Goal:** Allow users to save and share their comparison results.

### Completed Tasks
- [x] Export comparison as PNG image (using html2canvas)
- [x] Generate shareable URL with encoded state
- [x] Copy share link to clipboard
- [x] Export button with dropdown menu
- [x] Fixed activeBike sync bug (useMemo → useEffect)
- [x] Added functional tests for ergonomics calculations

### Files
| File | Status |
|------|--------|
| `src/utils/export.js` | ✅ Created - PNG export, URL encoding, sessions |
| `src/components/ExportButton.jsx` | ✅ Created - Export dropdown UI |
| `src/utils/ergonomics.test.js` | ✅ Created - Unit tests |
| `vitest.config.js` | ✅ Created - Test configuration |
| `package.json` | ✅ Updated - test scripts |

### Deferred to Future Milestones
- [ ] Export as PDF report
- [ ] Import from shared URL
- [ ] Save/load named sessions locally

---

## Milestone 8: Mobile & Polish ✅ COMPLETE

**Goal:** Final refinements for public release.

### UX Improvements
- [x] Guided wizard for first-time users (step-by-step onboarding)
- [x] Collapsible panels for mobile
- [x] Touch-optimized marker dragging (larger hit areas)
- [x] Haptic feedback on mobile (Vibration API)
- [x] Responsive layout refinements
- [x] Loading states and error handling
- [x] Empty states with helpful prompts

### Theming
- [x] Dark/light mode toggle with system preference detection
- [x] CSS custom properties for theme colors
- [x] Persistent theme preference in localStorage

### Accessibility
- [x] Keyboard navigation for all interactions (1-6 keys, Tab)
- [x] Screen reader labels (ARIA)
- [x] Reduced motion support (prefers-reduced-motion)

### Files
| File | Status |
|------|--------|
| `src/components/CollapsiblePanel.jsx` | ✅ Created |
| `src/components/OnboardingOverlay.jsx` | ✅ Created |
| `src/components/LoadingSpinner.jsx` | ✅ Created |
| `src/hooks/useOnboarding.js` | ✅ Created |
| `src/hooks/useTheme.js` | ✅ Created |
| `src/utils/haptics.js` | ✅ Created |
| `src/index.css` | ✅ Updated - CSS custom properties, component classes |
| `src/components/Marker.jsx` | ✅ Updated - touch targets, ARIA |
| `src/components/CalibrationMarker.jsx` | ✅ Updated - touch targets, ARIA |
| `src/components/ExportButton.jsx` | ✅ Updated - loading spinner, CSS classes |
| `src/App.jsx` | ✅ Updated - dark mode, haptics, CSS classes |
| `tailwind.config.js` | ✅ Updated - darkMode: 'class' |

---

## Milestone 8.5: Performance Optimization ✅ COMPLETE

**Goal:** Optimize storage and loading for better performance.

### Tasks
- [x] Image compression before storing (Canvas API resize + JPEG compression)
- [x] IndexedDB for large image storage (vs localStorage 5-10MB limit)
- [x] Lazy load heavy components (ExportButton with html2canvas)
- [ ] Service worker caching improvements (deferred)

### Files
| File | Status |
|------|--------|
| `src/utils/imageCompression.js` | ✅ Created - compress/resize images |
| `src/utils/indexedDB.js` | ✅ Created - IndexedDB wrapper |
| `src/hooks/useBikeStore.js` | ✅ Updated - compression + IndexedDB |
| `src/App.jsx` | ✅ Updated - React.lazy for ExportButton |

---

## Milestone 9: Bike Database

**Goal:** Provide pre-configured bikes so users can quickly compare without uploading photos.

### Tasks
- [ ] Create bike database schema (brand, model, year, category, geometry)
- [ ] Add official geometry data for popular motorcycles:
  - Sport: Yamaha R1, Honda CBR, Kawasaki ZX, Suzuki GSX-R
  - Adventure: BMW GS, KTM Adventure, Honda Africa Twin, Suzuki V-Strom
  - Naked: MT-07/09, Z900, Street Triple, Monster
  - Touring: Gold Wing, K1600, FJR1300
  - Cruiser: Harley models, Indian, Rebel
- [ ] Include official manufacturer images (with attribution)
- [ ] Search/filter by brand, category, year, seat height
- [ ] "Quick compare" preset combinations (e.g., "Adventure vs Sport")
- [ ] User can override database values with own measurements
- [ ] Flag for "verified" vs "community" data

### Data Sources
- Manufacturer spec sheets
- Cycle-ergo.com (reference, not copy)
- RevZilla/Motorcycle.com reviews
- Community contributions

### Files
| File | Action |
|------|--------|
| `src/data/bikeDatabase.js` | Create - structured bike data |
| `src/components/BikeSearch.jsx` | Create - search/filter UI |
| `src/components/BikePresetCard.jsx` | Create - quick select cards |
| `src/hooks/useBikeDatabase.js` | Create - search/filter logic |

---

## Milestone 10: Fit Recommendations & Comfort Analysis

**Goal:** Provide actionable recommendations based on calculated angles.

### Comfort Zones Reference
```
| Angle | Comfort Zone | Warning Zone | Extreme Zone |
|-------|--------------|--------------|--------------|
| Knee | 140°-155° | 130°-140° / 155°-165° | <130° / >165° |
| Hip | 90°-120° | 80°-90° / 120°-135° | <80° / >135° |
| Back | 20°-45° | 10°-20° / 45°-60° | <10° / >60° |
| Arm | 150°-170° | 140°-150° / 170°-175° | <140° / >175° |
```

### Tasks
- [ ] Define comfort zones for each angle (with riding style variations)
- [ ] Generate text recommendations:
  - "Your knee angle is 128°. This may cause knee strain on long rides."
  - "Consider raising the seat or choosing a bike with higher pegs."
- [ ] Suggest adjustments:
  - Seat height adjustment range
  - Handlebar riser recommendations
  - Footpeg lowering kits
- [ ] Compare to "ideal" position for rider height
- [ ] Long-ride fatigue prediction
- [ ] Riding style fit score (0-100):
  - Sport: favors aggressive angles
  - Touring: favors relaxed angles
  - Commute: balanced
- [ ] "Best fit" bike suggestion from database

### Files
| File | Action |
|------|--------|
| `src/data/comfortZones.js` | Create - angle reference data |
| `src/utils/recommendations.js` | Create - recommendation engine |
| `src/components/RecommendationPanel.jsx` | Create - display suggestions |
| `src/components/FitScore.jsx` | Create - visual score indicator |

---

## Milestone 11: Multi-Position Analysis

**Goal:** Analyze different riding positions on the same bike.

### Background
Riders don't stay in one position. This milestone adds:
- **Seated positions:** Forward, center, back on seat
- **Hand positions:** (for sport bikes) Hoods, drops, bar ends
- **Standing position:** (for adventure bikes)

### Tasks
- [ ] Add position selector per bike
- [ ] Define position offsets for each riding style:
  - Sport seated forward: -30mm seat, -20mm reach
  - Standing adventure: +200mm hip height, different angles
- [ ] Calculate angles for each position
- [ ] Show position comparison on same bike
- [ ] Animated transition between positions
- [ ] Time-weighted comfort analysis (e.g., "70% seated, 30% standing")

### Files
| File | Action |
|------|--------|
| `src/data/ridingPositions.js` | Create - position definitions |
| `src/components/PositionSelector.jsx` | Create - position toggle UI |
| `src/hooks/usePositionAnalysis.js` | Create - multi-position calculations |

---

## Milestone 12: Session History & Progress Tracking

**Goal:** Track changes over time (bike modifications, rider flexibility improvements).

### Use Cases
- Track how seat adjustment affects comfort
- Monitor rider flexibility improvements over time
- Compare "before/after" bike modifications
- A/B test different setups

### Tasks
- [ ] Save analysis sessions with timestamp
- [ ] Name/tag sessions (e.g., "Stock setup", "After bar risers")
- [ ] Timeline view of sessions
- [ ] Diff view: compare two sessions side-by-side
- [ ] Export session history
- [ ] Cloud sync option (optional, privacy-first)
- [ ] Analytics: most common issues, improvements over time

### Files
| File | Action |
|------|--------|
| `src/hooks/useSessionHistory.js` | Create - history management |
| `src/components/SessionTimeline.jsx` | Create - history view |
| `src/components/SessionDiff.jsx` | Create - comparison view |
| `src/utils/sessionStorage.js` | Create - IndexedDB persistence |

---

## Milestone 13: Internationalization & Units

**Goal:** Support global users with multiple languages and unit systems.

### Languages (Priority Order)
1. English (default)
2. Italian
3. German
4. Spanish
5. French
6. Portuguese

### Unit Systems
- **Metric:** mm, cm, degrees
- **Imperial:** inches, feet-inches, degrees
- **Mixed:** (common in US motorcycle world)

### Tasks
- [ ] Set up i18n framework (react-i18next)
- [ ] Extract all UI strings to translation files
- [ ] Add language selector
- [ ] Add unit system selector
- [ ] Convert all measurements on display (store in metric internally)
- [ ] Locale-aware number formatting
- [ ] RTL support preparation (for future Arabic/Hebrew)

### Files
| File | Action |
|------|--------|
| `src/i18n/index.js` | Create - i18n setup |
| `src/i18n/locales/en.json` | Create - English strings |
| `src/i18n/locales/it.json` | Create - Italian strings |
| `src/hooks/useUnits.js` | Create - unit conversion |
| `src/components/LanguageSelector.jsx` | Create |
| `src/components/UnitSelector.jsx` | Create |

---

## Milestone 14: Advanced Ergonomics (Post-MVP Enhancement)

**Goal:** Deep-dive ergonomic analysis for serious riders and fitters.

### Tasks
- [ ] Saddle pressure map estimation
- [ ] Wrist angle calculation
- [ ] Neck angle (for riders with tank bags or GPS)
- [ ] Weight distribution estimate (front/rear)
- [ ] Reach/stack standardization (road bike geometry terms)
- [ ] Effective top tube length
- [ ] Standover height calculation
- [ ] Ground reach (both feet down ability)

### Research Required
- Partner with motorcycle ergonomics experts
- Reference academic papers on motorcycle posture
- Study professional bike fitting methodologies

---

## Milestone 15: Community & Social Features (Long-term)

**Goal:** Build a community around motorcycle ergonomics.

### Tasks
- [ ] User accounts (optional, for cloud features)
- [ ] Share setups publicly with permalink
- [ ] "Setup gallery" - browse community configurations
- [ ] Upvote/comment on setups
- [ ] "What bike fits me?" quiz
- [ ] Rider height/inseam statistics
- [ ] Most popular bikes for tall/short riders
- [ ] Bike reviews focused on ergonomics
- [ ] Integration with forums (ADVrider, etc.)

### Privacy Considerations
- All features work without account
- No tracking without consent
- Data export/delete capabilities
- GDPR compliance

---

## Milestone 16: Platform Expansion (Future)

**Goal:** Extend beyond web to native apps and integrations.

### Tasks
- [ ] Native mobile apps (React Native or PWA enhancement)
- [ ] Desktop app (Electron wrapper)
- [ ] API for third-party integrations
- [ ] BikeCAD import/export
- [ ] Motorcycle dealer integration
- [ ] VR/AR visualization (long-term)

---

## Technical Notes

### Photo Accuracy Disclaimer
Images from the same manufacturer are assumed comparable (same shooting distance/lens). Different brands may have varying accuracy due to:
- Camera distance variations
- Lens focal length differences
- Perspective distortion
- Image cropping

**Recommendation:** For precise analysis, use Real Measurements Mode (Milestone 5) when you have physical access to the bike.

### Storage Limits
- localStorage: ~5-10MB per domain
- Base64 images: ~33% larger than original
- Consider IndexedDB for heavy usage (Milestone 8)

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- PWA: installable on mobile and desktop
- Offline support via service worker
