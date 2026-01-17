import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for PWA testing.
 * Tests PWA installation on Android (Chrome) and iOS (Safari) emulated devices.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },

  projects: [
    // Desktop Chrome - test install prompt
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Android Chrome emulation
    {
      name: 'android-chrome',
      use: { ...devices['Pixel 5'] },
    },

    // iOS Safari emulation (for iOS-specific behavior testing)
    {
      name: 'ios-safari',
      use: { ...devices['iPhone 13'] },
    },
  ],

  // Run local server before tests
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
