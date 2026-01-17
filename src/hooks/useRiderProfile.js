import { useState, useCallback, useEffect, useMemo } from 'react';
import { DEFAULT_RIDER, getEffectiveMeasurements } from '../data/bodyProportions';

const STORAGE_KEY = 'rider-triangle-profiles';

/**
 * Generate a unique profile ID
 */
function generateId() {
  return 'rider_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

/**
 * Load profiles from localStorage
 */
function loadProfiles() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to load rider profiles:', e);
  }
  return null;
}

/**
 * Save profiles to localStorage
 */
function saveProfiles(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save rider profiles:', e);
  }
}

/**
 * Hook for managing rider profiles with persistence.
 *
 * @returns {Object} Rider profile state and methods
 */
export function useRiderProfile() {
  // Initialize state from localStorage or defaults
  const [state, setState] = useState(() => {
    const saved = loadProfiles();
    if (saved?.profiles && saved?.activeId) {
      return saved;
    }

    // Create default profile
    const defaultId = generateId();
    return {
      profiles: {
        [defaultId]: {
          id: defaultId,
          ...DEFAULT_RIDER,
        },
      },
      activeId: defaultId,
    };
  });

  const { profiles, activeId } = state;

  // Persist state changes
  useEffect(() => {
    saveProfiles(state);
  }, [state]);

  // Get active profile
  const activeProfile = profiles[activeId] || Object.values(profiles)[0];

  // Get effective measurements for active profile
  const measurements = useMemo(() => {
    if (!activeProfile) return null;
    return getEffectiveMeasurements(activeProfile);
  }, [activeProfile]);

  // Create a new profile
  const createProfile = useCallback((name = 'New Rider') => {
    const id = generateId();
    setState((prev) => ({
      ...prev,
      profiles: {
        ...prev.profiles,
        [id]: {
          id,
          ...DEFAULT_RIDER,
          name,
        },
      },
      activeId: id,
    }));
    return id;
  }, []);

  // Update active profile
  const updateProfile = useCallback((updates) => {
    setState((prev) => {
      const id = prev.activeId;
      if (!prev.profiles[id]) return prev;

      return {
        ...prev,
        profiles: {
          ...prev.profiles,
          [id]: {
            ...prev.profiles[id],
            ...updates,
          },
        },
      };
    });
  }, []);

  // Update a specific override
  const setOverride = useCallback((key, value) => {
    setState((prev) => {
      const id = prev.activeId;
      if (!prev.profiles[id]) return prev;

      return {
        ...prev,
        profiles: {
          ...prev.profiles,
          [id]: {
            ...prev.profiles[id],
            overrides: {
              ...prev.profiles[id].overrides,
              [key]: value,
            },
          },
        },
      };
    });
  }, []);

  // Clear an override (use estimated value)
  const clearOverride = useCallback(
    (key) => {
      setOverride(key, null);
    },
    [setOverride]
  );

  // Set seat position
  const setSeatPosition = useCallback(
    (position) => {
      updateProfile({ seatPosition: position });
    },
    [updateProfile]
  );

  // Set height
  const setHeight = useCallback(
    (heightCm) => {
      updateProfile({ heightCm: Math.max(100, Math.min(250, heightCm)) });
    },
    [updateProfile]
  );

  // Set active profile
  const setActiveProfile = useCallback((id) => {
    setState((prev) => {
      if (!prev.profiles[id]) return prev;
      return { ...prev, activeId: id };
    });
  }, []);

  // Delete a profile
  const deleteProfile = useCallback((id) => {
    setState((prev) => {
      const profileIds = Object.keys(prev.profiles);
      if (profileIds.length <= 1) return prev; // Keep at least one

      const next = { ...prev.profiles };
      delete next[id];

      return {
        profiles: next,
        activeId: prev.activeId === id ? Object.keys(next)[0] : prev.activeId,
      };
    });
  }, []);

  // Duplicate a profile
  const duplicateProfile = useCallback((id) => {
    setState((prev) => {
      const source = prev.profiles[id];
      if (!source) return prev;

      const newId = generateId();
      return {
        ...prev,
        profiles: {
          ...prev.profiles,
          [newId]: {
            ...source,
            id: newId,
            name: `${source.name} (copy)`,
          },
        },
        activeId: newId,
      };
    });
  }, []);

  // Get all profile IDs
  const profileIds = Object.keys(profiles);

  return {
    // State
    profiles,
    activeId,
    activeProfile,
    measurements,
    profileIds,

    // Actions
    createProfile,
    updateProfile,
    setOverride,
    clearOverride,
    setSeatPosition,
    setHeight,
    setActiveProfile,
    deleteProfile,
    duplicateProfile,
  };
}
