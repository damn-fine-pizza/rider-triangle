import { useState, useCallback, useEffect } from 'react';
import { loadState, saveState } from '../utils/storage';
import { getImageUrl } from '../data/imageProvider';
import { compressImage } from '../utils/imageCompression';
import * as imageDB from '../utils/indexedDB';

// Default bikes to show on first load (without uploaded images)
const DEFAULT_BIKES = {
  vstrom: {
    id: 'vstrom',
    label: 'V-Strom 1050 SE',
    color: '#ef6c00',
    img: getImageUrl('vstrom'),
    tires: {
      front: '110/80 R19',
      rear: '150/70 R17',
    },
    isDefault: true,
  },
  gsx: {
    id: 'gsx',
    label: 'GSX-S1000GX',
    color: '#1976d2',
    img: getImageUrl('gsx'),
    tires: {
      front: '120/70 ZR17M/C',
      rear: '190/50 ZR17M/C',
    },
    isDefault: true,
  },
};

// Preset colors for new bikes
const BIKE_COLORS = [
  '#ef6c00', // orange
  '#1976d2', // blue
  '#388e3c', // green
  '#7b1fa2', // purple
  '#c62828', // red
  '#00838f', // teal
  '#6d4c41', // brown
  '#455a64', // blue-grey
];

/**
 * Generate a unique bike ID
 */
function generateId() {
  return 'bike_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

/**
 * Get next available color
 */
function getNextColor(bikes) {
  const usedColors = Object.values(bikes).map((b) => b.color);
  return BIKE_COLORS.find((c) => !usedColors.includes(c)) || BIKE_COLORS[0];
}

/**
 * Hook for managing dynamic bike collection with persistence.
 * Supports adding, removing, updating bikes and uploading images.
 *
 * @returns {Object} Bike store state and methods
 */
export function useBikeStore() {
  const [bikes, setBikes] = useState(() => {
    const saved = loadState();
    if (saved?.bikes && Object.keys(saved.bikes).length > 0) {
      return saved.bikes;
    }
    return DEFAULT_BIKES;
  });

  const [activeSlots, setActiveSlots] = useState(() => {
    const saved = loadState();
    if (saved?.activeSlots?.length === 2) {
      return saved.activeSlots;
    }
    return ['vstrom', 'gsx'];
  });

  // Persist state changes
  useEffect(() => {
    saveState({ bikes, activeSlots });
  }, [bikes, activeSlots]);

  // Get the two bikes currently being compared
  const activeBikes = activeSlots.reduce((acc, id) => {
    if (bikes[id]) {
      acc[id] = bikes[id];
    }
    return acc;
  }, {});

  // Add a new bike
  const addBike = useCallback(async (file, label) => {
    const id = generateId();
    let img = null;

    if (file) {
      // Compress image before storing
      img = await compressImage(file);

      // Store in IndexedDB if supported
      if (imageDB.isSupported()) {
        try {
          await imageDB.setItem(`img_${id}`, img);
        } catch (e) {
          console.warn('IndexedDB storage failed, using inline:', e);
        }
      }
    }

    setBikes((prev) => ({
      ...prev,
      [id]: {
        id,
        label: label || 'New Bike',
        color: getNextColor(prev),
        img,
        tires: {
          front: '',
          rear: '',
        },
        isDefault: false,
      },
    }));

    return id;
  }, []);

  // Update bike properties
  const updateBike = useCallback((id, updates) => {
    setBikes((prev) => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: {
          ...prev[id],
          ...updates,
        },
      };
    });
  }, []);

  // Update bike image
  const updateBikeImage = useCallback(
    async (id, file) => {
      // Compress image before storing
      const img = await compressImage(file);

      // Store in IndexedDB if supported
      if (imageDB.isSupported()) {
        try {
          await imageDB.setItem(`img_${id}`, img);
        } catch (e) {
          console.warn('IndexedDB storage failed, using inline:', e);
        }
      }

      updateBike(id, { img });
    },
    [updateBike]
  );

  // Update bike tire spec
  const updateBikeTire = useCallback((id, wheel, spec) => {
    setBikes((prev) => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: {
          ...prev[id],
          tires: {
            ...prev[id].tires,
            [wheel]: spec,
          },
        },
      };
    });
  }, []);

  // Remove a bike
  const removeBike = useCallback(async (id) => {
    // Remove image from IndexedDB
    if (imageDB.isSupported()) {
      try {
        await imageDB.removeItem(`img_${id}`);
      } catch (e) {
        console.warn('Failed to remove image from IndexedDB:', e);
      }
    }

    setBikes((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    // If removed bike was in active slots, clear that slot
    setActiveSlots((prev) => prev.map((slotId) => (slotId === id ? null : slotId)));
  }, []);

  // Set active slot (which bike goes in slot 0 or 1)
  const setActiveSlot = useCallback((slotIndex, bikeId) => {
    setActiveSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = bikeId;
      return next;
    });
  }, []);

  // Reset to default bikes
  const resetToDefaults = useCallback(() => {
    setBikes(DEFAULT_BIKES);
    setActiveSlots(['vstrom', 'gsx']);
  }, []);

  // Get all bike IDs
  const bikeIds = Object.keys(bikes);

  return {
    // State
    bikes,
    activeBikes,
    activeSlots,
    bikeIds,

    // Actions
    addBike,
    updateBike,
    updateBikeImage,
    updateBikeTire,
    removeBike,
    setActiveSlot,
    resetToDefaults,
  };
}
