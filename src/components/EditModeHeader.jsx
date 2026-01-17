/**
 * EditModeHeader - Floating header pill for Immersive Edit Mode.
 *
 * Shows current tool, progress indicator, and exit button.
 */

import { EDIT_MODE } from '../constants';

export function EditModeHeader({ toolLabel, progress, onReset, onExit }) {
  return (
    <div
      data-testid="edit-mode-header"
      className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 via-black/50 to-transparent safe-area-top"
      style={{ height: EDIT_MODE.HEADER_HEIGHT_PX + 20 }}
    >
      <div
        className="flex items-center justify-between px-4"
        style={{ height: EDIT_MODE.HEADER_HEIGHT_PX }}
      >
        {/* Tool indicator - prominent pill */}
        <div className="flex items-center gap-3 bg-orange-500 rounded-full px-4 py-2 shadow-lg">
          <span className="text-white text-lg">📍</span>
          <div className="flex flex-col leading-tight">
            <span className="text-white font-semibold text-sm">{toolLabel}</span>
            {progress && (
              <span className="text-white/80 text-xs">
                Passo {progress.current} di {progress.total}
              </span>
            )}
          </div>
        </div>

        {/* Right side buttons */}
        <div className="flex items-center gap-2">
          {/* Reset button */}
          <button
            data-testid="edit-mode-reset"
            onClick={onReset}
            className="h-10 px-4 flex items-center justify-center gap-2 bg-white/20 backdrop-blur-sm rounded-full shadow-lg active:bg-white/30 transition-colors border border-white/30"
            aria-label="Reset all markers"
          >
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="text-white text-sm font-medium">Reset</span>
          </button>

          {/* Exit button */}
          <button
            data-testid="edit-mode-exit"
            onClick={onExit}
            className="w-10 h-10 flex items-center justify-center bg-red-500/80 backdrop-blur-sm rounded-full shadow-lg active:bg-red-600 transition-colors"
            aria-label="Exit edit mode"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
