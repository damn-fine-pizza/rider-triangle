import { useEffect, useRef } from 'react';

/**
 * Draggable marker component for placing points on images.
 * Supports scaled containers via the scale prop.
 *
 * @param {number} x - X position in local coordinates
 * @param {number} y - Y position in local coordinates
 * @param {string} color - Marker color
 * @param {string} label - Marker label
 * @param {function} onDrag - Callback with (newX, newY) in local coordinates
 * @param {number} scale - Scale factor of the parent container (default 1)
 */
export function Marker({ x, y, color, label, onDrag, scale = 1 }) {
  const ref = useRef(null);
  const dragState = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    startMouseX: 0,
    startMouseY: 0,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const getClientPos = (e) => {
      if (e.touches && e.touches[0]) {
        return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
      }
      return { clientX: e.clientX, clientY: e.clientY };
    };

    const down = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const { clientX, clientY } = getClientPos(e);

      dragState.current = {
        dragging: true,
        startX: x,
        startY: y,
        startMouseX: clientX,
        startMouseY: clientY,
      };

      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
      window.addEventListener('touchmove', move, { passive: false });
      window.addEventListener('touchend', up);
    };

    const move = (e) => {
      if (!dragState.current.dragging) return;
      e.preventDefault();

      const { clientX, clientY } = getClientPos(e);
      const { startX, startY, startMouseX, startMouseY } = dragState.current;

      // Calculate delta from initial mouse position (in screen pixels)
      const deltaX = clientX - startMouseX;
      const deltaY = clientY - startMouseY;

      // Convert screen delta to local coordinates by dividing by scale
      const localDeltaX = deltaX / scale;
      const localDeltaY = deltaY / scale;

      // New position = start position + local delta
      const newX = startX + localDeltaX;
      const newY = startY + localDeltaY;

      onDrag && onDrag(newX, newY);
    };

    const up = () => {
      dragState.current.dragging = false;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };

    el.addEventListener('mousedown', down);
    el.addEventListener('touchstart', down, { passive: false });

    return () => {
      el.removeEventListener('mousedown', down);
      el.removeEventListener('touchstart', down);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [x, y, onDrag, scale]);

  return (
    <div
      ref={ref}
      className="absolute -translate-x-1/2 -translate-y-1/2 select-none cursor-grab active:cursor-grabbing z-10 group"
      style={{ left: x, top: y }}
      role="button"
      aria-label={`Drag ${label} marker`}
      tabIndex={0}
    >
      {/* Invisible larger touch target for mobile (44x44px min recommended) */}
      <div className="absolute -inset-4 rounded-full" aria-hidden="true" />
      {/* Visual marker */}
      <div
        className="w-4 h-4 rounded-full shadow-md border-2 border-white transition-transform group-hover:scale-125 group-active:scale-110"
        title={label}
        style={{ background: color }}
      />
      <div className="text-xs mt-1 px-1 py-0.5 rounded bg-[--bg-card]/90 border border-[--border-color] shadow-sm whitespace-nowrap font-medium pointer-events-none">
        {label}
      </div>
    </div>
  );
}
