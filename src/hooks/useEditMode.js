import { useState, useCallback, useEffect, useRef } from 'react';
import { EDIT_MODE, TOOL_SEQUENCE, TOOL_LABELS } from '../constants';

/**
 * Hook for managing Immersive Edit Mode.
 *
 * Provides fullscreen marker placement experience with:
 * - Body scroll lock
 * - Tool auto-advance
 * - Swipe down to exit
 * - Animation state management
 *
 * @param {Object} options - Configuration options
 * @param {string} options.initialTool - Initial tool to select (default: first in TOOL_SEQUENCE)
 * @param {Function} options.onToolChange - Callback when tool changes
 * @param {Function} options.onExit - Callback when exiting edit mode
 * @returns {Object} Edit mode state and methods
 */
export function useEditMode(options = {}) {
  const { initialTool = TOOL_SEQUENCE[0], onToolChange, onExit } = options;

  // Core state
  const [isActive, setIsActive] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentTool, setCurrentTool] = useState(initialTool);

  // Refs for swipe detection
  const swipeStartY = useRef(null);
  const swipeStartTime = useRef(null);

  // Lock body scroll when edit mode is active
  useEffect(() => {
    if (isActive) {
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalWidth = document.body.style.width;

      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.width = originalWidth;
      };
    }
  }, [isActive]);

  /**
   * Enter edit mode with animation.
   */
  const enter = useCallback((tool = null) => {
    if (tool) {
      setCurrentTool(tool);
    }
    setIsAnimating(true);
    setIsActive(true);

    // End animation after duration
    setTimeout(() => {
      setIsAnimating(false);
    }, EDIT_MODE.ANIMATION_DURATION_MS);
  }, []);

  /**
   * Exit edit mode with animation.
   */
  const exit = useCallback(() => {
    setIsAnimating(true);

    setTimeout(() => {
      setIsActive(false);
      setIsAnimating(false);
      onExit?.();
    }, EDIT_MODE.ANIMATION_DURATION_MS);
  }, [onExit]);

  /**
   * Advance to the next tool in sequence.
   * Returns true if advanced, false if already at last tool.
   */
  const advanceToNextTool = useCallback(() => {
    const currentIndex = TOOL_SEQUENCE.indexOf(currentTool);
    const nextIndex = currentIndex + 1;

    if (nextIndex < TOOL_SEQUENCE.length) {
      const nextTool = TOOL_SEQUENCE[nextIndex];
      setCurrentTool(nextTool);
      onToolChange?.(nextTool);
      return true;
    }

    // At last tool - exit edit mode
    exit();
    return false;
  }, [currentTool, onToolChange, exit]);

  /**
   * Go to a specific tool.
   */
  const goToTool = useCallback(
    (tool) => {
      if (TOOL_SEQUENCE.includes(tool)) {
        setCurrentTool(tool);
        onToolChange?.(tool);
      }
    },
    [onToolChange]
  );

  /**
   * Handle swipe start (for swipe-down-to-exit).
   */
  const handleSwipeStart = useCallback((clientY) => {
    swipeStartY.current = clientY;
    swipeStartTime.current = Date.now();
  }, []);

  /**
   * Handle swipe end and determine if should exit.
   * Returns true if exit was triggered.
   */
  const handleSwipeEnd = useCallback(
    (clientY) => {
      if (swipeStartY.current === null) return false;

      const deltaY = clientY - swipeStartY.current;
      const deltaTime = Date.now() - swipeStartTime.current;
      const velocity = deltaY / deltaTime;

      // Reset refs
      swipeStartY.current = null;
      swipeStartTime.current = null;

      // Check if swipe down threshold met
      if (
        deltaY > EDIT_MODE.SWIPE_DOWN_THRESHOLD_PX &&
        velocity > EDIT_MODE.SWIPE_VELOCITY_THRESHOLD
      ) {
        exit();
        return true;
      }

      return false;
    },
    [exit]
  );

  /**
   * Get current tool label for display.
   */
  const getCurrentToolLabel = useCallback(() => {
    return TOOL_LABELS[currentTool] || currentTool;
  }, [currentTool]);

  /**
   * Get progress info (current step / total steps).
   */
  const getProgress = useCallback(() => {
    const currentIndex = TOOL_SEQUENCE.indexOf(currentTool);
    return {
      current: currentIndex + 1,
      total: TOOL_SEQUENCE.length,
      isLast: currentIndex === TOOL_SEQUENCE.length - 1,
    };
  }, [currentTool]);

  return {
    // State
    isActive,
    isAnimating,
    currentTool,

    // Actions
    enter,
    exit,
    advanceToNextTool,
    goToTool,

    // Swipe handling
    handleSwipeStart,
    handleSwipeEnd,

    // Helpers
    getCurrentToolLabel,
    getProgress,

    // Constants (for convenience)
    animationDuration: EDIT_MODE.ANIMATION_DURATION_MS,
  };
}
