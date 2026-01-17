/**
 * Ergonomic angle calculations for rider position analysis.
 *
 * These calculations estimate body angles based on:
 * - Bike marker positions (seat, peg, bar) in mm
 * - Rider body measurements (inseam, torso, arm length) in mm
 */

import { distance } from './geometry';

/**
 * Calculate knee angle using law of cosines.
 *
 * The knee angle is formed by thigh (hip-to-knee) and lower leg (knee-to-ankle).
 * We approximate using the seat-to-peg distance as the "leg extension".
 *
 * @param {number} seatPegDistance - Distance from seat to footpeg in mm
 * @param {number} thighLength - Thigh length (hip to knee) in mm
 * @param {number} lowerLegLength - Lower leg length (knee to ankle) in mm
 * @returns {number|null} Knee angle in degrees, or null if invalid
 */
export function calculateKneeAngle(seatPegDistance, thighLength, lowerLegLength) {
  if (!seatPegDistance || !thighLength || !lowerLegLength) return null;

  // Law of cosines: c² = a² + b² - 2ab·cos(C)
  // Solving for angle C: cos(C) = (a² + b² - c²) / (2ab)
  // Where: a = thigh, b = lower leg, c = seat-peg distance

  const a = thighLength;
  const b = lowerLegLength;
  const c = seatPegDistance;

  // Check triangle inequality
  if (c > a + b) {
    // Leg fully extended or beyond - return 180°
    return 180;
  }
  if (c < Math.abs(a - b)) {
    // Impossible geometry
    return null;
  }

  const cosAngle = (a * a + b * b - c * c) / (2 * a * b);
  const clampedCos = Math.max(-1, Math.min(1, cosAngle));
  const angleRad = Math.acos(clampedCos);

  return angleRad * (180 / Math.PI);
}

/**
 * Calculate hip angle (torso-to-thigh angle).
 *
 * This is the angle at the hip joint between the torso and thigh.
 * A more open angle (closer to 180°) is generally more comfortable.
 *
 * @param {Object} seat - Seat position {x, y} in mm
 * @param {Object} peg - Footpeg position {x, y} in mm
 * @param {Object} bar - Handlebar position {x, y} in mm
 * @param {number} torsoLength - Torso length in mm
 * @returns {number|null} Hip angle in degrees, or null if invalid
 */
export function calculateHipAngle(seat, peg, bar, torsoLength) {
  if (!seat || !peg || !bar || !torsoLength) return null;

  // Thigh vector: from seat to knee direction (approximated by seat-to-peg direction)
  const thighVec = { x: peg.x - seat.x, y: peg.y - seat.y };

  // Torso vector: from seat toward shoulders (approximated by seat-to-bar direction)
  // Note: actual shoulder is above bar, but bar direction gives good approximation
  const torsoVec = { x: bar.x - seat.x, y: bar.y - seat.y };

  // Calculate angle between vectors
  const dotProduct = thighVec.x * torsoVec.x + thighVec.y * torsoVec.y;
  const magThigh = Math.hypot(thighVec.x, thighVec.y);
  const magTorso = Math.hypot(torsoVec.x, torsoVec.y);

  if (magThigh === 0 || magTorso === 0) return null;

  const cosAngle = dotProduct / (magThigh * magTorso);
  const clampedCos = Math.max(-1, Math.min(1, cosAngle));
  const angleRad = Math.acos(clampedCos);

  return angleRad * (180 / Math.PI);
}

/**
 * Calculate back/torso angle from vertical.
 *
 * This measures how far forward the rider leans.
 * 0° = upright, 90° = horizontal (racing tuck).
 *
 * @param {Object} seat - Seat position {x, y}
 * @param {Object} bar - Handlebar position {x, y}
 * @returns {number|null} Back angle in degrees from vertical, or null if invalid
 */
export function calculateBackAngle(seat, bar) {
  if (!seat || !bar) return null;

  // Vector from seat to bar
  const dx = bar.x - seat.x;
  const dy = bar.y - seat.y;

  // Angle from vertical (negative y is up in screen coordinates)
  // We want angle from vertical, so we use atan2 with swapped args
  const angleRad = Math.atan2(Math.abs(dx), -dy);

  // If bar is below seat (dy > 0), rider is leaning forward
  // If bar is above seat (dy < 0), rider is sitting upright or leaning back

  let angleDeg = angleRad * (180 / Math.PI);

  // Adjust for cases where bar is below seat level
  if (dy > 0) {
    // Bar is below seat - extreme forward lean
    angleDeg = 90 + (90 - angleDeg);
  }

  return Math.abs(angleDeg);
}

