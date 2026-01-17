# Rider Triangle Roadmap

Goal: Evolve into a self-service Cycle Ergo alternative - upload bike photos, input rider measurements, get ergonomic analysis.

---

## Milestone 0: Stabilization & Refactoring ✅ COMPLETE

Fix known bugs and prepare architecture for extensibility.

### Fixed Issues
- ~~Overlay alignment imprecise~~ → Proper scale/translate calculations
- ~~Moving one point affects others unexpectedly~~ → Fixed Marker drag using delta
- ~~Calibration procedure confusing~~ → Auto-advance tool after each click
- Hardcoded bikes only → (addressed in Milestone 1)

### Completed Tasks
- [x] Refactor state into dedicated hooks (`useCalibration`, `useMarkers`)
- [x] Fix Marker drag (use delta from click, not offsetLeft/Top)
- [x] Extract geometry calculations to `src/utils/geometry.js`
- [x] Add reset/clear functionality per bike
- [x] Auto-advance tool after point placement

### Files Created/Modified
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
- [x] Manual tire spec input
- [x] Persist session in localStorage

### Files Created
| File | Status |
|------|--------|
| `src/components/ImageUpload.jsx` | ✅ Created |
| `src/components/BikeCard.jsx` | ✅ Created |
| `src/hooks/useBikeStore.js` | ✅ Created |
| `src/utils/storage.js` | ✅ Created |
| `src/App.jsx` | ✅ Updated for dynamic bikes |

---

## Milestone 2: Rider Profile ⬅️ NEXT

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
