/**
 * Comfort zone definitions for ergonomic angles.
 *
 * Each angle has three zones:
 * - comfort: Ideal range for most riders
 * - warning: Acceptable but may cause discomfort on long rides
 * - extreme: May cause strain or injury over time
 *
 * Values are based on motorcycle ergonomics research and bike fitting practices.
 */

export const COMFORT_ZONES = {
  knee: {
    label: 'Knee',
    description: 'Angle at the knee when foot is on peg',
    unit: '°',
    comfort: { min: 140, max: 155 },
    warning: { min: 130, max: 165 },
    // Outside warning range is extreme
    idealText: '140°-155° (slightly bent)',
    lowText: 'Too bent - may cause knee strain',
    highText: 'Too extended - less control, shock absorption',
  },

  hip: {
    label: 'Hip',
    description: 'Angle between torso and thigh',
    unit: '°',
    comfort: { min: 90, max: 120 },
    warning: { min: 80, max: 135 },
    idealText: '90°-120° (open angle = comfort)',
    lowText: 'Too closed - hip flexor strain, breathing restriction',
    highText: 'Very open - unusual, check measurements',
  },

  back: {
    label: 'Back',
    description: 'Torso lean from vertical',
    unit: '°',
    comfort: { min: 15, max: 45 },
    warning: { min: 5, max: 60 },
    idealText: '15°-45° (touring: 15-30°, sport: 35-50°)',
    lowText: 'Very upright - cruiser position',
    highText: 'Aggressive lean - wrist/neck strain risk',
  },

  arm: {
    label: 'Arm',
    description: 'Angle at the elbow when gripping bars',
    unit: '°',
    comfort: { min: 150, max: 170 },
    warning: { min: 135, max: 175 },
    idealText: '150°-170° (slight bend)',
    lowText: 'Too bent - reach too short',
    highText: 'Nearly locked - shock transmitted to shoulders',
  },
};

/**
 * Riding style presets that adjust comfort zone interpretation.
 */
export const RIDING_STYLES = {
  touring: {
    label: 'Touring',
    description: 'Long-distance comfort priority',
    adjustments: {
      back: { comfort: { min: 10, max: 35 } },
      hip: { comfort: { min: 95, max: 130 } },
    },
  },
  sport: {
    label: 'Sport',
    description: 'Performance priority, aggressive position',
    adjustments: {
      back: { comfort: { min: 35, max: 55 } },
      hip: { comfort: { min: 75, max: 110 } },
    },
  },
  adventure: {
    label: 'Adventure',
    description: 'Versatile, standing capability',
    adjustments: {
      knee: { comfort: { min: 135, max: 150 } },
      back: { comfort: { min: 20, max: 40 } },
    },
  },
  commute: {
    label: 'Commute',
    description: 'Balanced comfort and control',
    // Uses default comfort zones
    adjustments: {},
  },
};

/**
 * Get the zone status for an angle value.
 *
 * @param {string} angleType - One of: knee, hip, back, arm
 * @param {number|null} value - Angle value in degrees
 * @param {string} ridingStyle - Optional riding style for adjusted zones
 * @returns {Object} Zone status with color and message
 */
export function getAngleZone(angleType, value, ridingStyle = 'commute') {
  if (value === null || value === undefined || isNaN(value)) {
    return {
      status: 'unknown',
      color: 'gray',
      message: 'Not calculated',
    };
  }

  const baseZone = COMFORT_ZONES[angleType];
  if (!baseZone) {
    return { status: 'unknown', color: 'gray', message: 'Unknown angle type' };
  }

  // Apply riding style adjustments if any
  const style = RIDING_STYLES[ridingStyle];
  const adjustments = style?.adjustments?.[angleType] || {};
  const comfort = adjustments.comfort || baseZone.comfort;
  const warning = adjustments.warning || baseZone.warning;

  // Check zones
  if (value >= comfort.min && value <= comfort.max) {
    return {
      status: 'comfort',
      color: 'green',
      colorClass: 'text-green-600 bg-green-50',
      message: baseZone.idealText,
    };
  }

  if (value >= warning.min && value <= warning.max) {
    const isLow = value < comfort.min;
    return {
      status: 'warning',
      color: 'yellow',
      colorClass: 'text-amber-600 bg-amber-50',
      message: isLow ? baseZone.lowText : baseZone.highText,
    };
  }

  // Extreme zone
  const isLow = value < warning.min;
  return {
    status: 'extreme',
    color: 'red',
    colorClass: 'text-red-600 bg-red-50',
    message: isLow ? baseZone.lowText : baseZone.highText,
  };
}

/**
 * Get a summary of all angle zones.
 *
 * @param {Object} angles - Object with knee, hip, back, arm values
 * @param {string} ridingStyle - Riding style for zone calculation
 * @returns {Object} Summary with counts and overall status
 */
export function getAnglesSummary(angles, ridingStyle = 'commute') {
  const zones = {
    knee: getAngleZone('knee', angles.knee, ridingStyle),
    hip: getAngleZone('hip', angles.hip, ridingStyle),
    back: getAngleZone('back', angles.back, ridingStyle),
    arm: getAngleZone('arm', angles.arm, ridingStyle),
  };

  const counts = {
    comfort: 0,
    warning: 0,
    extreme: 0,
    unknown: 0,
  };

  Object.values(zones).forEach((z) => {
    counts[z.status]++;
  });

  // Overall status is the worst status
  let overall = 'comfort';
  if (counts.extreme > 0) overall = 'extreme';
  else if (counts.warning > 0) overall = 'warning';
  else if (counts.unknown === 4) overall = 'unknown';

  return {
    zones,
    counts,
    overall,
  };
}
