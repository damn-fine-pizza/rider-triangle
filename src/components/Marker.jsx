import { useEffect, useRef } from 'react';

/**
 * Draggable marker component for placing points on images.
 * Fixed drag logic: uses delta from initial click position.
 */
export function Marker({ x, y, color, label, onDrag }) {
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

      // Calculate delta from initial mouse position
      const deltaX = clientX - startMouseX;
      const deltaY = clientY - startMouseY;

      // New position = start position + delta
      const newX = startX + deltaX;
      const newY = startY + deltaY;

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
  }, [x, y, onDrag]);

  return (
    <div
      ref={ref}
      className="absolute -translate-x-1/2 -translate-y-1/2 select-none cursor-grab active:cursor-grabbing z-10"
      style={{ left: x, top: y }}
    >
      <div
        className="w-4 h-4 rounded-full shadow-md border-2 border-white"
        title={label}
        style={{ background: color }}
      />
      <div className="text-xs mt-1 px-1 py-0.5 rounded bg-white/90 border shadow-sm whitespace-nowrap font-medium">
        {label}
      </div>
    </div>
  );
}
