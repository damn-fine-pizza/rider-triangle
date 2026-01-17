import { describe, it, expect } from 'vitest';
import {
  calculateKneeAngle,
  calculateHipAngle,
  calculateBackAngle,
  calculateArmAngle,
  calculateAllAngles,
  calculateAllAnglesFromDistances,
} from './ergonomics';

describe('calculateKneeAngle', () => {
  it('returns null for missing inputs', () => {
    expect(calculateKneeAngle(null, 400, 380)).toBeNull();
    expect(calculateKneeAngle(500, null, 380)).toBeNull();
    expect(calculateKneeAngle(500, 400, null)).toBeNull();
  });

  it('returns 180 when leg is fully extended', () => {
    // Seat-peg distance > thigh + lower leg
    expect(calculateKneeAngle(1000, 400, 380)).toBe(180);
  });

  it('calculates correct angle for typical riding position', () => {
    // Typical values: thigh 400mm, lower leg 380mm, seat-peg ~600mm
    const angle = calculateKneeAngle(600, 400, 380);
    expect(angle).toBeGreaterThan(100);
    expect(angle).toBeLessThan(160);
  });

  it('returns smaller angle when seat-peg is shorter', () => {
    const longDistance = calculateKneeAngle(650, 400, 380);
    const shortDistance = calculateKneeAngle(550, 400, 380);
    expect(shortDistance).toBeLessThan(longDistance);
  });
});

describe('calculateHipAngle', () => {
  it('returns null for missing inputs', () => {
    expect(calculateHipAngle(null, { x: 0, y: 100 }, { x: 100, y: 0 }, 500)).toBeNull();
    expect(calculateHipAngle({ x: 0, y: 0 }, null, { x: 100, y: 0 }, 500)).toBeNull();
  });

  it('calculates angle between torso and thigh vectors', () => {
    const seat = { x: 100, y: 100 };
    const peg = { x: 50, y: 200 }; // Below and behind seat
    const bar = { x: 200, y: 50 }; // In front and above seat

    const angle = calculateHipAngle(seat, peg, bar, 500);
    expect(angle).toBeGreaterThan(60);
    expect(angle).toBeLessThan(180);
  });
});

describe('calculateBackAngle', () => {
  it('returns null for missing inputs', () => {
    expect(calculateBackAngle(null, { x: 100, y: 0 })).toBeNull();
    expect(calculateBackAngle({ x: 0, y: 0 }, null)).toBeNull();
  });

  it('returns ~0 when bar is directly above seat', () => {
    const angle = calculateBackAngle({ x: 100, y: 100 }, { x: 100, y: 50 });
    expect(angle).toBeLessThan(10);
  });

  it('returns larger angle for sport position (bar forward)', () => {
    const upright = calculateBackAngle({ x: 100, y: 100 }, { x: 120, y: 50 });
    const sport = calculateBackAngle({ x: 100, y: 100 }, { x: 200, y: 80 });
    expect(sport).toBeGreaterThan(upright);
  });
});

describe('calculateArmAngle', () => {
  it('returns null for missing inputs', () => {
    expect(calculateArmAngle(null, 320, 250)).toBeNull();
  });

  it('returns 180 when arms fully extended', () => {
    expect(calculateArmAngle(1000, 320, 250)).toBe(180);
  });

  it('calculates reasonable angle for typical reach', () => {
    const angle = calculateArmAngle(500, 320, 250, 100);
    expect(angle).toBeGreaterThan(45);
    expect(angle).toBeLessThan(180);
  });
});

describe('calculateAllAngles', () => {
  it('returns null angles when missing data', () => {
    const result = calculateAllAngles(null, null, null);
    expect(result.knee).toBeNull();
    expect(result.hip).toBeNull();
    expect(result.back).toBeNull();
    expect(result.arm).toBeNull();
  });

  it('calculates all angles with complete data', () => {
    const markers = {
      seat: { x: 100, y: 100 },
      peg: { x: 50, y: 200 },
      bar: { x: 200, y: 80 },
    };
    const measurements = {
      thigh: 400,
      lowerLeg: 380,
      torso: 500,
      upperArm: 320,
      forearm: 250,
    };
    const pxPerMM = 0.5;

    const result = calculateAllAngles(markers, measurements, pxPerMM);

    expect(result.knee).not.toBeNull();
    expect(result.hip).not.toBeNull();
    expect(result.back).not.toBeNull();
    expect(result.arm).not.toBeNull();
  });
});

describe('calculateAllAnglesFromDistances', () => {
  it('returns null angles when missing data', () => {
    const result = calculateAllAnglesFromDistances(null, null, null);
    expect(result.knee).toBeNull();
    expect(result.arm).toBeNull();
  });

  it('calculates angles from manual measurements', () => {
    const distances = { seatPeg: 600, seatBar: 500 };
    const manualMeasurements = {
      seatToPegHorizontal: 200,
      seatToPegVertical: 400,
      seatToBarHorizontal: 400,
      seatToBarVertical: 100,
    };
    const riderMeasurements = {
      thigh: 400,
      lowerLeg: 380,
      torso: 500,
      upperArm: 320,
      forearm: 250,
    };

    const result = calculateAllAnglesFromDistances(
      distances,
      manualMeasurements,
      riderMeasurements
    );

    expect(result.knee).not.toBeNull();
    expect(result.hip).not.toBeNull();
    expect(result.back).not.toBeNull();
    expect(result.arm).not.toBeNull();
  });
});
