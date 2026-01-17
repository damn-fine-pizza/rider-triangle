import { useEffect, useRef } from 'react';

/**
 * Small draggable marker for calibration points (TOP/BOTTOM of wheel).
 * Similar to Marker but smaller and with different styling.
 */
export function CalibrationMarker({ x, y, color, label, onDrag, scale = 1 }) {
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

      const deltaX = clientX - startMouseX;
      const deltaY = clientY - startMouseY;

      const localDeltaX = deltaX / scale;
      const localDeltaY = deltaY / scale;

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
      className="absolute -translate-x-1/2 -translate-y-1/2 select-none cursor-grab active:cursor-grabbing z-10"
      style={{ left: x, top: y }}
    >
      {/* Small crosshair marker */}
      <div className="relative">
        {/* Center dot */}
        <div
          className="w-2.5 h-2.5 rounded-full border border-white shadow-sm"
          style={{ background: color }}
        />
        {/* Crosshair lines */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-px h-3 -top-1"
          style={{ background: color }}
        />
        <div
          className="absolute left-1/2 -translate-x-1/2 w-px h-3 -bottom-1"
          style={{ background: color }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-px w-3 -left-1"
          style={{ background: color }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-px w-3 -right-1"
          style={{ background: color }}
        />
      </div>
      {/* Label */}
      <div
        className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] px-1 py-0.5 rounded bg-white/90 border shadow-sm whitespace-nowrap font-medium"
        style={{ color }}
      >
        {label}
      </div>
    </div>
  );
}
