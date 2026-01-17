import { getImageUrl } from './imageProvider';

// Static bike data (without image URLs)
const BIKES_DATA = {
  vstrom: {
    label: "V-Strom 1050 SE",
    color: "#ef6c00",
    tires: {
      front: "110/80 R19",
      rear: "150/70 R17",
    },
  },
  gsx: {
    label: "GSX-S1000GX",
    color: "#1976d2",
    tires: {
      front: "120/70 ZR17M/C",
      rear: "190/50 ZR17M/C",
    },
  },
};

// Getter that resolves images through the provider
export function getBike(key) {
  const bike = BIKES_DATA[key];
  if (!bike) return null;
  return {
    ...bike,
    img: getImageUrl(key),
  };
}

// For compatibility with existing code that iterates over BIKES
export function getAllBikes() {
  return Object.keys(BIKES_DATA).reduce((acc, key) => {
    acc[key] = getBike(key);
    return acc;
  }, {});
}

// Static export for quick access (resolves images at import time)
export const BIKES = getAllBikes();
