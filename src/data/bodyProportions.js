/**
 * Body proportion data for estimating measurements from height.
 * Based on anthropometric studies and ergonomic standards.
 *
 * All ratios are expressed as fraction of total height.
 * These are statistical averages and vary by individual.
 */

// Average body segment ratios (as fraction of height)
// Sources: NASA-STD-3000, Dreyfuss Associates, ANSUR II
export const BODY_RATIOS = {
  // Leg measurements
  inseam: 0.47,           // Floor to crotch (leg length)
  thigh: 0.245,           // Crotch to knee center
  lowerLeg: 0.225,        // Knee center to ankle

  // Torso measurements
  torso: 0.30,            // Crotch to shoulder
  sittingHeight: 0.52,    // Floor to top of head when seated

  // Arm measurements
  armLength: 0.44,        // Shoulder to fingertip
  upperArm: 0.186,        // Shoulder to elbow
  forearm: 0.146,         // Elbow to wrist
  hand: 0.108,            // Wrist to fingertip

  // Other useful measurements
  shoulderWidth: 0.26,    // Bideltoid breadth
  hipWidth: 0.17,         // Hip breadth
  footLength: 0.15,       // Heel to toe
};

/**
 * Calculate estimated body measurements from height.
 *
 * @param {number} heightCm - Total height in centimeters
 * @returns {Object} Estimated measurements in mm
 */
export function estimateFromHeight(heightCm) {
  const heightMM = heightCm * 10;

  return {
    height: heightMM,
    inseam: Math.round(heightMM * BODY_RATIOS.inseam),
    thigh: Math.round(heightMM * BODY_RATIOS.thigh),
    lowerLeg: Math.round(heightMM * BODY_RATIOS.lowerLeg),
    torso: Math.round(heightMM * BODY_RATIOS.torso),
    armLength: Math.round(heightMM * BODY_RATIOS.armLength),
    upperArm: Math.round(heightMM * BODY_RATIOS.upperArm),
    forearm: Math.round(heightMM * BODY_RATIOS.forearm),
    shoulderWidth: Math.round(heightMM * BODY_RATIOS.shoulderWidth),
  };
}

/**
 * Default rider profile template.
 */
export const DEFAULT_RIDER = {
  name: 'Default Rider',
  heightCm: 175,  // Average adult height
  // Individual overrides (null = use estimated)
  overrides: {
    inseam: null,
    torso: null,
    armLength: null,
  },
  // Seat position affects hip angle calculation
  seatPosition: 'center',  // 'forward', 'center', 'back'
};

/**
 * Seat position offsets in mm (relative to center).
 * Positive = forward, negative = back.
 */
export const SEAT_POSITIONS = {
  forward: { offset: 30, label: 'Forward' },
  center: { offset: 0, label: 'Center' },
  back: { offset: -30, label: 'Back' },
};

/**
 * Get effective measurements for a rider profile.
 * Uses overrides if provided, otherwise estimates from height.
 *
 * @param {Object} profile - Rider profile
 * @returns {Object} Effective measurements in mm
 */
export function getEffectiveMeasurements(profile) {
  const estimated = estimateFromHeight(profile.heightCm);

  return {
    ...estimated,
    // Apply overrides if set
    inseam: profile.overrides?.inseam ?? estimated.inseam,
    torso: profile.overrides?.torso ?? estimated.torso,
    armLength: profile.overrides?.armLength ?? estimated.armLength,
    // Include seat position
    seatPosition: profile.seatPosition || 'center',
    seatOffset: SEAT_POSITIONS[profile.seatPosition || 'center'].offset,
  };
}
