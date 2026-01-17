# Rider Triangle Roadmap

Goal: Evolve into a self-service Cycle Ergo alternative - upload bike photos, input rider measurements, get ergonomic analysis.

---

## Milestone 0: Stabilization & Refactoring ⬅️ CURRENT

Fix known bugs and prepare architecture for extensibility.

### Known Issues
- Overlay alignment imprecise
- Moving one point affects others unexpectedly
- Calibration procedure confusing (trial and error needed)
- Hardcoded bikes only

### Tasks
- [ ] Refactor state into dedicated hooks (`useCalibration`, `useMarkers`)
- [ ] Fix Marker drag (use delta from click, not offsetLeft/Top)
- [ ] Extract geometry calculations to `src/utils/geometry.js`
- [ ] Add reset/clear functionality per bike
- [ ] Auto-advance tool after point placement

### Files
| File | Action |
|------|--------|
| `src/hooks/useCalibration.js` | Create |
| `src/hooks/useMarkers.js` | Create |
| `src/utils/geometry.js` | Create |
| `src/components/Marker.jsx` | Fix drag |
| `src/App.jsx` | Simplify |

---

## Milestone 1: Custom Image Upload

Allow users to upload their own bike photos instead of hardcoded URLs.

### Tasks
- [ ] Image upload component (drag & drop + file picker)
- [ ] Store images in browser (IndexedDB or base64)
- [ ] Dynamic bike slots (add/remove)
- [ ] Manual tire spec input
- [ ] Persist session in localStorage

### Files
| File | Action |
|------|--------|
| `src/components/ImageUpload.jsx` | Create |
| `src/components/BikeCard.jsx` | Create |
| `src/hooks/useBikeStore.js` | Create |
| `src/utils/storage.js` | Create |

---

## Milestone 2: Rider Profile

Add rider body measurements for angle calculations.

### Tasks
- [ ] Rider profile form: height, inseam, arm length
- [ ] Default proportions from height (statistical averages)
- [ ] Override individual measurements
- [ ] Seat position selector (forward/center/back)
- [ ] Store rider profiles

### Files
| File | Action |
|------|--------|
| `src/components/RiderProfile.jsx` | Create |
| `src/data/bodyProportions.js` | Create |
| `src/hooks/useRiderProfile.js` | Create |

---

## Milestone 3: Ergonomic Angle Calculations

Calculate and display rider angles: knee, hip, arm, torso.

### Tasks
- [ ] Calculate knee angle (seat-peg + leg length)
- [ ] Calculate hip angle (seat position + torso)
- [ ] Calculate arm angle (seat-bar + arm length)
- [ ] Calculate torso inclination
- [ ] Angles results panel
- [ ] Optional: rider skeleton overlay

### Files
| File | Action |
|------|--------|
| `src/utils/ergonomics.js` | Create |
| `src/components/AngleDisplay.jsx` | Create |
| `src/components/SkeletonOverlay.jsx` | Create (optional) |

---

## Milestone 4: Real Measurements Mode

When user has physical bike access, input exact measurements.

### Tasks
- [ ] Toggle: "Photo estimate" vs "Real measurements"
- [ ] Direct input: seat height, peg position, bar reach
- [ ] Bypass photo calibration when real data available
- [ ] Compare estimated vs real

### Files
| File | Action |
|------|--------|
| `src/components/MeasurementInput.jsx` | Create |
| `src/hooks/useMeasurementMode.js` | Create |

---

## Milestone 5: Polish & UX

Final refinements for public release.

### Tasks
- [ ] Guided wizard for first-time users
- [ ] Keyboard shortcuts for tools
- [ ] Undo/redo for point placement
- [ ] Export comparison as image/PDF
- [ ] Share link with encoded state
- [ ] Mobile-optimized touch interactions

---

## Notes

**Photo accuracy:** Images from same manufacturer are assumed comparable (same shooting distance/lens). Different brands may have varying accuracy.

**Approximation vs Precision:** Photo-based measurements are estimates. Real measurements (Milestone 4) provide precision when you have physical access to the bike.
