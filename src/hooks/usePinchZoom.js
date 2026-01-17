import { useState, useCallback, useRef } from 'react';

/**
 * Hook for pinch-to-zoom and pan gestures on touch devices.
 * Optimized for performance using refs for intermediate state.
 *
 * @param {Object} options
 * @param {number} options.minScale - Minimum zoom level (default 0.5)
 * @param {number} options.maxScale - Maximum zoom level (default 3)
 * @param {React.RefObject} options.containerRef - Ref to the zoomable container
 * @returns {Object} - { scale, position, handlers, resetZoom, isGesturing }
 */
export function usePinchZoom({
  minScale = 0.5,
  maxScale = 4,
  containerRef,
} = {}) {
  // Final state (triggers re-render only when gesture ends)
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false);

  // Refs for intermediate values during gestures (no re-renders)
  const scaleRef = useRef(1);
  const positionRef = useRef({ x: 0, y: 0 });
  const transformRef = useRef(null);

  // Track gesture state
  const gestureState = useRef({
    isPinching: false,
    isPanning: false,
    initialDistance: 0,
    initialScale: 1,
    initialPosition: { x: 0, y: 0 },
    startPanPos: { x: 0, y: 0 },
  });

  // Apply transform directly to DOM for smooth performance
  const applyTransform = useCallback((newScale, newPosition) => {
    scaleRef.current = newScale;
    positionRef.current = newPosition;

    if (transformRef.current) {
      transformRef.current.style.transform =
        `translate(${newPosition.x}px, ${newPosition.y}px) scale(${newScale})`;
    }
  }, []);

  // Calculate distance between two touch points
  const getDistance = useCallback((touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      // Pinch gesture started
      e.preventDefault();
      const distance = getDistance(e.touches[0], e.touches[1]);
      gestureState.current = {
        ...gestureState.current,
        isPinching: true,
        isPanning: false,
        initialDistance: distance,
        initialScale: scaleRef.current,
        initialPosition: { ...positionRef.current },
      };
      setIsGesturing(true);
    } else if (e.touches.length === 1 && scaleRef.current > 1) {
      // Pan gesture (only when zoomed in)
      gestureState.current = {
        ...gestureState.current,
        isPanning: true,
        isPinching: false,
        startPanPos: {
          x: e.touches[0].clientX - positionRef.current.x,
          y: e.touches[0].clientY - positionRef.current.y,
        },
      };
      setIsGesturing(true);
    }
  }, [getDistance]);

  // Handle touch move
  const handleTouchMove = useCallback((e) => {
    if (gestureState.current.isPinching && e.touches.length === 2) {
      e.preventDefault();
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const { initialDistance, initialScale, initialPosition } = gestureState.current;

      // Calculate new scale
      const scaleChange = currentDistance / initialDistance;
      let newScale = initialScale * scaleChange;
      newScale = Math.max(minScale, Math.min(maxScale, newScale));

      // Calculate center point for zoom
      const center = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };

      // Adjust position to keep zoom centered
      const scaleDiff = newScale / initialScale;
      const newPosition = {
        x: center.x - (center.x - initialPosition.x) * scaleDiff,
        y: center.y - (center.y - initialPosition.y) * scaleDiff,
      };

      applyTransform(newScale, newPosition);
    } else if (gestureState.current.isPanning && e.touches.length === 1) {
      e.preventDefault();
      const { startPanPos } = gestureState.current;
      const newPosition = {
        x: e.touches[0].clientX - startPanPos.x,
        y: e.touches[0].clientY - startPanPos.y,
      };
      applyTransform(scaleRef.current, newPosition);
    }
  }, [getDistance, minScale, maxScale, applyTransform]);

  // Handle touch end - commit state
  const handleTouchEnd = useCallback((e) => {
    if (e.touches.length < 2 && gestureState.current.isPinching) {
      gestureState.current.isPinching = false;
      // Commit final values to state
      setScale(scaleRef.current);
      setPosition({ ...positionRef.current });
      setIsGesturing(false);
    }
    if (e.touches.length === 0 && gestureState.current.isPanning) {
      gestureState.current.isPanning = false;
      // Commit final values to state
      setScale(scaleRef.current);
      setPosition({ ...positionRef.current });
      setIsGesturing(false);
    }
  }, []);

  // Reset zoom to default
  const resetZoom = useCallback(() => {
    scaleRef.current = 1;
    positionRef.current = { x: 0, y: 0 };
    setScale(1);
    setPosition({ x: 0, y: 0 });
    applyTransform(1, { x: 0, y: 0 });
  }, [applyTransform]);

  // Wheel zoom for desktop
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(minScale, Math.min(maxScale, scaleRef.current * delta));
      scaleRef.current = newScale;
      setScale(newScale);
      applyTransform(newScale, positionRef.current);
    }
  }, [minScale, maxScale, applyTransform]);

  // Style object for the zoomable container (used for initial render)
  const zoomStyle = {
    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
    transformOrigin: 'center center',
    transition: isGesturing ? 'none' : 'transform 0.15s ease-out',
    willChange: isGesturing ? 'transform' : 'auto',
  };

  // Ref callback to capture the transform element
  const setTransformRef = useCallback((el) => {
    transformRef.current = el;
    if (el) {
      // Sync ref values with current state
      scaleRef.current = scale;
      positionRef.current = position;
    }
  }, [scale, position]);

  // Combined handlers object
  const handlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onWheel: handleWheel,
  };

  return {
    scale,
    position,
    handlers,
    resetZoom,
    isGesturing,
    zoomStyle,
    setTransformRef,
  };
}
