/**
 * Geometry utilities for rider triangle calculations
 */

/**
 * Calculate Euclidean distance between two points
 * @param {{ x: number, y: number } | null} a
 * @param {{ x: number, y: number } | null} b
 * @returns {number}
 */
export function distance(a, b) {
  if (!a || !b) return 0;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

/**
 * Calculate pixels per millimeter from calibration points and known tire diameter
 * @param {{ top: { x: number, y: number } | null, bot: { x: number, y: number } | null }} calibPts
 * @param {number} tireDiameterMM
 * @returns {number}
 */
export function calculatePxPerMM(calibPts, tireDiameterMM) {
  const d = distance(calibPts.top, calibPts.bot);
  if (!d || !tireDiameterMM) return 0;
  return d / tireDiameterMM;
}

/**
 * Calculate scale factor to normalize bikeB to bikeA's px/mm ratio
 * @param {number} pxPerMM_A
 * @param {number} pxPerMM_B
 * @returns {number}
 */
export function calculateScale(pxPerMM_A, pxPerMM_B) {
  if (!pxPerMM_A || !pxPerMM_B) return 1;
  return pxPerMM_A / pxPerMM_B;
}

/**
 * Calculate translation to align bikeB's axle with bikeA's axle after scaling
 * @param {{ x: number, y: number } | null} axleA
 * @param {{ x: number, y: number } | null} axleB
 * @param {number} scale
 * @returns {{ x: number, y: number }}
 */
export function calculateTranslation(axleA, axleB, scale) {
  if (!axleA || !axleB) return { x: 0, y: 0 };
  const scaledBx = axleB.x * scale;
  const scaledBy = axleB.y * scale;
  return {
    x: axleA.x - scaledBx,
    y: axleA.y - scaledBy,
  };
}

/**
 * Calculate distance in millimeters between two marker points
 * @param {{ x: number, y: number } | null} pointA
 * @param {{ x: number, y: number } | null} pointB
 * @param {number} pxPerMM
 * @returns {number}
 */
export function distanceInMM(pointA, pointB, pxPerMM) {
  if (!pxPerMM) return 0;
  const px = distance(pointA, pointB);
  return px / pxPerMM;
}

/**
 * Calculate angle at vertex B given three points A, B, C
 * Returns angle in degrees
 * @param {{ x: number, y: number }} a
 * @param {{ x: number, y: number }} vertex
 * @param {{ x: number, y: number }} c
 * @returns {number}
 */
export function angleBetween(a, vertex, c) {
  if (!a || !vertex || !c) return 0;

  const ba = { x: a.x - vertex.x, y: a.y - vertex.y };
  const bc = { x: c.x - vertex.x, y: c.y - vertex.y };

  const dotProduct = ba.x * bc.x + ba.y * bc.y;
  const magnitudeBA = Math.hypot(ba.x, ba.y);
  const magnitudeBC = Math.hypot(bc.x, bc.y);

  if (magnitudeBA === 0 || magnitudeBC === 0) return 0;

  const cosAngle = dotProduct / (magnitudeBA * magnitudeBC);
  // Clamp to [-1, 1] to handle floating point errors
  const clampedCos = Math.max(-1, Math.min(1, cosAngle));

  return Math.acos(clampedCos) * (180 / Math.PI);
}