/**
 * Calculate arm angle using law of cosines.
 *
 * The arm angle is at the elbow, formed by upper arm and forearm.
 *
 * @param {number} seatBarDistance - Distance from seat to handlebar in mm
 * @param {number} upperArmLength - Upper arm length (shoulder to elbow) in mm
 * @param {number} forearmLength - Forearm length (elbow to wrist) in mm
 * @param {number} shoulderOffset - Estimated shoulder position offset from seat in mm
 * @returns {number|null} Arm angle in degrees, or null if invalid
 */
export function calculateArmAngle(seatBarDistance, upperArmLength, forearmLength, shoulderOffset = 0) {
  if (!seatBarDistance || !upperArmLength || !forearmLength) return null;

  // Approximate reach from shoulder to bar
  // Shoulder is roughly above and behind the seat
  const reachToBar = Math.max(0, seatBarDistance - shoulderOffset);

  const a = upperArmLength;
  const b = forearmLength;
  const c = reachToBar;

  // Check triangle inequality
  if (c > a + b) {
    // Arms fully extended
    return 180;
  }
  if (c < Math.abs(a - b)) {
    // Very close reach
    return 45; // Minimum reasonable angle
  }

  const cosAngle = (a * a + b * b - c * c) / (2 * a * b);
  const clampedCos = Math.max(-1, Math.min(1, cosAngle));
  const angleRad = Math.acos(clampedCos);

  return angleRad * (180 / Math.PI);
}

/**
 * Calculate all ergonomic angles for a bike/rider combination.
 *
 * @param {Object} markers - Bike markers {seat, peg, bar} with {x, y} in mm
 * @param {Object} measurements - Rider measurements from getEffectiveMeasurements()
 * @param {number} pxPerMM - Pixels per mm for distance conversion
 * @returns {Object} All calculated angles
 */
export function calculateAllAngles(markers, measurements, pxPerMM) {
  if (!markers || !measurements || !pxPerMM) {
    return {
      knee: null,
      hip: null,
      back: null,
      arm: null,
    };
  }

  const { seat, peg, bar } = markers;

  // Calculate distances in mm
  const seatPegMM = seat && peg ? distance(seat, peg) / pxPerMM : null;
  const seatBarMM = seat && bar ? distance(seat, bar) / pxPerMM : null;

  // Get body segment lengths
  const { thigh, lowerLeg, torso, upperArm, forearm } = measurements;

  // Calculate angles
  const knee = calculateKneeAngle(seatPegMM, thigh, lowerLeg);
  const hip = calculateHipAngle(seat, peg, bar, torso);
  const back = calculateBackAngle(seat, bar);
  const arm = calculateArmAngle(seatBarMM, upperArm, forearm, 100); // 100mm shoulder offset estimate

  return {
    knee,
    hip,
    back,
    arm,
  };
}

/**
 * Calculate all ergonomic angles from direct distance measurements.
 *
 * Used for manual measurement mode where user inputs distances directly.
 *
 * @param {Object} distances - Direct distances in mm {seatPeg, seatBar, pegBar}
 * @param {Object} manualMeasurements - Manual input measurements
 * @param {Object} riderMeasurements - Rider body measurements
 * @returns {Object} All calculated angles
 */
export function calculateAllAnglesFromDistances(distances, manualMeasurements, riderMeasurements) {
  if (!distances || !riderMeasurements) {
    return {
      knee: null,
      hip: null,
      back: null,
      arm: null,
    };
  }

  const { seatPeg, seatBar } = distances;
  const { thigh, lowerLeg, torso, upperArm, forearm } = riderMeasurements;

  // Calculate knee angle from seat-peg distance
  const knee = calculateKneeAngle(seatPeg, thigh, lowerLeg);

  // Calculate arm angle from seat-bar distance
  const arm = calculateArmAngle(seatBar, upperArm, forearm, 100);

  // For hip and back angles, we need the actual geometry
  // Reconstruct virtual markers from manual measurements
  let hip = null;
  let back = null;

  if (manualMeasurements) {
    const { seatToPegHorizontal, seatToPegVertical, seatToBarHorizontal, seatToBarVertical } = manualMeasurements;

    if (seatToPegHorizontal != null && seatToPegVertical != null &&
        seatToBarHorizontal != null && seatToBarVertical != null) {
      // Virtual markers (seat at origin)
      const seat = { x: 0, y: 0 };
      const peg = { x: -seatToPegHorizontal, y: seatToPegVertical };
      const bar = { x: seatToBarHorizontal, y: -seatToBarVertical };

      hip = calculateHipAngle(seat, peg, bar, torso);
      back = calculateBackAngle(seat, bar);
    }
  }

  return {
    knee,
    hip,
    back,
    arm,
  };
}

/**
 * Format an angle for display.
 *
 * @param {number|null} angle - Angle in degrees
 * @param {number} decimals - Decimal places (default 0)
 * @returns {string} Formatted angle string
 */
export function formatAngle(angle, decimals = 0) {
  if (angle === null || angle === undefined || isNaN(angle)) {
    return '–';
  }
  return `${angle.toFixed(decimals)}°`;
}
