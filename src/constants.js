/**
 * Centralized constants for the Rider Triangle app.
 * Change values here to affect the entire application.
 */

// Touch interaction thresholds
export const TOUCH = {
  TAP_MAX_DURATION_MS: 300, // Max time for a tap gesture
  TAP_MAX_MOVEMENT_PX: 10, // Max finger movement for a tap
  PAN_THRESHOLD_PX: 5, // Movement threshold to start panning
  LOUPE_DELAY_MS: 150, // Delay before showing the loupe
};

// Touch loupe appearance
export const LOUPE = {
  SIZE_PX: 150, // Diameter of the loupe circle (increased for Edit Mode)
  MAGNIFICATION: 3, // Zoom factor inside loupe
  OFFSET_Y_PX: 180, // Distance above touch point
  MIN_TOP_PX: 80, // Minimum distance from top edge
  POINTER_SIZE_PX: 10, // Size of the pointing triangle
};

// Immersive Edit Mode settings
export const EDIT_MODE = {
  ANIMATION_DURATION_MS: 200, // Entry/exit animation duration
  HEADER_HEIGHT_PX: 56, // Height of the header pill
  ZOOM_BUTTON_SIZE_PX: 44, // Touch target for zoom buttons
  SWIPE_DOWN_THRESHOLD_PX: 100, // Distance to trigger swipe-down exit
  SWIPE_VELOCITY_THRESHOLD: 0.5, // Minimum velocity for swipe detection
};

// Pinch-zoom limits and behavior
export const ZOOM = {
  MIN_SCALE: 0.5,
  MAX_SCALE: 4,
  WHEEL_ZOOM_IN: 1.1, // Multiplier for wheel zoom in
  WHEEL_ZOOM_OUT: 0.9, // Multiplier for wheel zoom out
  TRANSITION_DURATION_S: 0.15, // Animation duration in seconds
};

// Tool sequence for auto-advance during calibration
export const TOOL_SEQUENCE = ['calibTop', 'calibBot', 'axle', 'seat', 'peg', 'bar'];

// Human-readable tool labels
export const TOOL_LABELS = {
  calibTop: 'Calib. TOP wheel',
  calibBot: 'Calib. BOTTOM wheel',
  axle: 'Rear axle center',
  seat: 'Seat',
  peg: 'Footpeg',
  bar: 'Handlebar',
};

// Marker types (subset of tool sequence for body position markers)
export const MARKER_TYPES = ['seat', 'peg', 'bar'];

// Stage minimum height
export const STAGE_MIN_HEIGHT_PX = 520;
