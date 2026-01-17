import { useState, useCallback, useMemo } from 'react';
import { distanceInMM } from '../utils/geometry';

/**
 * Marker types for rider triangle
 */
export const MARKER_TYPES = ['seat', 'peg', 'bar'];

/**
 * Hook for managing rider triangle markers for multiple bikes.
 *
 * @param {string[]} bikeKeys - Array of bike identifiers
 * @returns {Object} Markers state and methods
 */
export function useMarkers(bikeKeys) {
  // Markers (seat, peg, bar) per bike
  const [markers, setMarkers] = useState(
    bikeKeys.reduce(
      (acc, key) => ({
        ...acc,
        [key]: { seat: null, peg: null, bar: null },
      }),
      {}
    )
  );

  // Set a specific marker position
  const setMarker = useCallback((bikeKey, markerType, position) => {
    setMarkers((s) => ({
      ...s,
      [bikeKey]: { ...s[bikeKey], [markerType]: position },
    }));
  }, []);

  // Reset all markers for a specific bike
  const resetBike = useCallback((bikeKey) => {
    setMarkers((s) => ({
      ...s,
      [bikeKey]: { seat: null, peg: null, bar: null },
    }));
  }, []);

  // Reset all markers
  const resetAll = useCallback(() => {
    setMarkers(
      bikeKeys.reduce(
        (acc, key) => ({
          ...acc,
          [key]: { seat: null, peg: null, bar: null },
        }),
        {}
      )
    );
  }, [bikeKeys]);

  // Check if all markers are placed for a bike
  const hasAllMarkers = useCallback(
    (bikeKey) => {
      const m = markers[bikeKey];
      return m && m.seat && m.peg && m.bar;
    },
    [markers]
  );

  // Calculate distances between markers in mm
  const getDistances = useCallback(
    (bikeKey, pxPerMM) => {
      const m = markers[bikeKey];
      if (!m) return { seatPeg: 0, seatBar: 0, pegBar: 0 };

      return {
        seatPeg: distanceInMM(m.seat, m.peg, pxPerMM),
        seatBar: distanceInMM(m.seat, m.bar, pxPerMM),
        pegBar: distanceInMM(m.peg, m.bar, pxPerMM),
      };
    },
    [markers]
  );

  return {
    markers,
    setMarker,
    resetBike,
    resetAll,
    hasAllMarkers,
    getDistances,
  };
}
