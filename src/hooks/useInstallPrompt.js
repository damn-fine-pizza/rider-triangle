import { useState, useEffect, useCallback } from 'react';

/**
 * Detect user's platform for platform-specific install instructions.
 */
function detectPlatform() {
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isAndroid = /Android/.test(ua);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;

  return { isIOS, isAndroid, isStandalone };
}

/**
 * Hook to manage PWA install prompt.
 *
 * On Android/Chrome: captures beforeinstallprompt event
 * On iOS: detects Safari and provides guidance to add to home screen
 *
 * @returns {Object} Install prompt state and actions
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [platform, setPlatform] = useState({ isIOS: false, isAndroid: false, isStandalone: false });
  const [dismissed, setDismissed] = useState(() => {
    // Check if user previously dismissed the banner
    try {
      return localStorage.getItem('pwa-install-dismissed') === 'true';
    } catch {
      return false;
    }
  });

  // Detect platform on mount
  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  // Listen for beforeinstallprompt event (Android/Chrome)
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      // Clear the deferredPrompt
      setDeferredPrompt(null);
      setIsInstallable(false);
      console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  /**
   * Trigger the install prompt (Android/Chrome only).
   */
  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);

    // Clear the deferred prompt
    setDeferredPrompt(null);
    setIsInstallable(false);

    return outcome === 'accepted';
  }, [deferredPrompt]);

  /**
   * Dismiss the install banner.
   */
  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem('pwa-install-dismissed', 'true');
    } catch {
      // localStorage not available
    }
  }, []);

  /**
   * Reset dismissed state (for testing or settings).
   */
  const resetDismissed = useCallback(() => {
    setDismissed(false);
    try {
      localStorage.removeItem('pwa-install-dismissed');
    } catch {
      // localStorage not available
    }
  }, []);

  // Determine if we should show the install banner
  const shouldShowBanner =
    !dismissed &&
    !platform.isStandalone &&
    (isInstallable || platform.isIOS);

  return {
    // State
    isInstallable,
    platform,
    dismissed,
    shouldShowBanner,
    canPrompt: !!deferredPrompt,

    // Actions
    promptInstall,
    dismiss,
    resetDismissed,
  };
}
