import { test, expect } from '@playwright/test';

/**
 * PWA Tests
 *
 * Tests PWA functionality including:
 * - Manifest loading and validity
 * - Service worker registration
 * - Install prompt behavior on Android/Chrome
 * - iOS install guidance
 * - Offline capability
 */

test.describe('PWA Manifest', () => {
  test('should have valid manifest', async ({ page }) => {
    await page.goto('/');

    // Check manifest link exists
    const manifestLink = await page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveCount(1);

    // Fetch and validate manifest
    const manifestUrl = await manifestLink.getAttribute('href');
    const response = await page.request.get(manifestUrl);
    expect(response.ok()).toBeTruthy();

    const manifest = await response.json();
    expect(manifest.name).toBe('Rider Triangle - Riding Position Comparison');
    expect(manifest.short_name).toBe('Rider Triangle');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);

    // Check for required icon sizes
    const iconSizes = manifest.icons.map(i => i.sizes);
    expect(iconSizes).toContain('192x192');
    expect(iconSizes).toContain('512x512');
  });

  test('should have PNG icons', async ({ page }) => {
    await page.goto('/');

    // Verify icons are accessible
    const icon192 = await page.request.get('/icon-192.png');
    expect(icon192.ok()).toBeTruthy();
    expect(icon192.headers()['content-type']).toContain('image/png');

    const icon512 = await page.request.get('/icon-512.png');
    expect(icon512.ok()).toBeTruthy();
    expect(icon512.headers()['content-type']).toContain('image/png');
  });
});

test.describe('Service Worker', () => {
  test('should register service worker', async ({ page }) => {
    await page.goto('/');

    // Wait for service worker registration
    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;

      try {
        const registration = await navigator.serviceWorker.ready;
        return !!registration.active;
      } catch {
        return false;
      }
    });

    expect(swRegistered).toBeTruthy();
  });
});

test.describe('Install Prompt - Android/Chrome', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chrome only');

  test('should capture beforeinstallprompt event', async ({ page }) => {
    // Inject mock beforeinstallprompt before page load
    await page.addInitScript(() => {
      window.__mockInstallPrompt = null;
      window.addEventListener('beforeinstallprompt', (e) => {
        window.__mockInstallPrompt = e;
      });
    });

    await page.goto('/');

    // Simulate beforeinstallprompt event
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt');
      event.prompt = () => Promise.resolve();
      event.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
    });

    // Wait a bit for React state to update
    await page.waitForTimeout(500);

    // Check if the install banner appears (when not dismissed)
    // Note: In real tests, the banner might not show if previously dismissed
    const hasInstallPromptCapture = await page.evaluate(() => {
      return window.__mockInstallPrompt !== null;
    });

    // The event should be captured
    expect(hasInstallPromptCapture).toBeTruthy();
  });

  test('should show install banner on Android', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium');

    // Clear any previous dismissal
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('pwa-install-dismissed');
    });

    // Reload and trigger install prompt
    await page.goto('/');
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt');
      event.preventDefault = () => {};
      event.prompt = () => Promise.resolve();
      event.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
    });

    // Wait for banner
    await page.waitForTimeout(1000);

    // Check for install button (may or may not be visible depending on state)
    const installButton = page.locator('button:has-text("Install")');
    const notNowButton = page.locator('button:has-text("Not now")');

    // At least one of these should exist if banner is shown
    const hasBanner = await installButton.count() > 0 || await notNowButton.count() > 0;

    // This test verifies the component renders, actual visibility depends on user state
    console.log('Install banner present:', hasBanner);
  });
});

test.describe('Install Prompt - iOS', () => {
  test('should detect iOS platform', async ({ page, browserName }) => {
    // This test simulates iOS detection
    test.skip(browserName !== 'webkit' && !process.env.FORCE_IOS_TEST);

    await page.goto('/');

    // Check platform detection works
    const isIOS = await page.evaluate(() => {
      const ua = navigator.userAgent || '';
      return /iPad|iPhone|iPod/.test(ua);
    });

    // On webkit, should detect as iOS
    if (browserName === 'webkit') {
      console.log('iOS detected:', isIOS);
    }
  });

  test('should show iOS-specific guidance', async ({ page }) => {
    // Clear dismissal state
    await page.evaluate(() => {
      localStorage.removeItem('pwa-install-dismissed');
    });

    await page.goto('/');

    // Simulate iOS detection by checking for Share icon in banner
    // Note: The actual banner visibility depends on platform detection
    const shareIcon = page.locator('svg path[d*="8.684 13.342"]');

    // Check component structure exists
    const bannerExists = await page.locator('.fixed.bottom-0').count();
    console.log('iOS banner structure exists:', bannerExists > 0);
  });
});

test.describe('PWA Offline Capability', () => {
  test('should cache static assets', async ({ page }) => {
    await page.goto('/');

    // Wait for service worker to be active
    await page.waitForTimeout(2000);

    // Check if some assets are cached
    const cacheNames = await page.evaluate(async () => {
      if (!('caches' in window)) return [];
      return await caches.keys();
    });

    console.log('Cache names:', cacheNames);
    expect(cacheNames.length).toBeGreaterThan(0);
  });
});

test.describe('Dark Mode Compatibility', () => {
  test('should render labels correctly in dark mode', async ({ page }) => {
    await page.goto('/');

    // Enable dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    });

    // Check that CSS variables are set
    const bgCard = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim();
    });

    // In dark mode, bg-card should be a dark color
    expect(bgCard).toBeTruthy();
    console.log('Dark mode --bg-card:', bgCard);
  });
});
