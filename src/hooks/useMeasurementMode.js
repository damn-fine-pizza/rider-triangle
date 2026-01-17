import { useState, useCallback, useMemo } from 'react';

/**
 * Hook to manage measurement mode (Photo vs Manual) per bike.
 *
 * Manual mode allows users to input exact measurements when they have
 * physical access to the bike, bypassing photo-based estimation.
 */
export function useMeasurementMode() {
  // Mode per bike: 'photo' | 'manual'
  const [modes, setModes] = useState({});

  // Manual measurements per bike (all in mm)
  const [manualMeasurements, setManualMeasurements] = useState({});

  /**
   * Set mode for a bike
   */
  const setMode = useCallback((bikeKey, mode) => {
    setModes(prev => ({ ...prev, [bikeKey]: mode }));
  }, []);

  /**
   * Get mode for a bike (default: 'photo')
   */
  const getMode = useCallback((bikeKey) => {
    return modes[bikeKey] || 'photo';
  }, [modes]);

  /**
   * Set a manual measurement for a bike
   *
   * Available measurements:
   * - seatHeight: vertical from ground to seat
   * - seatToPegHorizontal: horizontal distance seat to peg
   * - seatToPegVertical: vertical distance seat to peg (seat higher = positive)
   * - seatToBarHorizontal: horizontal reach from seat to bar
   * - seatToBarVertical: vertical drop from seat to bar (bar lower = positive)
   */
  const setMeasurement = useCallback((bikeKey, field, value) => {
    setManualMeasurements(prev => ({
      ...prev,
      [bikeKey]: {
        ...prev[bikeKey],
        [field]: value === '' ? null : Number(value),
      },
    }));
  }, []);

  /**
   * Get manual measurements for a bike
   */
  const getMeasurements = useCallback((bikeKey) => {
    return manualMeasurements[bikeKey] || {};
  }, [manualMeasurements]);

  /**
   * Calculate derived marker positions from manual measurements.
   * Returns virtual marker positions that can be used for angle calculations.
   *
   * We use a coordinate system where:
   * - Origin is at seat position
   * - X increases to the right (forward on bike)
   * - Y increases downward
   */
  const getVirtualMarkers = useCallback((bikeKey) => {
    const m = manualMeasurements[bikeKey];
    if (!m) return null;

    const { seatToPegHorizontal, seatToPegVertical, seatToBarHorizontal, seatToBarVertical } = m;

    // Need at least peg and bar positions relative to seat
    if (seatToPegHorizontal == null || seatToPegVertical == null ||
        seatToBarHorizontal == null || seatToBarVertical == null) {
      return null;
    }

    // Virtual coordinate system (arbitrary origin, consistent scale)
    // Seat at origin
    const seat = { x: 500, y: 300 };

    // Peg is behind (negative X) and below (positive Y) seat
    const peg = {
      x: seat.x - seatToPegHorizontal,
      y: seat.y + seatToPegVertical,
    };

    // Bar is in front (positive X) and above or below seat
    const bar = {
      x: seat.x + seatToBarHorizontal,
      y: seat.y - seatToBarVertical, // negative because bar is typically above or at seat level
    };

    return { seat, peg, bar };
  }, [manualMeasurements]);

  /**
   * Get distances in mm from manual measurements.
   * These are calculated directly from inputs, not from virtual markers.
   */
  const getDistances = useCallback((bikeKey) => {
    const m = manualMeasurements[bikeKey];
    if (!m) return { seatPeg: null, seatBar: null, pegBar: null };

    const { seatToPegHorizontal, seatToPegVertical, seatToBarHorizontal, seatToBarVertical } = m;

    let seatPeg = null;
    let seatBar = null;
    let pegBar = null;

    // Calculate seat-peg distance (hypotenuse)
    if (seatToPegHorizontal != null && seatToPegVertical != null) {
      seatPeg = Math.hypot(seatToPegHorizontal, seatToPegVertical);
    }

    // Calculate seat-bar distance (hypotenuse)
    if (seatToBarHorizontal != null && seatToBarVertical != null) {
      seatBar = Math.hypot(seatToBarHorizontal, seatToBarVertical);
    }

    // Calculate peg-bar distance
    if (seatToPegHorizontal != null && seatToPegVertical != null &&
        seatToBarHorizontal != null && seatToBarVertical != null) {
      const pegToBarH = seatToPegHorizontal + seatToBarHorizontal;
      const pegToBarV = seatToPegVertical + seatToBarVertical;
      pegBar = Math.hypot(pegToBarH, pegToBarV);
    }

    return { seatPeg, seatBar, pegBar };
  }, [manualMeasurements]);

  /**
   * Check if manual measurements are complete for a bike
   */
  const isComplete = useCallback((bikeKey) => {
    const m = manualMeasurements[bikeKey];
    if (!m) return false;

    return (
      m.seatToPegHorizontal != null &&
      m.seatToPegVertical != null &&
      m.seatToBarHorizontal != null &&
      m.seatToBarVertical != null
    );
  }, [manualMeasurements]);

  /**
   * Reset measurements for a bike
   */
  const resetBike = useCallback((bikeKey) => {
    setModes(prev => {
      const next = { ...prev };
      delete next[bikeKey];
      return next;
    });
    setManualMeasurements(prev => {
      const next = { ...prev };
      delete next[bikeKey];
      return next;
    });
  }, []);

  return {
    modes,
    manualMeasurements,
    setMode,
    getMode,
    setMeasurement,
    getMeasurements,
    getVirtualMarkers,
    getDistances,
    isComplete,
    resetBike,
  };
}
