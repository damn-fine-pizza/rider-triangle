import { useState, useMemo, useCallback } from 'react';
import { calculatePxPerMM, calculateScale, calculateTranslation } from '../utils/geometry';
import { outerDiameterMM } from '../utils/tire';

/**
 * Hook for managing calibration state for multiple bikes.
 * Handles wheel selection, calibration points, axle positions, and derived calculations.
 *
 * @param {Object} bikes - Bike configurations with tire specs
 * @returns {Object} Calibration state and methods
 */
export function useCalibration(bikes) {
  const bikeKeys = Object.keys(bikes);
  const [primaryBike] = bikeKeys; // First bike is the reference

  // Wheel choice per bike (front or rear)
  const [wheelChoice, setWheelChoice] = useState(
    bikeKeys.reduce((acc, key) => ({ ...acc, [key]: 'rear' }), {})
  );

  // Calibration points (top and bottom of wheel) per bike
  const [calibPts, setCalibPts] = useState(
    bikeKeys.reduce((acc, key) => ({ ...acc, [key]: { top: null, bot: null } }), {})
  );

  // Rear axle center position per bike
  const [axle, setAxle] = useState(bikeKeys.reduce((acc, key) => ({ ...acc, [key]: null }), {}));

  // Calculate outer diameter for each bike based on wheel choice
  const outerDiameters = useMemo(() => {
    return bikeKeys.reduce((acc, key) => {
      const wheel = wheelChoice[key];
      const tireSpec = bikes[key]?.tires?.[wheel];
      acc[key] = tireSpec ? (outerDiameterMM(tireSpec) ?? 0) : 0;
      return acc;
    }, {});
  }, [bikes, wheelChoice, bikeKeys]);

  // Calculate px/mm ratio for each bike
  const pxPerMM = useMemo(() => {
    return bikeKeys.reduce((acc, key) => {
      acc[key] = calculatePxPerMM(calibPts[key], outerDiameters[key]);
      return acc;
    }, {});
  }, [calibPts, outerDiameters, bikeKeys]);

  // Calculate scale factors relative to primary bike
  const scales = useMemo(() => {
    return bikeKeys.reduce((acc, key) => {
      acc[key] = key === primaryBike ? 1 : calculateScale(pxPerMM[primaryBike], pxPerMM[key]);
      return acc;
    }, {});
  }, [pxPerMM, primaryBike, bikeKeys]);

  // Calculate translations to align axles with primary bike
  const translations = useMemo(() => {
    return bikeKeys.reduce((acc, key) => {
      if (key === primaryBike) {
        acc[key] = { x: 0, y: 0 };
      } else {
        acc[key] = calculateTranslation(axle[primaryBike], axle[key], scales[key]);
      }
      return acc;
    }, {});
  }, [axle, scales, primaryBike, bikeKeys]);

  // Check if calibration is complete for all bikes
  const isCalibrated = useMemo(() => {
    return bikeKeys.every((key) => calibPts[key].top && calibPts[key].bot && axle[key]);
  }, [calibPts, axle, bikeKeys]);

  // Set wheel choice for a bike
  const setWheel = useCallback((bikeKey, wheel) => {
    setWheelChoice((s) => ({ ...s, [bikeKey]: wheel }));
  }, []);

  // Set calibration point (top or bottom)
  const setCalibPoint = useCallback((bikeKey, pointType, position) => {
    setCalibPts((s) => ({
      ...s,
      [bikeKey]: { ...s[bikeKey], [pointType]: position },
    }));
  }, []);

  // Set axle position
  const setAxlePosition = useCallback((bikeKey, position) => {
    setAxle((s) => ({ ...s, [bikeKey]: position }));
  }, []);

  // Reset calibration for a specific bike
  const resetBike = useCallback((bikeKey) => {
    setCalibPts((s) => ({ ...s, [bikeKey]: { top: null, bot: null } }));
    setAxle((s) => ({ ...s, [bikeKey]: null }));
  }, []);

  // Reset all calibration
  const resetAll = useCallback(() => {
    setCalibPts(bikeKeys.reduce((acc, key) => ({ ...acc, [key]: { top: null, bot: null } }), {}));
    setAxle(bikeKeys.reduce((acc, key) => ({ ...acc, [key]: null }), {}));
  }, [bikeKeys]);

  return {
    // State
    wheelChoice,
    calibPts,
    axle,

    // Derived values
    outerDiameters,
    pxPerMM,
    scales,
    translations,
    isCalibrated,
    primaryBike,

    // Actions
    setWheel,
    setCalibPoint,
    setAxlePosition,
    resetBike,
    resetAll,
  };
}
