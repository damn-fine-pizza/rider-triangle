/**
 * Skeleton positioning calculations.
 *
 * Calculates joint positions for a stick figure rider based on:
 * - Bike marker positions (seat, peg, bar)
 * - Rider body measurements (thigh, lowerLeg, torso, upperArm, forearm)
 */

/**
 * Calculate the knee position given hip, foot, and leg segment lengths.
 * Uses the "two-circle intersection" method.
 *
 * @param {Object} hip - Hip position {x, y}
 * @param {Object} foot - Foot position {x, y}
 * @param {number} thighLength - Thigh length in pixels
 * @param {number} lowerLegLength - Lower leg length in pixels
 * @returns {Object|null} Knee position {x, y} or null if impossible
 */
function calculateKneePosition(hip, foot, thighLength, lowerLegLength) {
  if (!hip || !foot) return null;

  const dx = foot.x - hip.x;
  const dy = foot.y - hip.y;
  const dist = Math.hypot(dx, dy);

  // Check if leg can reach
  if (dist > thighLength + lowerLegLength) {
    // Leg fully extended - place knee on line
    const ratio = thighLength / (thighLength + lowerLegLength);
    return {
      x: hip.x + dx * ratio,
      y: hip.y + dy * ratio,
    };
  }

  if (dist < Math.abs(thighLength - lowerLegLength)) {
    // Too close - shouldn't happen in normal riding
    return {
      x: hip.x + dx * 0.5,
      y: hip.y + dy * 0.5,
    };
  }

  // Two-circle intersection
  // Circle 1: center=hip, radius=thighLength
  // Circle 2: center=foot, radius=lowerLegLength
  const a = thighLength;
  const b = lowerLegLength;
  const c = dist;

  // Distance from hip to the line connecting intersection points
  const x = (a * a - b * b + c * c) / (2 * c);
  // Distance from that line to intersection point
  const y = Math.sqrt(Math.max(0, a * a - x * x));

  // Unit vector from hip to foot
  const ux = dx / c;
  const uy = dy / c;

  // Perpendicular unit vector (pointing forward/outward for natural knee bend)
  // We want knee to be in front of the hip-foot line
  const px = -uy;
  const py = ux;

  // Knee position (choose the "forward" solution)
  return {
    x: hip.x + ux * x + px * y,
    y: hip.y + uy * x + py * y,
  };
}

/**
 * Calculate the elbow position given shoulder, hand, and arm segment lengths.
 *
 * @param {Object} shoulder - Shoulder position {x, y}
 * @param {Object} hand - Hand position {x, y}
 * @param {number} upperArmLength - Upper arm length in pixels
 * @param {number} forearmLength - Forearm length in pixels
 * @returns {Object|null} Elbow position {x, y} or null if impossible
 */
function calculateElbowPosition(shoulder, hand, upperArmLength, forearmLength) {
  if (!shoulder || !hand) return null;

  const dx = hand.x - shoulder.x;
  const dy = hand.y - shoulder.y;
  const dist = Math.hypot(dx, dy);

  // Check if arm can reach
  if (dist > upperArmLength + forearmLength) {
    // Arm fully extended
    const ratio = upperArmLength / (upperArmLength + forearmLength);
    return {
      x: shoulder.x + dx * ratio,
      y: shoulder.y + dy * ratio,
    };
  }

  if (dist < Math.abs(upperArmLength - forearmLength)) {
    return {
      x: shoulder.x + dx * 0.5,
      y: shoulder.y + dy * 0.5,
    };
  }

  const a = upperArmLength;
  const b = forearmLength;
  const c = dist;

  const x = (a * a - b * b + c * c) / (2 * c);
  const y = Math.sqrt(Math.max(0, a * a - x * x));

  const ux = dx / c;
  const uy = dy / c;

  // Perpendicular - elbow typically bends downward/outward
  const px = uy;
  const py = -ux;

  return {
    x: shoulder.x + ux * x + px * y,
    y: shoulder.y + uy * x + py * y,
  };
}

/**
 * Calculate shoulder position from hip, given torso length and lean angle.
 *
 * @param {Object} hip - Hip position {x, y}
 * @param {Object} hand - Hand/bar position {x, y} for lean direction
 * @param {number} torsoLength - Torso length in pixels
 * @returns {Object} Shoulder position {x, y}
 */
function calculateShoulderPosition(hip, hand, torsoLength) {
  if (!hip || !hand) return null;

  // Calculate lean direction from hip toward bar
  const dx = hand.x - hip.x;
  const dy = hand.y - hip.y;
  const dist = Math.hypot(dx, dy);

  if (dist === 0) {
    // Straight up if no horizontal offset
    return { x: hip.x, y: hip.y - torsoLength };
  }

  // Lean angle - torso leans toward bar but not all the way
  // Shoulder is roughly 60-80% of the way toward the bar direction from vertical
  const leanFactor = 0.7;

  // Vertical component (up)
  const verticalY = -torsoLength * 0.85; // Mostly upward

  // Horizontal component (toward bar)
  const horizontalX = (dx / dist) * torsoLength * 0.5 * leanFactor;

  return {
    x: hip.x + horizontalX,
    y: hip.y + verticalY,
  };
}

/**
 * Calculate all skeleton joint positions.
 *
 * @param {Object} markers - Bike markers {seat, peg, bar} in pixels
 * @param {Object} measurements - Rider measurements in mm
 * @param {number} pxPerMM - Pixels per millimeter for conversion
 * @returns {Object|null} Joint positions or null if incomplete
 */
export function calculateSkeletonJoints(markers, measurements, pxPerMM) {
  if (!markers?.seat || !markers?.peg || !markers?.bar || !measurements || !pxPerMM) {
    return null;
  }

  const { seat, peg, bar } = markers;
  const { thigh, lowerLeg, torso, upperArm, forearm } = measurements;

  // Convert measurements from mm to pixels
  const thighPx = (thigh || 400) * pxPerMM;
  const lowerLegPx = (lowerLeg || 380) * pxPerMM;
  const torsoPx = (torso || 500) * pxPerMM;
  const upperArmPx = (upperArm || 320) * pxPerMM;
  const forearmPx = (forearm || 250) * pxPerMM;

  // Hip is at seat position
  const hip = { ...seat };

  // Foot is at peg position
  const foot = { ...peg };

  // Hand is at bar position
  const hand = { ...bar };

  // Calculate knee
  const knee = calculateKneePosition(hip, foot, thighPx, lowerLegPx);

  // Calculate shoulder
  const shoulder = calculateShoulderPosition(hip, hand, torsoPx);

  // Calculate elbow
  const elbow = shoulder ? calculateElbowPosition(shoulder, hand, upperArmPx, forearmPx) : null;

  // Head is above shoulder
  const headRadius = torsoPx * 0.2;
  const head = shoulder
    ? {
        x: shoulder.x,
        y: shoulder.y - headRadius * 1.5,
        radius: headRadius,
      }
    : null;

  return {
    hip,
    knee,
    foot,
    shoulder,
    elbow,
    hand,
    head,
  };
}

/**
 * Get segment color based on comfort zone status.
 *
 * @param {string} status - Zone status: 'comfort', 'warning', 'extreme'
 * @returns {string} CSS color
 */
export function getSegmentColor(status) {
  switch (status) {
    case 'comfort':
      return '#22c55e'; // green-500
    case 'warning':
      return '#f59e0b'; // amber-500
    case 'extreme':
      return '#ef4444'; // red-500
    default:
      return '#6b7280'; // gray-500
  }
}
