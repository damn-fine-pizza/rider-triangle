/**
 * TouchLoupe - Magnifying glass for precise touch positioning
 *
 * Shows a zoomed view of the image area under the touch point,
 * positioned above the finger with a crosshair indicating exact placement.
 * Similar to Google Keyboard's magnifier for text selection.
 */

import { LOUPE } from '../constants';

export function TouchLoupe({
  visible,
  touchX,
  touchY,
  imageSrc,
  containerRect,
  magnification = LOUPE.MAGNIFICATION,
  size = LOUPE.SIZE_PX,
}) {
  if (!visible || !imageSrc || !containerRect) return null;

  // Calculate loupe position (above the finger)
  const loupeX = touchX;
  const loupeY = Math.max(LOUPE.MIN_TOP_PX, touchY - LOUPE.OFFSET_Y_PX);

  // Calculate background position for magnified view
  // The center of the loupe should show what's at touchX/touchY
  const bgX = touchX * magnification - size / 2;
  const bgY = touchY * magnification - size / 2;

  // Scale displayed image dimensions by magnification
  const bgWidth = containerRect.width * magnification;
  const bgHeight = containerRect.height * magnification;

  return (
    <div
      data-testid="touch-loupe"
      className="pointer-events-none absolute z-50"
      style={{
        left: loupeX,
        top: loupeY,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Loupe circle with magnified image */}
      <div
        className="relative rounded-full overflow-hidden border-2 border-white shadow-xl"
        style={{
          width: size,
          height: size,
          backgroundImage: `url(${imageSrc})`,
          backgroundPosition: `-${bgX}px -${bgY}px`,
          backgroundSize: `${bgWidth}px ${bgHeight}px`,
          backgroundRepeat: 'no-repeat',
          backgroundColor: 'rgba(0,0,0,0.3)',
        }}
      >
        {/* Crosshair overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Vertical line */}
          <div className="absolute w-px h-full bg-red-500 opacity-70" />
          {/* Horizontal line */}
          <div className="absolute h-px w-full bg-red-500 opacity-70" />
          {/* Center dot */}
          <div className="w-2 h-2 rounded-full bg-red-500 border border-white shadow-sm" />
        </div>
      </div>

      {/* Pointer triangle pointing to touch location */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
        style={{
          bottom: -LOUPE.POINTER_SIZE_PX,
          borderLeft: `${LOUPE.POINTER_SIZE_PX}px solid transparent`,
          borderRight: `${LOUPE.POINTER_SIZE_PX}px solid transparent`,
          borderTop: `${LOUPE.POINTER_SIZE_PX}px solid white`,
        }}
      />
    </div>
  );
}
