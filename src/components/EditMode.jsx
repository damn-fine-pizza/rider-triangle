/**
 * EditMode - Fullscreen immersive mode for precise marker placement.
 *
 * Features:
 * - Fullscreen overlay (no scroll conflicts)
 * - Pinch-to-zoom and pan
 * - Long-press for loupe precision
 * - Tap to place marker
 * - Swipe down to exit
 * - Auto-advance through tools
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { EditModeHeader } from './EditModeHeader';
import { TouchLoupe } from './TouchLoupe';
import { Marker } from './Marker';
import { CalibrationMarker } from './CalibrationMarker';
import { EDIT_MODE, TOUCH, ZOOM, MARKER_TYPES } from '../constants';
import { hapticLight, hapticMedium } from '../utils/haptics';

export function EditMode({
  isActive,
  isAnimating,
  imageSrc,
  imageAlt,
  toolLabel,
  progress,
  currentTool,
  markers,
  calibration,
  onPlaceMarker,
  onUpdateMarker,
  onReset,
  onExit,
  onSwipeStart,
  onSwipeEnd,
}) {
  // Zoom and pan state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isZooming, setIsZooming] = useState(false);

  // Touch state
  const [isPanning, setIsPanning] = useState(false);
  const lastTouchRef = useRef(null);
  const initialPinchDistanceRef = useRef(null);
  const initialScaleRef = useRef(1);

  // Mouse state (for desktop) - use refs for synchronous updates
  const isMouseDraggingRef = useRef(false);
  const mouseStartPosRef = useRef(null);
  const mouseMoved = useRef(false);

  // Loupe state
  const [loupeState, setLoupeState] = useState({
    visible: false,
    x: 0,
    y: 0,
  });
  const loupeTimerRef = useRef(null);
  const touchStartTimeRef = useRef(null);
  const touchStartPosRef = useRef(null);

  // Refs
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  // Reset state when entering/exiting
  useEffect(() => {
    if (!isActive) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setLoupeState({ visible: false, x: 0, y: 0 });
    }
  }, [isActive]);

  // Calculate distance between two touch points
  const getDistance = (touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Convert screen coordinates to image coordinates
  const screenToImageCoords = useCallback(
    (clientX, clientY) => {
      if (!containerRef.current) return { x: 0, y: 0 };

      const rect = containerRef.current.getBoundingClientRect();
      let x = clientX - rect.left;
      let y = clientY - rect.top;

      // Account for zoom and pan
      if (scale !== 1) {
        x = (x - position.x) / scale;
        y = (y - position.y) / scale;
      }

      return { x, y };
    },
    [scale, position]
  );

  // Handle touch start
  const handleTouchStart = useCallback(
    (e) => {
      const touches = e.touches;

      if (touches.length === 1) {
        const touch = touches[0];
        touchStartTimeRef.current = Date.now();
        touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
        lastTouchRef.current = { x: touch.clientX, y: touch.clientY };

        // Track for swipe-down detection
        onSwipeStart?.(touch.clientY);

        // Start loupe timer
        loupeTimerRef.current = setTimeout(() => {
          const coords = screenToImageCoords(touch.clientX, touch.clientY);
          setLoupeState({
            visible: true,
            x: coords.x,
            y: coords.y,
            screenX: touch.clientX,
            screenY: touch.clientY,
          });
          hapticLight();
        }, TOUCH.LOUPE_DELAY_MS);

        // Start panning if zoomed
        if (scale > 1) {
          setIsPanning(true);
        }
      } else if (touches.length === 2) {
        // Pinch start
        e.preventDefault();
        clearTimeout(loupeTimerRef.current);
        setLoupeState({ visible: false, x: 0, y: 0 });
        setIsZooming(true);
        setIsPanning(false);

        initialPinchDistanceRef.current = getDistance(touches[0], touches[1]);
        initialScaleRef.current = scale;
      }
    },
    [scale, screenToImageCoords, onSwipeStart]
  );

  // Handle touch move
  const handleTouchMove = useCallback(
    (e) => {
      const touches = e.touches;

      if (touches.length === 1 && !isZooming) {
        const touch = touches[0];
        const startPos = touchStartPosRef.current;

        if (startPos) {
          const dx = touch.clientX - startPos.x;
          const dy = touch.clientY - startPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Cancel loupe if moved too much
          if (distance > TOUCH.TAP_MAX_MOVEMENT_PX) {
            clearTimeout(loupeTimerRef.current);

            // If loupe was visible, update its position
            if (loupeState.visible) {
              const coords = screenToImageCoords(touch.clientX, touch.clientY);
              setLoupeState((s) => ({
                ...s,
                x: coords.x,
                y: coords.y,
                screenX: touch.clientX,
                screenY: touch.clientY,
              }));
            }
          }

          // Pan if zoomed
          if (isPanning && scale > 1 && lastTouchRef.current) {
            const panDx = touch.clientX - lastTouchRef.current.x;
            const panDy = touch.clientY - lastTouchRef.current.y;

            setPosition((p) => ({
              x: p.x + panDx,
              y: p.y + panDy,
            }));

            lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
          }
        }
      } else if (touches.length === 2 && isZooming) {
        // Pinch zoom
        e.preventDefault();
        const newDistance = getDistance(touches[0], touches[1]);
        const scaleChange = newDistance / initialPinchDistanceRef.current;
        let newScale = initialScaleRef.current * scaleChange;

        // Clamp scale
        newScale = Math.max(ZOOM.MIN_SCALE, Math.min(ZOOM.MAX_SCALE, newScale));
        setScale(newScale);

        // Adjust position to zoom toward pinch center
        const centerX = (touches[0].clientX + touches[1].clientX) / 2;
        const centerY = (touches[0].clientY + touches[1].clientY) / 2;

        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const relX = centerX - rect.left;
          const relY = centerY - rect.top;

          const scaleDiff = newScale / scale;
          setPosition((p) => ({
            x: relX - (relX - p.x) * scaleDiff,
            y: relY - (relY - p.y) * scaleDiff,
          }));
        }
      }
    },
    [isZooming, isPanning, scale, loupeState.visible, screenToImageCoords]
  );

  // Handle touch end
  const handleTouchEnd = useCallback(
    (e) => {
      clearTimeout(loupeTimerRef.current);

      const changedTouch = e.changedTouches[0];
      const startPos = touchStartPosRef.current;
      const startTime = touchStartTimeRef.current;

      // Check for swipe down
      if (onSwipeEnd?.(changedTouch.clientY)) {
        // Swipe down triggered exit
        setLoupeState({ visible: false, x: 0, y: 0 });
        return;
      }

      // Check for tap (quick, small movement)
      if (startPos && startTime) {
        const dx = changedTouch.clientX - startPos.x;
        const dy = changedTouch.clientY - startPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const duration = Date.now() - startTime;

        const isTap = distance < TOUCH.TAP_MAX_MOVEMENT_PX && duration < TOUCH.TAP_MAX_DURATION_MS;

        if (isTap || loupeState.visible) {
          // Place marker
          const coords = loupeState.visible
            ? { x: loupeState.x, y: loupeState.y }
            : screenToImageCoords(changedTouch.clientX, changedTouch.clientY);

          onPlaceMarker?.(coords.x, coords.y);
          hapticMedium();
        }
      }

      // Reset state
      setLoupeState({ visible: false, x: 0, y: 0 });
      setIsZooming(false);
      setIsPanning(false);
      lastTouchRef.current = null;
      touchStartPosRef.current = null;
      touchStartTimeRef.current = null;
    },
    [loupeState, screenToImageCoords, onPlaceMarker, onSwipeEnd]
  );

  // Handle mouse click (desktop) - place marker
  const handleClick = useCallback(
    (e) => {
      // Ignore if we were dragging (moved more than threshold)
      if (mouseMoved.current) {
        mouseMoved.current = false;
        return;
      }

      const coords = screenToImageCoords(e.clientX, e.clientY);
      onPlaceMarker?.(coords.x, coords.y);
    },
    [screenToImageCoords, onPlaceMarker]
  );

  // Handle mouse down (desktop) - start pan
  const handleMouseDown = useCallback(
    (e) => {
      mouseStartPosRef.current = { x: e.clientX, y: e.clientY };
      mouseMoved.current = false;
      isMouseDraggingRef.current = scale > 1;
    },
    [scale]
  );

  // Handle mouse move (desktop) - pan
  const handleMouseMove = useCallback((e) => {
    if (!mouseStartPosRef.current) return;

    const dx = e.clientX - mouseStartPosRef.current.x;
    const dy = e.clientY - mouseStartPosRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Mark as moved if dragged beyond threshold
    if (distance > 5) {
      mouseMoved.current = true;
    }

    // Only pan if zoomed and dragging
    if (isMouseDraggingRef.current) {
      setPosition((p) => ({
        x: p.x + dx,
        y: p.y + dy,
      }));
      mouseStartPosRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  // Handle mouse up (desktop) - end pan
  const handleMouseUp = useCallback(() => {
    isMouseDraggingRef.current = false;
    mouseStartPosRef.current = null;
  }, []);

  // Reset zoom
  const handleResetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Zoom in/out buttons
  const handleZoomIn = useCallback(() => {
    setScale((s) => Math.min(ZOOM.MAX_SCALE, s * ZOOM.WHEEL_ZOOM_IN));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((s) => Math.max(ZOOM.MIN_SCALE, s * ZOOM.WHEEL_ZOOM_OUT));
  }, []);

  if (!isActive) return null;

  const animationClass = isAnimating ? 'animate-fade-in' : '';

  return (
    <div
      data-testid="edit-mode"
      className={`fixed inset-0 z-[100] bg-black ${animationClass}`}
      style={{
        touchAction: 'none',
      }}
    >
      {/* Header */}
      <EditModeHeader toolLabel={toolLabel} progress={progress} onReset={onReset} onExit={onExit} />

      {/* Image container */}
      <div
        ref={containerRef}
        data-testid="edit-mode-container"
        className="absolute inset-0 overflow-hidden cursor-crosshair"
        style={{
          top: EDIT_MODE.HEADER_HEIGHT_PX,
          bottom: 60, // Space for zoom controls
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Zoomable image wrapper */}
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            transition: isZooming ? 'none' : `transform ${ZOOM.TRANSITION_DURATION_S}s ease-out`,
          }}
        >
          <div ref={imageRef} className="relative inline-block">
            <img
              src={imageSrc}
              alt={imageAlt}
              className="max-w-full max-h-full object-contain select-none"
              draggable={false}
            />

            {/* Render existing markers */}
            {markers &&
              MARKER_TYPES.map((type) => {
                const pos = markers[type];
                if (!pos) return null;
                return (
                  <Marker
                    key={type}
                    type={type}
                    position={pos}
                    scale={1}
                    isActive={currentTool === type}
                    onDrag={(newPos) => onUpdateMarker?.(type, newPos)}
                  />
                );
              })}

            {/* Render calibration markers */}
            {calibration?.calibTop && (
              <CalibrationMarker position={calibration.calibTop} label="TOP" scale={1} />
            )}
            {calibration?.calibBot && (
              <CalibrationMarker position={calibration.calibBot} label="BOT" scale={1} />
            )}
            {calibration?.axle && (
              <Marker
                type="axle"
                position={calibration.axle}
                scale={1}
                isActive={currentTool === 'axle'}
              />
            )}
          </div>
        </div>

        {/* Touch loupe */}
        {loupeState.visible && containerRef.current && (
          <TouchLoupe
            visible={true}
            touchX={loupeState.screenX}
            touchY={loupeState.screenY - EDIT_MODE.HEADER_HEIGHT_PX}
            imageSrc={imageSrc}
            containerRect={containerRef.current.getBoundingClientRect()}
          />
        )}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4 z-50">
        <button
          onClick={handleZoomOut}
          className="w-12 h-12 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full text-white text-xl font-bold active:bg-white/30 transition-colors"
          aria-label="Zoom out"
        >
          −
        </button>

        {scale !== 1 && (
          <button
            onClick={handleResetZoom}
            className="px-3 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm active:bg-white/30 transition-colors"
          >
            {Math.round(scale * 100)}%
          </button>
        )}

        <button
          onClick={handleZoomIn}
          className="w-12 h-12 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full text-white text-xl font-bold active:bg-white/30 transition-colors"
          aria-label="Zoom in"
        >
          +
        </button>
      </div>
    </div>
  );
}
