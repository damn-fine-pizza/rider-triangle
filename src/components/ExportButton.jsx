import { useState, useCallback } from 'react';
import { exportAsPNG, generateShareableURL, copyToClipboard } from '../utils/export';
import { LoadingSpinner } from './LoadingSpinner';

/**
 * Export and share button with dropdown menu.
 */
export function ExportButton({ containerRef, getShareState }) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState(null); // 'loading' | 'success' | 'error'
  const [statusMessage, setStatusMessage] = useState('');

  const showStatus = (type, message) => {
    setStatus(type);
    setStatusMessage(message);
    setTimeout(() => {
      setStatus(null);
      setStatusMessage('');
    }, 2000);
  };

  const handleExportPNG = useCallback(async () => {
    if (!containerRef?.current) {
      showStatus('error', 'Nothing to export');
      return;
    }

    setStatus('loading');
    setStatusMessage('Generating image...');

    try {
      await exportAsPNG(containerRef.current, 'rider-triangle-comparison');
      showStatus('success', 'Image downloaded!');
    } catch (e) {
      console.error('Export failed:', e);
      showStatus('error', 'Export failed');
    }

    setIsOpen(false);
  }, [containerRef]);

  const handleCopyLink = useCallback(async () => {
    if (!getShareState) {
      showStatus('error', 'Nothing to share');
      return;
    }

    try {
      const state = getShareState();
      const url = generateShareableURL(state);
      const success = await copyToClipboard(url);

      if (success) {
        showStatus('success', 'Link copied!');
      } else {
        showStatus('error', 'Copy failed');
      }
    } catch (e) {
      console.error('Share failed:', e);
      showStatus('error', 'Share failed');
    }

    setIsOpen(false);
  }, [getShareState]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-primary text-sm flex items-center gap-1.5"
        disabled={status === 'loading'}
      >
        {status === 'loading' ? (
          <LoadingSpinner size="sm" />
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
        )}
        Export
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Menu */}
          <div className="absolute right-0 mt-1 w-48 card border border-[--border-color] z-20">
            <button
              onClick={handleExportPNG}
              className="w-full px-4 py-2 text-left text-sm card-hover flex items-center gap-2"
            >
              <svg
                className="w-4 h-4 text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Save as PNG
            </button>
            <button
              onClick={handleCopyLink}
              className="w-full px-4 py-2 text-left text-sm card-hover flex items-center gap-2 border-t border-[--border-color]"
            >
              <svg
                className="w-4 h-4 text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              Copy share link
            </button>
          </div>
        </>
      )}

      {/* Status toast */}
      {status && (
        <div
          className={`absolute right-0 mt-1 px-3 py-1.5 rounded text-sm font-medium ${
            status === 'success'
              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
              : status === 'error'
                ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                : 'bg-[--bg-card-hover] text-secondary'
          }`}
        >
          {statusMessage}
        </div>
      )}
    </div>
  );
}
