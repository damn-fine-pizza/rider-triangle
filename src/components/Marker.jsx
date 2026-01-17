import { useEffect, useRef } from 'react';

export function Marker({ x, y, color, label, onDrag }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let dragging = false;
    let ox = 0, oy = 0;

    const down = (e) => {
      e.preventDefault();
      dragging = true;
      ox = e.clientX - el.offsetLeft;
      oy = e.clientY - el.offsetTop;
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
      window.addEventListener("touchmove", moveTouch, { passive: false });
      window.addEventListener("touchend", up);
    };

    const move = (e) => {
      if (!dragging) return;
      const nx = e.clientX - ox;
      const ny = e.clientY - oy;
      onDrag && onDrag(nx, ny);
    };

    const moveTouch = (e) => {
      if (!dragging) return;
      if (!e.touches || !e.touches[0]) return;
      const t = e.touches[0];
      const nx = t.clientX - ox;
      const ny = t.clientY - oy;
      onDrag && onDrag(nx, ny);
    };

    const up = () => {
      dragging = false;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", moveTouch);
      window.removeEventListener("touchend", up);
    };

    el.addEventListener("mousedown", down);
    el.addEventListener("touchstart", down, { passive: false });

    return () => {
      el.removeEventListener("mousedown", down);
      el.removeEventListener("touchstart", down);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", moveTouch);
      window.removeEventListener("touchend", up);
    };
  }, [onDrag]);

  return (
    <div
      ref={ref}
      className="absolute -translate-x-1/2 -translate-y-1/2 select-none cursor-grab active:cursor-grabbing"
      style={{ left: x, top: y }}
    >
      <div
        className="w-4 h-4 rounded-full shadow"
        title={label}
        style={{ background: color, border: "2px solid white" }}
      />
      <div className="text-xs mt-1 px-1 py-0.5 rounded bg-white/80 border whitespace-nowrap">
        {label}
      </div>
    </div>
  );
}
