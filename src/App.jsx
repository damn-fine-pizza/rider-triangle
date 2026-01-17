import { useRef, useState, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { useBikeStore } from './hooks/useBikeStore';
import { useCalibration } from './hooks/useCalibration';
import { useMarkers, MARKER_TYPES } from './hooks/useMarkers';
import { useRiderProfile } from './hooks/useRiderProfile';
import { useMeasurementMode } from './hooks/useMeasurementMode';
import { useOnboarding } from './hooks/useOnboarding';
import { useTheme } from './hooks/useTheme';
import { useImage } from './hooks/useImage';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { usePinchZoom } from './hooks/usePinchZoom';
import { Marker } from './components/Marker';
import { CalibrationMarker } from './components/CalibrationMarker';
import { ClickGuide } from './components/ClickGuide';
import { BikeCard } from './components/BikeCard';
import { ImageUpload } from './components/ImageUpload';
import { RiderProfile } from './components/RiderProfile';
import { ManualMeasurements } from './components/ManualMeasurements';
import { AngleDisplay, RidingStyleSelector } from './components/AngleDisplay';
import { SkeletonOverlay } from './components/SkeletonOverlay';
import { CollapsiblePanel } from './components/CollapsiblePanel';
import { LoadingSpinner } from './components/LoadingSpinner';

// Lazy load ExportButton (includes html2canvas which is heavy)
const ExportButton = lazy(() =>
  import('./components/ExportButton').then((m) => ({ default: m.ExportButton }))
);
import { OnboardingOverlay } from './components/OnboardingOverlay';
import { InstallBanner } from './components/InstallBanner';
import { calculateAllAngles, calculateAllAnglesFromDistances } from './utils/ergonomics';
import { hapticMedium, hapticSuccess } from './utils/haptics';

// Tool sequence for auto-advance
const TOOL_SEQUENCE = ['calibTop', 'calibBot', 'axle', 'seat', 'peg', 'bar'];

// Tool labels
const TOOL_LABELS = {
  calibTop: 'Calib. TOP wheel',
  calibBot: 'Calib. BOTTOM wheel',
  axle: 'Rear axle center',
  seat: 'Seat',
  peg: 'Footpeg',
  bar: 'Handlebar',
};

export default function App() {
  // Bike store for dynamic bike management
  const bikeStore = useBikeStore();
  const { activeBikes, activeSlots, bikes } = bikeStore;

  // Get bike keys from active slots
  const bikeKeys = useMemo(() => {
    return activeSlots.filter((id) => id && activeBikes[id]);
  }, [activeSlots, activeBikes]);

  const [primaryBike, secondaryBike] = bikeKeys;

  // UI state
  const [opacityB, setOpacityB] = useState(0.5);
  const [showBikes, setShowBikes] = useState(
    bikeKeys.reduce((acc, key) => ({ ...acc, [key]: true }), {})
  );
  const [activeBike, setActiveBike] = useState(primaryBike);
  const [activeTool, setActiveTool] = useState('calibTop');
  const [showBikeManager, setShowBikeManager] = useState(false);
  const [ridingStyle, setRidingStyle] = useState('commute');
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showSkeletonAngles, setShowSkeletonAngles] = useState(true);
  const containerRef = useRef(null);

  // Panel open states (all collapsed by default)
  const [openPanels, setOpenPanels] = useState({
    wheel: false,
    tool: false,
    overlay: false,
    distances: false,
    measurement: false,
    rider: false,
    angles: false,
  });

  const togglePanel = useCallback((panelId) => {
    setOpenPanels((prev) => ({ ...prev, [panelId]: !prev[panelId] }));
  }, []);

  const expandAllPanels = useCallback(() => {
    setOpenPanels({
      wheel: true,
      tool: true,
      overlay: true,
      distances: true,
      measurement: true,
      rider: true,
      angles: true,
    });
  }, []);

  const collapseAllPanels = useCallback(() => {
    setOpenPanels({
      wheel: false,
      tool: false,
      overlay: false,
      distances: false,
      measurement: false,
      rider: false,
      angles: false,
    });
  }, []);

  // Calibration and markers hooks - pass activeBikes
  const calibration = useCalibration(activeBikes);
  const markersHook = useMarkers(bikeKeys);

  // Rider profile hook
  const riderProfile = useRiderProfile();

  // Measurement mode hook (photo vs manual)
  const measurementMode = useMeasurementMode();

  // Onboarding for first-time users
  const onboarding = useOnboarding();

  // Theme (dark/light mode)
  const { isDark, toggleTheme } = useTheme();

  // PWA install prompt
  const installPrompt = useInstallPrompt();

  // Pinch-zoom for mobile
  const pinchZoom = usePinchZoom({
    minScale: 0.5,
    maxScale: 4,
    containerRef,
  });

  // Track if a gesture is in progress (to distinguish tap from pinch/pan)
  const gestureInProgress = useRef(false);
  const touchStartTime = useRef(0);
  const touchStartPos = useRef({ x: 0, y: 0 });

  // Image hooks - create for each active bike
  const primaryImg = useImage(activeBikes[primaryBike]?.img);
  const secondaryImg = useImage(activeBikes[secondaryBike]?.img);
  const images = {
    [primaryBike]: primaryImg,
    [secondaryBike]: secondaryImg,
  };

  // Sync activeBike when bikeKeys change
  useEffect(() => {
    if (primaryBike && (!activeBike || !bikeKeys.includes(activeBike))) {
      setActiveBike(primaryBike);
    }
  }, [bikeKeys, primaryBike]);

  // Calculate ergonomic angles for each bike
  const bikeAngles = useMemo(() => {
    const result = {};
    const riderMeasurements = riderProfile.measurements;

    bikeKeys.forEach((key) => {
      const mode = measurementMode.getMode(key);

      if (mode === 'manual' && measurementMode.isComplete(key)) {
        // Use manual measurements
        const distances = measurementMode.getDistances(key);
        const manualInputs = measurementMode.getMeasurements(key);
        result[key] = calculateAllAnglesFromDistances(distances, manualInputs, riderMeasurements);
      } else {
        // Use photo-based calibration
        const markers = markersHook.markers[key];
        const pxPerMM = calibration.pxPerMM[key];

        if (markers && pxPerMM && riderMeasurements) {
          result[key] = calculateAllAngles(markers, riderMeasurements, pxPerMM);
        } else {
          result[key] = { knee: null, hip: null, back: null, arm: null };
        }
      }
    });

    return result;
  }, [bikeKeys, markersHook.markers, calibration.pxPerMM, riderProfile.measurements, measurementMode]);

  // Auto-advance to next tool
  const advanceToNextTool = useCallback(() => {
    const currentIndex = TOOL_SEQUENCE.indexOf(activeTool);
    if (currentIndex < TOOL_SEQUENCE.length - 1) {
      setActiveTool(TOOL_SEQUENCE[currentIndex + 1]);
    }
  }, [activeTool]);

  // Keyboard shortcuts for tool selection (1-6 keys)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const key = e.key;
      if (key >= '1' && key <= '6') {
        const index = parseInt(key) - 1;
        if (index < TOOL_SEQUENCE.length) {
          setActiveTool(TOOL_SEQUENCE[index]);
        }
      }
      // Tab to switch active bike
      if (key === 'Tab' && bikeKeys.length > 1) {
        e.preventDefault();
        const currentIndex = bikeKeys.indexOf(activeBike);
        const nextIndex = (currentIndex + 1) % bikeKeys.length;
        setActiveBike(bikeKeys[nextIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bikeKeys, activeBike]);

  // Extract coordinates from mouse or touch event
  const getEventCoordinates = useCallback((e) => {
    // Touch event (changedTouches for touchend, touches for touchstart/move)
    if (e.changedTouches && e.changedTouches.length > 0) {
      return {
        clientX: e.changedTouches[0].clientX,
        clientY: e.changedTouches[0].clientY,
      };
    }
    if (e.touches && e.touches.length > 0) {
      return {
        clientX: e.touches[0].clientX,
        clientY: e.touches[0].clientY,
      };
    }
    // Mouse event or React synthetic event
    return {
      clientX: e.clientX,
      clientY: e.clientY,
    };
  }, []);

  // Place marker at coordinates
  const placeMarker = useCallback(
    (bikeKey, clientX, clientY, rect) => {
      let x = clientX - rect.left;
      let y = clientY - rect.top;

      // Account for pinch-zoom scale and position
      if (pinchZoom.scale !== 1) {
        x = (x - pinchZoom.position.x) / pinchZoom.scale;
        y = (y - pinchZoom.position.y) / pinchZoom.scale;
      }

      // For overlay bike, convert from visual (scaled) to local coordinates
      if (bikeKey !== primaryBike) {
        const scale = calibration.scales[bikeKey];
        if (scale && scale !== 1) {
          x = x / scale;
          y = y / scale;
        }
      }

      if (activeTool === 'calibTop') {
        calibration.setCalibPoint(bikeKey, 'top', { x, y });
        hapticMedium();
        advanceToNextTool();
      } else if (activeTool === 'calibBot') {
        calibration.setCalibPoint(bikeKey, 'bot', { x, y });
        hapticMedium();
        advanceToNextTool();
      } else if (activeTool === 'axle') {
        calibration.setAxlePosition(bikeKey, { x, y });
        hapticMedium();
        advanceToNextTool();
      } else if (MARKER_TYPES.includes(activeTool)) {
        markersHook.setMarker(bikeKey, activeTool, { x, y });
        // Success haptic on last marker (bar)
        activeTool === 'bar' ? hapticSuccess() : hapticMedium();
        advanceToNextTool();
      }
    },
    [activeTool, calibration, markersHook, advanceToNextTool, primaryBike, pinchZoom.scale, pinchZoom.position]
  );

  // Handle touch start - record for tap detection
  const handleTouchStart = useCallback((e, bikeKey) => {
    if (e.touches.length === 1) {
      // Single finger - potential tap for marker placement
      touchStartTime.current = Date.now();
      touchStartPos.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      gestureInProgress.current = false;
    } else if (e.touches.length === 2) {
      // Multi-touch - pinch gesture
      gestureInProgress.current = true;
      pinchZoom.handlers.onTouchStart(e);
    }
  }, [pinchZoom.handlers]);

  // Handle touch move - detect if it's a gesture
  const handleTouchMove = useCallback((e) => {
    if (e.touches.length >= 2) {
      gestureInProgress.current = true;
      pinchZoom.handlers.onTouchMove(e);
    } else if (e.touches.length === 1) {
      // Check if finger moved significantly (pan or scroll intent)
      const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
      const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
      if (dx > 10 || dy > 10) {
        gestureInProgress.current = true;
        // If zoomed in, allow panning
        if (pinchZoom.scale > 1) {
          pinchZoom.handlers.onTouchMove(e);
        }
      }
    }
  }, [pinchZoom.handlers, pinchZoom.scale]);

  // Handle touch end - place marker if it was a tap
  const handleTouchEnd = useCallback((e, bikeKey) => {
    pinchZoom.handlers.onTouchEnd(e);

    // Only place marker if:
    // 1. Active bike matches
    // 2. It was a short tap (< 300ms)
    // 3. Finger didn't move much (< 10px)
    // 4. No multi-touch gesture in progress
    if (bikeKey !== activeBike) return;
    if (gestureInProgress.current) return;

    const tapDuration = Date.now() - touchStartTime.current;
    if (tapDuration > 300) return;

    const touch = e.changedTouches[0];
    if (!touch) return;

    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    if (dx > 10 || dy > 10) return;

    // It's a valid tap - place marker
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    placeMarker(bikeKey, touch.clientX, touch.clientY, rect);
  }, [activeBike, pinchZoom.handlers, placeMarker]);

  // Handle mouse click (desktop)
  const handleMouseClick = useCallback((e, bikeKey) => {
    if (bikeKey !== activeBike) return;
    const rect = e.currentTarget.getBoundingClientRect();
    placeMarker(bikeKey, e.clientX, e.clientY, rect);
  }, [activeBike, placeMarker]);

  // Reset all for a bike
  const handleResetBike = useCallback(
    (bikeKey) => {
      calibration.resetBike(bikeKey);
      markersHook.resetBike(bikeKey);
      setActiveTool('calibTop');
    },
    [calibration, markersHook]
  );

  // Toggle bike visibility
  const toggleBikeVisibility = useCallback((bikeKey) => {
    setShowBikes((s) => ({ ...s, [bikeKey]: !s[bikeKey] }));
  }, []);

  // Get distances for results table
  const getDistancesForBike = (bikeKey) => {
    const mode = measurementMode.getMode(bikeKey);

    if (mode === 'manual' && measurementMode.isComplete(bikeKey)) {
      // Use manual measurements
      return measurementMode.getDistances(bikeKey);
    }

    // Use photo-based calibration
    return markersHook.getDistances(bikeKey, calibration.pxPerMM[calibration.primaryBike]);
  };

  // Get state for sharing (excludes images due to size)
  const getShareState = useCallback(() => {
    return {
      markers: markersHook.markers,
      calibPts: calibration.calibPts,
      axle: calibration.axle,
      wheelChoice: calibration.wheelChoice,
      rider: riderProfile.profile,
      ridingStyle,
      manualMeasurements: measurementMode.manualMeasurements,
      modes: measurementMode.modes,
    };
  }, [markersHook.markers, calibration, riderProfile.profile, ridingStyle, measurementMode]);

  // Handle adding a new bike
  const handleAddBike = useCallback(
    async (file, label) => {
      const id = await bikeStore.addBike(file, label);
      // If we have an empty slot, put the new bike there
      if (!activeSlots[0]) {
        bikeStore.setActiveSlot(0, id);
      } else if (!activeSlots[1]) {
        bikeStore.setActiveSlot(1, id);
      }
    },
    [bikeStore, activeSlots]
  );

  // Render bike layer
  const renderBikeLayer = (bikeKey, isOverlay = false) => {
    if (!bikeKey || !activeBikes[bikeKey]) return null;

    const bike = activeBikes[bikeKey];
    const isVisible = showBikes[bikeKey] !== false;
    const img = images[bikeKey];
    const markers = markersHook.markers[bikeKey] || {};
    const axle = calibration.axle[bikeKey];
    const calibPts = calibration.calibPts[bikeKey] || {};
    const scale = isOverlay ? calibration.scales[bikeKey] : 1;
    const translation = calibration.translations[bikeKey] || { x: 0, y: 0 };

    const style = isOverlay
      ? {
          transform: `translate(${translation.x}px, ${translation.y}px) scale(${scale})`,
          transformOrigin: 'top left',
          opacity: isVisible ? opacityB : 0,
          pointerEvents: isVisible ? 'auto' : 'none',
        }
      : {
          display: isVisible ? 'inline-block' : 'none',
        };

    const toolLabel =
      activeTool === 'calibTop'
        ? 'wheel TOP'
        : activeTool === 'calibBot'
          ? 'wheel BOTTOM'
          : activeTool === 'axle'
            ? 'rear axle'
            : activeTool;

    return (
      <div
        key={bikeKey}
        className={isOverlay ? 'absolute top-0 left-0' : 'relative inline-block'}
        style={style}
        onClick={(e) => handleMouseClick(e, bikeKey)}
        onTouchStart={(e) => handleTouchStart(e, bikeKey)}
        onTouchMove={handleTouchMove}
        onTouchEnd={(e) => handleTouchEnd(e, bikeKey)}
      >
        {bike.img ? (
          <img
            src={bike.img}
            alt={bike.label}
            className="block max-w-full h-auto select-none"
            onLoad={img?.onLoad}
            draggable={false}
          />
        ) : (
          <div className="w-96 h-64 bg-[--bg-card-hover] flex items-center justify-center text-muted">
            No image uploaded
          </div>
        )}

        {/* Calibration line with measurement label */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {calibPts.top && calibPts.bot && (
            <>
              <line
                x1={calibPts.top.x}
                y1={calibPts.top.y}
                x2={calibPts.bot.x}
                y2={calibPts.bot.y}
                stroke={bike.color}
                strokeWidth={2}
                strokeDasharray="4 3"
              />
              {/* Measurement label on calibration line */}
              {calibration.outerDiameters[bikeKey] > 0 && (
                <text
                  x={(calibPts.top.x + calibPts.bot.x) / 2 + 10}
                  y={(calibPts.top.y + calibPts.bot.y) / 2}
                  fill={bike.color}
                  fontSize={11}
                  fontWeight="bold"
                  stroke="var(--bg-card)"
                  strokeWidth={3}
                  paintOrder="stroke fill"
                >
                  {Math.round(calibration.outerDiameters[bikeKey])} mm
                </text>
              )}
            </>
          )}
        </svg>

        {/* Calibration point markers (TOP/BOTTOM) */}
        {calibPts.top && (
          <CalibrationMarker
            x={calibPts.top.x}
            y={calibPts.top.y}
            color={bike.color}
            label="TOP"
            scale={scale}
            onDrag={(nx, ny) => calibration.setCalibPoint(bikeKey, 'top', { x: nx, y: ny })}
          />
        )}
        {calibPts.bot && (
          <CalibrationMarker
            x={calibPts.bot.x}
            y={calibPts.bot.y}
            color={bike.color}
            label="BOT"
            scale={scale}
            onDrag={(nx, ny) => calibration.setCalibPoint(bikeKey, 'bot', { x: nx, y: ny })}
          />
        )}

        {/* Axle marker */}
        {axle && (
          <Marker
            x={axle.x}
            y={axle.y}
            color={bike.color}
            label="Rear axle"
            scale={scale}
            onDrag={(nx, ny) => calibration.setAxlePosition(bikeKey, { x: nx, y: ny })}
          />
        )}

        {/* Rider triangle markers */}
        {markers.seat && (
          <Marker
            x={markers.seat.x}
            y={markers.seat.y}
            color={bike.color}
            label="Seat"
            scale={scale}
            onDrag={(nx, ny) => markersHook.setMarker(bikeKey, 'seat', { x: nx, y: ny })}
          />
        )}
        {markers.peg && (
          <Marker
            x={markers.peg.x}
            y={markers.peg.y}
            color={bike.color}
            label="Footpeg"
            scale={scale}
            onDrag={(nx, ny) => markersHook.setMarker(bikeKey, 'peg', { x: nx, y: ny })}
          />
        )}
        {markers.bar && (
          <Marker
            x={markers.bar.x}
            y={markers.bar.y}
            color={bike.color}
            label="Handlebar"
            scale={scale}
            onDrag={(nx, ny) => markersHook.setMarker(bikeKey, 'bar', { x: nx, y: ny })}
          />
        )}

        {/* Skeleton overlay */}
        {showSkeleton && markers.seat && markers.peg && markers.bar && (
          <SkeletonOverlay
            markers={markers}
            measurements={riderProfile.measurements}
            pxPerMM={calibration.pxPerMM[bikeKey]}
            angles={bikeAngles[bikeKey]}
            color={bike.color}
            ridingStyle={ridingStyle}
            showAngles={showSkeletonAngles}
            scale={scale}
          />
        )}

        {/* Click guide */}
        {activeBike === bikeKey && (
          <div className="absolute left-2 top-2">
            <ClickGuide text={`${bike.label}: click for ${toolLabel}`} />
          </div>
        )}
      </div>
    );
  };

  // Check if we have two bikes to compare
  const hasTwoBikes = bikeKeys.length === 2;

  return (
    <div className="min-h-screen w-full container-responsive py-3 sm:py-4">
      {/* Header - improved mobile visibility */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h1 className="text-xl sm:text-2xl font-semibold">
            Riding Position Comparison
          </h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              className="btn-ghost p-2"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            {onboarding.isComplete && (
              <button
                onClick={onboarding.restart}
                className="btn-ghost text-sm flex items-center gap-1.5"
                title="Show tutorial"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Help
              </button>
            )}
            <Suspense fallback={<LoadingSpinner size="sm" />}>
              <ExportButton containerRef={containerRef} getShareState={getShareState} />
            </Suspense>
          </div>
        </div>
        {hasTwoBikes && (
          <p className="text-base sm:text-lg text-secondary">
            {activeBikes[secondaryBike]?.label} vs {activeBikes[primaryBike]?.label}
          </p>
        )}
        <p className="text-sm text-muted mt-1">
          Calibrate and overlay bikes to compare the rider triangle.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Controls */}
        <div className="xl:col-span-1 space-y-4">
          {/* Collapse/Expand All buttons */}
          <div className="flex gap-2 text-xs">
            <button onClick={expandAllPanels} className="btn-toggle-inactive">
              Expand All
            </button>
            <button onClick={collapseAllPanels} className="btn-toggle-inactive">
              Collapse All
            </button>
          </div>
          {/* Bike Manager Toggle */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-medium">Bikes</h2>
              <button
                onClick={() => setShowBikeManager(!showBikeManager)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showBikeManager ? 'Hide manager' : 'Manage bikes'}
              </button>
            </div>

            {showBikeManager ? (
              <div className="space-y-3">
                {/* Active bike cards */}
                {bikeKeys.map((key) => (
                  <BikeCard
                    key={key}
                    bike={activeBikes[key]}
                    onUpdate={bikeStore.updateBike}
                    onUpdateImage={bikeStore.updateBikeImage}
                    onUpdateTire={bikeStore.updateBikeTire}
                    onRemove={bikeStore.removeBike}
                    canRemove={Object.keys(bikes).length > 2}
                  />
                ))}

                {/* Add new bike */}
                <ImageUpload onUpload={handleAddBike} />

                {/* Bike selector for slots if more than 2 bikes exist */}
                {Object.keys(bikes).length > 2 && (
                  <div className="pt-2 border-t text-sm">
                    <p className="text-secondary mb-2">Select bikes to compare:</p>
                    {[0, 1].map((slot) => (
                      <div key={slot} className="flex items-center gap-2 mb-1">
                        <span className="w-16">Slot {slot + 1}:</span>
                        <select
                          value={activeSlots[slot] || ''}
                          onChange={(e) => bikeStore.setActiveSlot(slot, e.target.value)}
                          className="flex-1 px-2 py-1 border border-[--border-color] bg-[--bg-card] rounded text-sm"
                        >
                          <option value="">Select...</option>
                          {Object.values(bikes).map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reset to defaults */}
                <button
                  onClick={bikeStore.resetToDefaults}
                  className="w-full text-xs text-muted hover:text-primary py-1"
                >
                  Reset to default bikes
                </button>
              </div>
            ) : (
              <div className="text-sm text-secondary">
                {bikeKeys.map((key) => (
                  <div key={key} className="flex items-center gap-2 mb-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ background: activeBikes[key]?.color }}
                    />
                    <span>{activeBikes[key]?.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 1: Wheel selection */}
          <CollapsiblePanel title="Select wheel for calibration" stepNumber={1} isOpen={openPanels.wheel} onToggle={() => togglePanel('wheel')}>
            {bikeKeys.map((key) => {
              const bike = activeBikes[key];
              if (!bike) return null;
              return (
                <div key={key} className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full" style={{ background: bike.color }} />
                    <div className="font-medium">{bike.label}</div>
                    <button
                      className="ml-auto text-xs text-red-600 hover:text-red-800"
                      onClick={() => handleResetBike(key)}
                    >
                      Reset
                    </button>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <button
                      className={calibration.wheelChoice[key] === 'front' ? 'btn-toggle-neutral-active' : 'btn-toggle-inactive'}
                      onClick={() => calibration.setWheel(key, 'front')}
                      disabled={!bike.tires?.front}
                    >
                      Front {bike.tires?.front ? `(${bike.tires.front})` : ''}
                    </button>
                    <button
                      className={calibration.wheelChoice[key] === 'rear' ? 'btn-toggle-neutral-active' : 'btn-toggle-inactive'}
                      onClick={() => calibration.setWheel(key, 'rear')}
                      disabled={!bike.tires?.rear}
                    >
                      Rear {bike.tires?.rear ? `(${bike.tires.rear})` : ''}
                    </button>
                  </div>
                  {calibration.outerDiameters[key] > 0 && (
                    <div className="text-xs text-muted mt-1">
                      Estimated outer diameter: {calibration.outerDiameters[key]?.toFixed(1)} mm
                    </div>
                  )}
                  {(!bike.tires?.front || !bike.tires?.rear) && (
                    <div className="text-xs text-amber-600 mt-1">
                      Enter tire specs in bike manager
                    </div>
                  )}
                </div>
              );
            })}
          </CollapsiblePanel>

          {/* Step 2: Tool selection */}
          <CollapsiblePanel title="Select tool and click on the image" stepNumber={2} isOpen={openPanels.tool} onToggle={() => togglePanel('tool')}>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {TOOL_SEQUENCE.map((tool, index) => (
                <button
                  key={tool}
                  className={`flex items-center justify-between ${activeTool === tool ? 'btn-toggle-active' : 'btn-toggle-inactive'}`}
                  onClick={() => setActiveTool(tool)}
                >
                  <span>{TOOL_LABELS[tool]}</span>
                  <span className={`text-xs ml-1 px-1 rounded ${activeTool === tool ? 'bg-[--accent]' : 'bg-[--bg-card-hover] text-muted'}`}>
                    {index + 1}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-2 text-xs text-muted">
              Press 1-6 to select tool, Tab to switch bike
            </div>
            <div className="mt-3 text-sm">
              Active on:{' '}
              <span className="font-medium">{activeBikes[activeBike]?.label || 'None'}</span>
            </div>
            <div className="flex gap-2 mt-2">
              {bikeKeys.map((key) => (
                <button
                  key={key}
                  className={activeBike === key ? 'btn-toggle-neutral-active' : 'btn-toggle-inactive'}
                  onClick={() => setActiveBike(key)}
                >
                  {activeBikes[key]?.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </CollapsiblePanel>

          {/* Step 3: Overlay controls */}
          {hasTwoBikes && (
            <CollapsiblePanel title="Overlay & visibility" stepNumber={3} isOpen={openPanels.overlay} onToggle={() => togglePanel('overlay')}>
              <div className="flex items-center gap-3 mb-2">
                <label className="text-sm">{activeBikes[secondaryBike]?.label} Opacity</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={opacityB}
                  onChange={(e) => setOpacityB(parseFloat(e.target.value))}
                  className="flex-1"
                />
              </div>
              <div className="flex items-center gap-3 text-sm">
                {bikeKeys.map((key) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showBikes[key] !== false}
                      onChange={() => toggleBikeVisibility(key)}
                    />
                    Show {activeBikes[key]?.label.split(' ')[0]}
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-3 text-sm mt-2 pt-2 border-t">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showSkeleton}
                    onChange={(e) => setShowSkeleton(e.target.checked)}
                  />
                  Show skeleton
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showSkeletonAngles}
                    onChange={(e) => setShowSkeletonAngles(e.target.checked)}
                    disabled={!showSkeleton}
                  />
                  Show angles
                </label>
              </div>
              <div className="mt-2 text-xs text-secondary">
                Tip: calibrate TOP/BOTTOM on the outer tire profile, then mark the rear axle center on
                both bikes. Alignment is applied automatically.
              </div>
            </CollapsiblePanel>
          )}

          {/* Step 4: Results */}
          <CollapsiblePanel title="Rider triangle distances (mm)" stepNumber={hasTwoBikes ? 4 : 3} isOpen={openPanels.distances} onToggle={() => togglePanel('distances')}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="py-1">Bike</th>
                  <th className="py-1">Seat-Peg</th>
                  <th className="py-1">Seat-Bar</th>
                  <th className="py-1">Peg-Bar</th>
                </tr>
              </thead>
              <tbody>
                {bikeKeys.map((key) => {
                  const bike = activeBikes[key];
                  if (!bike) return null;
                  const distances = getDistancesForBike(key);
                  return (
                    <tr key={key}>
                      <td className="py-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ background: bike.color }}
                          />
                          {bike.label}
                        </div>
                      </td>
                      <td className="py-1">{distances.seatPeg ? distances.seatPeg.toFixed(0) : '–'}</td>
                      <td className="py-1">{distances.seatBar ? distances.seatBar.toFixed(0) : '–'}</td>
                      <td className="py-1">{distances.pegBar ? distances.pegBar.toFixed(0) : '–'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!calibration.isCalibrated && (
              <div className="mt-2 text-xs text-amber-700">
                Complete calibration (TOP/BOTTOM wheel + rear axle for both bikes) to enable accurate
                measurements.
              </div>
            )}
          </CollapsiblePanel>

          {/* Step 5: Measurement Mode */}
          <CollapsiblePanel title="Measurement Mode" stepNumber={hasTwoBikes ? 5 : 4} isOpen={openPanels.measurement} onToggle={() => togglePanel('measurement')}>
            <p className="text-xs text-secondary mb-3">
              Use Photo mode for image-based estimation, or Manual mode if you have exact measurements.
            </p>
            <div className="space-y-4">
              {bikeKeys.map((key) => (
                <ManualMeasurements
                  key={key}
                  bikeKey={key}
                  measurementHook={measurementMode}
                  bikeLabel={activeBikes[key]?.label}
                  bikeColor={activeBikes[key]?.color}
                />
              ))}
            </div>
          </CollapsiblePanel>

          {/* Step 6: Rider Profile */}
          <CollapsiblePanel title="Rider Profile" stepNumber={hasTwoBikes ? 6 : 5} isOpen={openPanels.rider} onToggle={() => togglePanel('rider')}>
            <RiderProfile riderHook={riderProfile} />
          </CollapsiblePanel>

          {/* Step 7: Ergonomic Angles */}
          <CollapsiblePanel title="Ergonomic Angles" stepNumber={hasTwoBikes ? 7 : 6} isOpen={openPanels.angles} onToggle={() => togglePanel('angles')}>
            <div className="mb-3">
              <div className="text-xs text-muted mb-1">Riding style:</div>
              <RidingStyleSelector value={ridingStyle} onChange={setRidingStyle} />
            </div>
            {hasTwoBikes ? (
              <AngleDisplay
                angles={bikeAngles[primaryBike]}
                anglesB={bikeAngles[secondaryBike]}
                label={activeBikes[primaryBike]?.label}
                labelB={activeBikes[secondaryBike]?.label}
                color={activeBikes[primaryBike]?.color}
                colorB={activeBikes[secondaryBike]?.color}
                ridingStyle={ridingStyle}
                showComparison={true}
              />
            ) : (
              <AngleDisplay
                angles={bikeAngles[primaryBike]}
                label={activeBikes[primaryBike]?.label}
                color={activeBikes[primaryBike]?.color}
                ridingStyle={ridingStyle}
              />
            )}
            {!calibration.isCalibrated && (
              <div className="mt-2 text-xs text-amber-700">
                Complete calibration and place all markers (seat, peg, bar) to calculate angles.
              </div>
            )}
          </CollapsiblePanel>
        </div>

        {/* Overlay stage */}
        <div className="xl:col-span-2 p-3 card relative">
          {/* Zoom controls */}
          {pinchZoom.scale !== 1 && (
            <button
              onClick={pinchZoom.resetZoom}
              className="absolute top-5 right-5 z-20 btn-toggle-inactive text-xs flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
              Reset zoom ({Math.round(pinchZoom.scale * 100)}%)
            </button>
          )}
          <div
            ref={containerRef}
            className="relative w-full overflow-hidden"
            style={{ minHeight: 520 }}
            onWheel={pinchZoom.handlers.onWheel}
          >
            {/* Zoomable content wrapper */}
            <div style={pinchZoom.zoomStyle}>
              {hasTwoBikes ? (
                <>
                  {/* Base layer: primary bike */}
                  {renderBikeLayer(primaryBike, false)}

                  {/* Overlay layer: secondary bike */}
                  {renderBikeLayer(secondaryBike, true)}
                </>
              ) : (
              <div className="empty-state">
                <svg className="w-16 h-16 text-muted mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-medium text-secondary mb-1">
                  {bikeKeys.length === 0 ? 'No bikes selected' : 'Add another bike'}
                </h3>
                <p className="text-muted max-w-xs mb-4">
                  {bikeKeys.length === 0
                    ? 'Click "Manage bikes" to upload your motorcycle photos and start comparing.'
                    : 'Add a second bike to compare riding positions side by side.'}
                </p>
                <button onClick={() => setShowBikeManager(true)} className="btn-primary text-sm">
                  Manage bikes
                </button>
              </div>
              )}
            </div>
          </div>

          <div className="mt-3 text-xs text-muted">
            Note: this is a visual comparison scaled by the selected tire outer diameter. Minor
            inaccuracies may result from image angle, perspective distortion, and manual point
            placement.
          </div>
        </div>
      </div>

      {/* Onboarding overlay for first-time users */}
      <OnboardingOverlay
        isVisible={onboarding.isVisible}
        currentStep={onboarding.currentStep}
        currentStepIndex={onboarding.currentStepIndex}
        totalSteps={onboarding.totalSteps}
        onNext={onboarding.nextStep}
        onPrev={onboarding.prevStep}
        onSkip={onboarding.skip}
      />

      {/* PWA install banner */}
      {installPrompt.shouldShowBanner && (
        <InstallBanner
          platform={installPrompt.platform}
          canPrompt={installPrompt.canPrompt}
          onInstall={installPrompt.promptInstall}
          onDismiss={installPrompt.dismiss}
        />
      )}
    </div>
  );
}
