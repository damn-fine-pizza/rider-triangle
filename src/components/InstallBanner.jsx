/**
 * PWA Install Banner component.
 *
 * Shows platform-specific installation instructions:
 * - Android/Chrome: "Install" button that triggers beforeinstallprompt
 * - iOS Safari: Instructions to use Share → Add to Home Screen
 */
export function InstallBanner({
  platform,
  canPrompt,
  onInstall,
  onDismiss,
}) {
  if (platform.isIOS) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-[--bg-card] border-t border-[--border-color] shadow-lg safe-area-bottom">
        <div className="flex items-start gap-3 max-w-xl mx-auto">
          {/* App icon */}
          <img
            src="./icon-192.png"
            alt="Rider Triangle"
            className="w-12 h-12 rounded-xl flex-shrink-0"
          />

          <div className="flex-1 min-w-0">
            <div className="font-medium text-primary">Install Rider Triangle</div>
            <p className="text-sm text-secondary mt-0.5">
              Tap{' '}
              <span className="inline-flex items-center">
                <ShareIcon className="w-4 h-4 mx-0.5" />
              </span>{' '}
              then "Add to Home Screen"
            </p>
          </div>

          {/* Dismiss button */}
          <button
            onClick={onDismiss}
            className="p-1 text-muted hover:text-primary"
            aria-label="Dismiss"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // Android / Chrome / other browsers with beforeinstallprompt support
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-[--bg-card] border-t border-[--border-color] shadow-lg">
      <div className="flex items-center gap-3 max-w-xl mx-auto">
        {/* App icon */}
        <img
          src="./icon-192.png"
          alt="Rider Triangle"
          className="w-12 h-12 rounded-xl flex-shrink-0"
        />

        <div className="flex-1 min-w-0">
          <div className="font-medium text-primary">Install Rider Triangle</div>
          <p className="text-sm text-muted">Add to home screen for quick access</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onDismiss}
            className="px-3 py-1.5 text-sm text-muted hover:text-primary"
          >
            Not now
          </button>
          {canPrompt && (
            <button
              onClick={onInstall}
              className="btn-primary text-sm"
            >
              Install
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * iOS Share icon (square with arrow up).
 */
function ShareIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
      />
    </svg>
  );
}

/**
 * Close/dismiss icon.
 */
function CloseIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}
