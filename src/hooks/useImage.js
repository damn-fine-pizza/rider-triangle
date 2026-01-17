import { useRef, useState } from 'react';

/**
 * Hook for loading images and tracking their natural dimensions
 * @param {string} src - Image source URL
 * @returns {{ ref: React.RefObject, size: { w: number, h: number }, onLoad: Function }}
 */
export function useImage(_src) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const ref = useRef(null);
  return {
    ref,
    size,
    onLoad: (e) => {
      const el = e.currentTarget;
      setSize({ w: el.naturalWidth, h: el.naturalHeight });
    },
  };
}
