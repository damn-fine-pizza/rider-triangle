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
import { useEditMode } from './hooks/useEditMode';
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
import { TouchLoupe } from './components/TouchLoupe';
import { EditMode } from './components/EditMode';
import { VersionBadge } from './components/VersionBadge';
import { TOOL_SEQUENCE, TOOL_LABELS, TOUCH, ZOOM, STAGE_MIN_HEIGHT_PX } from './constants';

// Lazy load ExportButton (includes html2canvas which is heavy)
const ExportButton = lazy(() =>
  import('./components/ExportButton').then((m) => ({ default: m.ExportButton }))
);
import { OnboardingOverlay } from './components/OnboardingOverlay';
import { InstallBanner } from './components/InstallBanner';
import { calculateAllAngles, calculateAllAnglesFromDistances } from './utils/ergonomics';
import { hapticMedium, hapticSuccess } from './utils/haptics';

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
  const [activeBike, setActiveBike] = useState(null); // Synced by useEffect below
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
    minScale: ZOOM.MIN_SCALE,
    maxScale: ZOOM.MAX_SCALE,
    containerRef,
  });

  // Immersive Edit Mode for precise mobile marker placement
  const editMode = useEditMode({
    initialTool: activeTool,
    onToolChange: setActiveTool,
    onExit: () => {
      // Reset zoom when exiting edit mode
    },
  });

  // Track if a gesture is in progress (to distinguish tap from pinch/pan)
  const gestureInProgress = useRef(false);
  const touchStartTime = useRef(0);
  const touchStartPos = useRef({ x: 0, y: 0 });

  // Touch loupe state (magnifying glass for precise touch placement)
  const [loupeState, setLoupeState] = useState({
    visible: false,
    touchX: 0,
    touchY: 0,
    bikeKey: null,
    containerRect: null,
  });
  const loupeTimerRef = useRef(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  }, [
    bikeKeys,
    markersHook.markers,
    calibration.pxPerMM,
    riderProfile.measurements,
    measurementMode,
  ]);

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

  // Extract coordinates from mouse or touch event (utility, kept for future use)
  const _getEventCoordinates = useCallback((e) => {
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
      // Use getter functions to get current ref values (not stale state)
      const currentScale = pinchZoom.getCurrentScale();
      const currentPos = pinchZoom.getCurrentPosition();
      if (currentScale !== 1) {
        x = (x - currentPos.x) / currentScale;
        y = (y - currentPos.y) / currentScale;
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
    [activeTool, calibration, markersHook, advanceToNextTool, primaryBike, pinchZoom]
  );

  // Handle touch start - record for tap detection, init panning, and start loupe timer
  const handleTouchStart = useCallback(
    (e, bikeKey) => {
      // Clear any existing loupe timer
      if (loupeTimerRef.current) {
        clearTimeout(loupeTimerRef.current);
        loupeTimerRef.current = null;
      }

      if (e.touches.length === 1) {
        // Single finger - potential tap OR pan (if zoomed)
        const touch = e.touches[0];
        touchStartTime.current = Date.now();
        touchStartPos.current = {
          x: touch.clientX,
          y: touch.clientY,
        };
        gestureInProgress.current = false;

        // If zoomed in, initialize panning state
        if (pinchZoom.scale > 1) {
          pinchZoom.handlers.onTouchStart(e);
        }

        // Start loupe timer for long press (only if this is the active bike)
        if (bikeKey === activeBike) {
          const rect = e.currentTarget.getBoundingClientRect();
          loupeTimerRef.current = setTimeout(() => {
            setLoupeState({
              visible: true,
              touchX: touch.clientX - rect.left,
              touchY: touch.clientY - rect.top,
              bikeKey,
              containerRect: rect,
            });
          }, TOUCH.LOUPE_DELAY_MS);
        }
      } else if (e.touches.length === 2) {
        // Multi-touch - pinch gesture, cancel loupe
        gestureInProgress.current = true;
        setLoupeState((s) => ({ ...s, visible: false }));
        pinchZoom.handlers.onTouchStart(e);
      }
    },
    [pinchZoom.handlers, pinchZoom.scale, activeBike]
  );

  // Handle touch move - detect if it's a gesture or pan, update loupe position
  const handleTouchMove = useCallback(
    (e) => {
      if (e.touches.length >= 2) {
        // Multi-touch - cancel loupe
        if (loupeTimerRef.current) {
          clearTimeout(loupeTimerRef.current);
          loupeTimerRef.current = null;
        }
        setLoupeState((s) => ({ ...s, visible: false }));
        gestureInProgress.current = true;
        pinchZoom.handlers.onTouchMove(e);
      } else if (e.touches.length === 1) {
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - touchStartPos.current.x);
        const dy = Math.abs(touch.clientY - touchStartPos.current.y);

        // If zoomed in and finger moved, it's a pan gesture - cancel loupe
        if (pinchZoom.scale > 1 && (dx > TOUCH.PAN_THRESHOLD_PX || dy > TOUCH.PAN_THRESHOLD_PX)) {
          if (loupeTimerRef.current) {
            clearTimeout(loupeTimerRef.current);
            loupeTimerRef.current = null;
          }
          setLoupeState((s) => ({ ...s, visible: false }));
          gestureInProgress.current = true;
          pinchZoom.handlers.onTouchMove(e);
        } else if (loupeState.visible) {
          // Loupe is showing - update its position to follow finger
          setLoupeState((s) => ({
            ...s,
            touchX: touch.clientX - (s.containerRect?.left || 0),
            touchY: touch.clientY - (s.containerRect?.top || 0),
          }));
        } else if (dx > TOUCH.TAP_MAX_MOVEMENT_PX || dy > TOUCH.TAP_MAX_MOVEMENT_PX) {
          // Moved significantly but not zoomed - cancel loupe and mark as gesture
          if (loupeTimerRef.current) {
            clearTimeout(loupeTimerRef.current);
            loupeTimerRef.current = null;
          }
          gestureInProgress.current = true;
        }
      }
    },
    [pinchZoom.handlers, pinchZoom.scale, loupeState.visible]
  );

  // Handle touch end - enter Edit Mode or place marker
  const handleTouchEnd = useCallback(
    (e, bikeKey) => {
      // Clear loupe timer
      if (loupeTimerRef.current) {
        clearTimeout(loupeTimerRef.current);
        loupeTimerRef.current = null;
      }

      pinchZoom.handlers.onTouchEnd(e);

      // Only process if active bike matches and no gesture in progress
      if (bikeKey !== activeBike) {
        setLoupeState((s) => ({ ...s, visible: false }));
        return;
      }
      if (gestureInProgress.current) {
        setLoupeState((s) => ({ ...s, visible: false }));
        return;
      }

      const touch = e.changedTouches[0];
      if (!touch) {
        setLoupeState((s) => ({ ...s, visible: false }));
        return;
      }

      // If loupe was visible, place marker at loupe position
      if (loupeState.visible && loupeState.containerRect) {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const clientX = loupeState.touchX + loupeState.containerRect.left;
        const clientY = loupeState.touchY + loupeState.containerRect.top;
        placeMarker(bikeKey, clientX, clientY, rect);
        setLoupeState((s) => ({ ...s, visible: false }));
        return;
      }

      // Check for quick tap
      const tapDuration = Date.now() - touchStartTime.current;
      if (tapDuration > TOUCH.TAP_MAX_DURATION_MS) return;

      const dx = Math.abs(touch.clientX - touchStartPos.current.x);
      const dy = Math.abs(touch.clientY - touchStartPos.current.y);
      if (dx > TOUCH.TAP_MAX_MOVEMENT_PX || dy > TOUCH.TAP_MAX_MOVEMENT_PX) return;

      // Quick tap detected - place marker directly
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      placeMarker(bikeKey, touch.clientX, touch.clientY, rect);
      setLoupeState((s) => ({ ...s, visible: false }));
    },
    [
      activeBike,
      pinchZoom.handlers,
      placeMarker,
      loupeState.visible,
      loupeState.touchX,
      loupeState.touchY,
      loupeState.containerRect,
    ]
  );

  // Handle mouse click (desktop)
  const handleMouseClick = useCallback(
    (e, bikeKey) => {
      if (bikeKey !== activeBike) return;
      const rect = e.currentTarget.getBoundingClientRect();
      placeMarker(bikeKey, e.clientX, e.clientY, rect);
    },
    [activeBike, placeMarker]
  );

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
          <h1 className="text-xl sm:text-2xl font-semibold">Riding Position Comparison</h1>
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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
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
          <CollapsiblePanel
            title="Select wheel for calibration"
            stepNumber={1}
            isOpen={openPanels.wheel}
            onToggle={() => togglePanel('wheel')}
          >
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
                      className={
                        calibration.wheelChoice[key] === 'front'
                          ? 'btn-toggle-neutral-active'
                          : 'btn-toggle-inactive'
                      }
                      onClick={() => calibration.setWheel(key, 'front')}
                      disabled={!bike.tires?.front}
                    >
                      Front {bike.tires?.front ? `(${bike.tires.front})` : ''}
                    </button>
                    <button
                      className={
                        calibration.wheelChoice[key] === 'rear'
                          ? 'btn-toggle-neutral-active'
                          : 'btn-toggle-inactive'
                      }
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
          <CollapsiblePanel
            title="Select tool and click on the image"
            stepNumber={2}
            isOpen={openPanels.tool}
            onToggle={() => togglePanel('tool')}
          >
            <div className="grid grid-cols-2 gap-2 text-sm">
              {TOOL_SEQUENCE.map((tool, index) => (
                <button
                  key={tool}
                  className={`flex items-center justify-between ${activeTool === tool ? 'btn-toggle-active' : 'btn-toggle-inactive'}`}
                  onClick={() => setActiveTool(tool)}
                >
                  <span>{TOOL_LABELS[tool]}</span>
                  <span
                    className={`text-xs ml-1 px-1 rounded ${activeTool === tool ? 'bg-[--accent]' : 'bg-[--bg-card-hover] text-muted'}`}
                  >
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
                  className={
                    activeBike === key ? 'btn-toggle-neutral-active' : 'btn-toggle-inactive'
                  }
                  onClick={() => setActiveBike(key)}
                >
                  {activeBikes[key]?.label.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mt-4 pt-3 border-t border-[--border-color]">
              <button
                onClick={() => activeBike && editMode.enter(activeTool)}
                disabled={!activeBike || !activeBikes[activeBike]?.img}
                className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                Edit Mode
              </button>
              <button
                onClick={() => activeBike && handleResetBike(activeBike)}
                disabled={!activeBike}
                className="btn-secondary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Reset all markers for this bike"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Reset
              </button>
            </div>
            <p className="text-xs text-muted mt-2">
              Edit Mode: fullscreen with pinch-zoom for precise placement
            </p>
          </CollapsiblePanel>

          {/* Step 3: Overlay controls */}
          {hasTwoBikes && (
            <CollapsiblePanel
              title="Overlay & visibility"
              stepNumber={3}
              isOpen={openPanels.overlay}
              onToggle={() => togglePanel('overlay')}
            >
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
                Tip: calibrate TOP/BOTTOM on the outer tire profile, then mark the rear axle center
                on both bikes. Alignment is applied automatically.
              </div>
            </CollapsiblePanel>
          )}

          {/* Step 4: Results */}
          <CollapsiblePanel
            title="Rider triangle distances (mm)"
            stepNumber={hasTwoBikes ? 4 : 3}
            isOpen={openPanels.distances}
            onToggle={() => togglePanel('distances')}
          >
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
                      <td className="py-1">
                        {distances.seatPeg ? distances.seatPeg.toFixed(0) : '–'}
                      </td>
                      <td className="py-1">
                        {distances.seatBar ? distances.seatBar.toFixed(0) : '–'}
                      </td>
                      <td className="py-1">
                        {distances.pegBar ? distances.pegBar.toFixed(0) : '–'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!calibration.isCalibrated && (
              <div className="mt-2 text-xs text-amber-700">
                Complete calibration (TOP/BOTTOM wheel + rear axle for both bikes) to enable
                accurate measurements.
              </div>
            )}
          </CollapsiblePanel>

          {/* Step 5: Measurement Mode */}
          <CollapsiblePanel
            title="Measurement Mode"
            stepNumber={hasTwoBikes ? 5 : 4}
            isOpen={openPanels.measurement}
            onToggle={() => togglePanel('measurement')}
          >
            <p className="text-xs text-secondary mb-3">
              Use Photo mode for image-based estimation, or Manual mode if you have exact
              measurements.
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
          <CollapsiblePanel
            title="Rider Profile"
            stepNumber={hasTwoBikes ? 6 : 5}
            isOpen={openPanels.rider}
            onToggle={() => togglePanel('rider')}
          >
            <RiderProfile riderHook={riderProfile} />
          </CollapsiblePanel>

          {/* Step 7: Ergonomic Angles */}
          <CollapsiblePanel
            title="Ergonomic Angles"
            stepNumber={hasTwoBikes ? 7 : 6}
            isOpen={openPanels.angles}
            onToggle={() => togglePanel('angles')}
          >
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
                />
              </svg>
              Reset zoom ({Math.round(pinchZoom.scale * 100)}%)
            </button>
          )}
          <div
            ref={containerRef}
            className="relative w-full overflow-hidden"
            style={{ minHeight: STAGE_MIN_HEIGHT_PX }}
            onWheel={pinchZoom.handlers.onWheel}
          >
            {/* Zoomable content wrapper - ref for direct DOM manipulation during gestures */}
            <div ref={pinchZoom.setTransformRef} style={pinchZoom.zoomStyle}>
              {hasTwoBikes ? (
                <>
                  {/* Base layer: primary bike */}
                  {renderBikeLayer(primaryBike, false)}

                  {/* Overlay layer: secondary bike */}
                  {renderBikeLayer(secondaryBike, true)}
                </>
              ) : (
                <div className="empty-state">
                  <svg
                    className="w-16 h-16 text-muted mb-4 opacity-50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
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

            {/* Touch loupe for precise marker placement on mobile */}
            {loupeState.visible && loupeState.bikeKey && activeBikes[loupeState.bikeKey] && (
              <TouchLoupe
                visible={loupeState.visible}
                touchX={loupeState.touchX}
                touchY={loupeState.touchY}
                imageSrc={activeBikes[loupeState.bikeKey].img}
                containerRect={loupeState.containerRect}
              />
            )}
          </div>

          <div className="mt-3 text-xs text-muted">
            Note: this is a visual comparison scaled by the selected tire outer diameter. Minor
            inaccuracies may result from image angle, perspective distortion, and manual point
            placement.
          </div>
        </div>
      </div>

      {/* Immersive Edit Mode for mobile marker placement */}
      <EditMode
        isActive={editMode.isActive}
        isAnimating={editMode.isAnimating}
        imageSrc={activeBike ? activeBikes[activeBike]?.img : null}
        imageAlt={activeBike ? activeBikes[activeBike]?.label : ''}
        toolLabel={editMode.getCurrentToolLabel()}
        progress={editMode.getProgress()}
        currentTool={editMode.currentTool}
        markers={activeBike ? markersHook.markers[activeBike] : null}
        calibration={
          activeBike
            ? {
                calibTop: calibration.calibPts[activeBike]?.top,
                calibBot: calibration.calibPts[activeBike]?.bot,
                axle: calibration.axle[activeBike],
              }
            : null
        }
        onPlaceMarker={(x, y) => {
          if (!activeBike) return;
          const tool = editMode.currentTool;

          // Place marker based on tool type
          if (tool === 'calibTop') {
            calibration.setCalibPoint(activeBike, 'top', { x, y });
          } else if (tool === 'calibBot') {
            calibration.setCalibPoint(activeBike, 'bot', { x, y });
          } else if (tool === 'axle') {
            calibration.setAxlePosition(activeBike, { x, y });
          } else if (MARKER_TYPES.includes(tool)) {
            markersHook.setMarker(activeBike, tool, { x, y });
          }

          // Advance to next tool
          editMode.advanceToNextTool();
        }}
        onUpdateMarker={(type, pos) => {
          if (!activeBike) return;
          if (MARKER_TYPES.includes(type)) {
            markersHook.setMarker(activeBike, type, pos);
          }
        }}
        onReset={() => {
          if (activeBike) {
            handleResetBike(activeBike);
            editMode.goToTool('calibTop'); // Go back to first tool
          }
        }}
        onExit={editMode.exit}
        onSwipeStart={editMode.handleSwipeStart}
        onSwipeEnd={editMode.handleSwipeEnd}
      />

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

      {/* Version badge */}
      <VersionBadge />
    </div>
  );
}
