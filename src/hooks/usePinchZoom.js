import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook for pinch-to-zoom and pan gestures on touch devices.
 *
 * @param {Object} options
 * @param {number} options.minScale - Minimum zoom level (default 0.5)
 * @param {number} options.maxScale - Maximum zoom level (default 3)
 * @param {React.RefObject} options.containerRef - Ref to the zoomable container
 * @returns {Object} - { scale, position, handlers, resetZoom, isZooming }
 */
export function usePinchZoom({
  minScale = 0.5,
  maxScale = 3,
  containerRef,
} = {}) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isZooming, setIsZooming] = useState(false);

  // Track gesture state
  const gestureState = useRef({
    isPinching: false,
    initialDistance: 0,
    initialScale: 1,
    initialPosition: { x: 0, y: 0 },
    lastPosition: { x: 0, y: 0 },
    isPanning: false,
    startPanPos: { x: 0, y: 0 },
  });

  // Calculate distance between two touch points
  const getDistance = useCallback((touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Calculate center point between two touches
  const getCenter = useCallback((touch1, touch2) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
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
        initialDistance: distance,
        initialScale: scale,
        initialPosition: { ...position },
      };
      setIsZooming(true);
    } else if (e.touches.length === 1 && scale > 1) {
      // Pan gesture (only when zoomed in)
      gestureState.current = {
        ...gestureState.current,
        isPanning: true,
        startPanPos: {
          x: e.touches[0].clientX - position.x,
          y: e.touches[0].clientY - position.y,
        },
      };
    }
  }, [scale, position, getDistance]);

  // Handle touch move
  const handleTouchMove = useCallback((e) => {
    if (gestureState.current.isPinching && e.touches.length === 2) {
      e.preventDefault();
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const { initialDistance, initialScale } = gestureState.current;

      // Calculate new scale
      const scaleChange = currentDistance / initialDistance;
      let newScale = initialScale * scaleChange;
      newScale = Math.max(minScale, Math.min(maxScale, newScale));

      setScale(newScale);
    } else if (gestureState.current.isPanning && e.touches.length === 1) {
      e.preventDefault();
      const { startPanPos } = gestureState.current;
      const newX = e.touches[0].clientX - startPanPos.x;
      const newY = e.touches[0].clientY - startPanPos.y;
      setPosition({ x: newX, y: newY });
    }
  }, [getDistance, minScale, maxScale]);

  // Handle touch end
  const handleTouchEnd = useCallback((e) => {
    if (e.touches.length < 2) {
      gestureState.current.isPinching = false;
      setIsZooming(false);
    }
    if (e.touches.length === 0) {
      gestureState.current.isPanning = false;
    }
  }, []);

  // Reset zoom to default
  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Double-tap to zoom
  const lastTap = useRef(0);
  const handleDoubleTap = useCallback((e) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Double tap detected
      e.preventDefault();
      if (scale > 1) {
        resetZoom();
      } else {
        // Zoom to 2x centered on tap position
        setScale(2);
        if (containerRef?.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const touch = e.changedTouches?.[0] || e;
          const tapX = (touch.clientX || touch.pageX) - rect.left;
          const tapY = (touch.clientY || touch.pageY) - rect.top;
          // Center the zoom on tap position
          setPosition({
            x: -(tapX - rect.width / 2),
            y: -(tapY - rect.height / 2),
          });
        }
      }
    }
    lastTap.current = now;
  }, [scale, resetZoom, containerRef]);

  // Wheel zoom for desktop
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale((s) => Math.max(minScale, Math.min(maxScale, s * delta)));
    }
  }, [minScale, maxScale]);

  // Style object for the zoomable container
  const zoomStyle = {
    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
    transformOrigin: 'center center',
    transition: isZooming ? 'none' : 'transform 0.2s ease-out',
  };

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
    isZooming,
    zoomStyle,
    handleDoubleTap,
  };
}
