/**
 * Haptic feedback utilities for mobile devices.
 * Uses the Vibration API when available.
 */

/**
 * Check if haptic feedback is supported.
 */
export function isHapticsSupported() {
  return 'vibrate' in navigator;
}

/**
 * Light haptic feedback for button presses.
 */
export function hapticLight() {
  if (isHapticsSupported()) {
    navigator.vibrate(10);
  }
}

/**
 * Medium haptic feedback for marker placement.
 */
export function hapticMedium() {
  if (isHapticsSupported()) {
    navigator.vibrate(25);
  }
}

/**
 * Success haptic feedback pattern.
 */
export function hapticSuccess() {
  if (isHapticsSupported()) {
    navigator.vibrate([15, 50, 15]);
  }
}

/**
 * Error haptic feedback pattern.
 */
export function hapticError() {
  if (isHapticsSupported()) {
    navigator.vibrate([50, 30, 50, 30, 50]);
  }
}
