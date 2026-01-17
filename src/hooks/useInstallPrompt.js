import { useState, useEffect, useCallback } from 'react';

// Constants for install prompt behavior
const INITIAL_DELAY_MS = 3000; // Wait before showing banner

/**
 * Detect user's platform for platform-specific install instructions.
 */
function detectPlatform() {
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isAndroid = /Android/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
  const isChrome = /Chrome/.test(ua) && !/Edg/.test(ua);
  const isEdge = /Edg/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  const isMobile = /Mobile|Android/.test(ua);

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  // Check if browser supports PWA installation
  const supportsPWA =
    'serviceWorker' in navigator &&
    (isChrome || isEdge || isAndroid || isIOS || (isFirefox && !isMobile));

  return {
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isEdge,
    isFirefox,
    isMobile,
    isStandalone,
    supportsPWA,
  };
}

/**
 * Hook to manage PWA install prompt.
 *
 * Shows install banner on:
 * - Android/Chrome: captures beforeinstallprompt event
 * - iOS Safari: guidance to add to home screen
 * - Desktop Chrome/Edge: install button or instructions
 * - Firefox: instructions for installation
 *
 * Dismiss is session-only - banner reappears on page refresh.
 *
 * @returns {Object} Install prompt state and actions
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [platform, setPlatform] = useState({
    isIOS: false,
    isAndroid: false,
    isSafari: false,
    isChrome: false,
    isEdge: false,
    isFirefox: false,
    isMobile: false,
    isStandalone: false,
    supportsPWA: false,
  });
  const [dismissed, setDismissed] = useState(false);
  const [showAfterDelay, setShowAfterDelay] = useState(false);

  // Detect platform on mount
  useEffect(() => {
    setPlatform(detectPlatform());

    // Show banner after initial delay to let user see the app first
    const timer = setTimeout(() => {
      setShowAfterDelay(true);
    }, INITIAL_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  // Listen for beforeinstallprompt event (Android/Chrome)
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log('beforeinstallprompt event captured');
    };

    const handleAppInstalled = () => {
      // Clear the deferredPrompt
      setDeferredPrompt(null);
      setIsInstallable(false);
      setDismissed(true); // Don't show banner anymore
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

    if (outcome === 'accepted') {
      setDismissed(true);
    }

    return outcome === 'accepted';
  }, [deferredPrompt]);

  /**
   * Dismiss the install banner for current session only.
   * Banner will reappear on page refresh.
   */
  const dismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  // Determine if we should show the install banner
  // Show when:
  // 1. Not dismissed (this session)
  // 2. Not already in standalone mode (already installed)
  // 3. After initial delay
  // 4. Either: installable (beforeinstallprompt fired), iOS, or supports PWA
  const shouldShowBanner =
    !dismissed &&
    !platform.isStandalone &&
    showAfterDelay &&
    (isInstallable || platform.isIOS || platform.supportsPWA);

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
  };
}
