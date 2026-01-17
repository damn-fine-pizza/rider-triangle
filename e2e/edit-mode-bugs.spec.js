import { test, expect } from '@playwright/test';

/**
 * Edit Mode Bug Tests
 *
 * Tests for bugs reported in Edit Mode:
 * 1. Reset button doesn't work
 * 2. Move/Pan doesn't work
 * 3. Placing markers doesn't work
 *
 * Run with different projects:
 * - npx playwright test e2e/edit-mode-bugs.spec.js --project=chromium (desktop)
 * - npx playwright test e2e/edit-mode-bugs.spec.js --project=android-chrome (mobile)
 * - npx playwright test e2e/edit-mode-bugs.spec.js --project=ios-safari (tablet)
 */

// Helper to enter Edit Mode via button click
async function enterEditMode(page) {
  // Find and click the "Edit Mode" button in the tool panel
  const editModeBtn = page.locator('button:has-text("Edit Mode")');
  await expect(editModeBtn).toBeVisible({ timeout: 10000 });
  await editModeBtn.click();
  await page.waitForTimeout(500);

  // Verify Edit Mode is active
  const editMode = page.locator('[data-testid="edit-mode"]');
  await expect(editMode).toBeVisible({ timeout: 5000 });
  return editMode;
}

// Helper to dismiss onboarding
async function dismissOnboarding(page) {
  const skipButton = page.locator('button:has-text("Skip")');
  if ((await skipButton.count()) > 0) {
    await skipButton.click();
    await page.waitForTimeout(300);
  }
}

// Helper to expand the tool panel if collapsed
async function expandToolPanel(page) {
  // Click "Expand All" button to ensure all panels are open
  const expandAllBtn = page.locator('button:has-text("Expand All")');
  const expandAllCount = await expandAllBtn.count();
  if (expandAllCount > 0) {
    await expandAllBtn.click();
    await page.waitForTimeout(300);
  }
}

test.describe('Edit Mode Bug Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('h1');
    await dismissOnboarding(page);
    await expandToolPanel(page);
  });

  // =========================================================================
  // BUG 1: Reset button doesn't work in Edit Mode
  // =========================================================================

  test('BUG-1: Reset button should clear markers and reset tool', async ({ page, isMobile }) => {
    // Enter Edit Mode
    await enterEditMode(page);

    const container = page.locator('[data-testid="edit-mode-container"]');
    const box = await container.boundingBox();
    expect(box).toBeTruthy();

    // Place a marker first
    if (isMobile) {
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    } else {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }
    await page.waitForTimeout(500);

    // Verify tool advanced (should be 2 di 6 now)
    const headerPill = page.locator('[data-testid="edit-mode-header"]');
    const afterPlaceText = await headerPill.textContent();
    console.log(`After placing marker: ${afterPlaceText}`);

    // Click the Reset button
    const resetBtn = page.locator('[data-testid="edit-mode-reset"]');
    await expect(resetBtn).toBeVisible();

    if (isMobile) {
      await resetBtn.tap();
    } else {
      await resetBtn.click();
    }
    await page.waitForTimeout(500);

    // Verify the tool indicator resets to first tool (1 di 6)
    const afterResetText = await headerPill.textContent();
    console.log(`After reset: ${afterResetText}`);

    // Should reset to first tool (1 di 6)
    expect(afterResetText).toContain('1 di 6');
  });

  // =========================================================================
  // BUG 2: Move/Pan doesn't work when zoomed in Edit Mode
  // =========================================================================

  test('BUG-2: Drag should pan image when zoomed in Edit Mode', async ({ page, isMobile }) => {
    // Enter Edit Mode
    await enterEditMode(page);

    const container = page.locator('[data-testid="edit-mode-container"]');
    const box = await container.boundingBox();
    expect(box).toBeTruthy();

    // Zoom in first
    const zoomInBtn = page.locator('button[aria-label="Zoom in"]');
    await expect(zoomInBtn).toBeVisible();

    if (isMobile) {
      await zoomInBtn.tap();
      await zoomInBtn.tap();
    } else {
      await zoomInBtn.click();
      await zoomInBtn.click();
    }
    await page.waitForTimeout(300);

    // Get initial transform of the image wrapper
    const getTransform = async () => {
      return await page.evaluate(() => {
        const wrapper = document.querySelector('[data-testid="edit-mode-container"] > div');
        if (!wrapper) return null;
        const style = window.getComputedStyle(wrapper);
        return style.transform;
      });
    };

    const initialTransform = await getTransform();
    console.log(`Initial transform: ${initialTransform}`);

    // Perform drag gesture
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    const endX = startX + 100;
    const endY = startY + 50;

    if (isMobile) {
      // Touch drag
      await page.evaluate(
        ({ startX, startY, endX, endY }) => {
          const element = document.querySelector('[data-testid="edit-mode-container"]');
          if (!element) return;

          const touchStart = new TouchEvent('touchstart', {
            bubbles: true,
            cancelable: true,
            touches: [new Touch({ identifier: 1, target: element, clientX: startX, clientY: startY })],
          });
          element.dispatchEvent(touchStart);

          setTimeout(() => {
            const touchMove = new TouchEvent('touchmove', {
              bubbles: true,
              cancelable: true,
              touches: [new Touch({ identifier: 1, target: element, clientX: endX, clientY: endY })],
            });
            element.dispatchEvent(touchMove);
          }, 50);

          setTimeout(() => {
            const touchEnd = new TouchEvent('touchend', {
              bubbles: true,
              cancelable: true,
              changedTouches: [new Touch({ identifier: 1, target: element, clientX: endX, clientY: endY })],
              touches: [],
            });
            element.dispatchEvent(touchEnd);
          }, 100);
        },
        { startX, startY, endX, endY }
      );
    } else {
      // Mouse drag
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(endX, endY, { steps: 5 });
      await page.mouse.up();
    }

    await page.waitForTimeout(500);

    const finalTransform = await getTransform();
    console.log(`Final transform: ${finalTransform}`);

    // Transform should have changed (position should differ)
    expect(finalTransform).not.toBe(initialTransform);
  });

  // =========================================================================
  // BUG 3: Placing markers doesn't work in Edit Mode
  // =========================================================================

  test('BUG-3: Click/tap should place marker and advance tool', async ({ page, isMobile }) => {
    // Enter Edit Mode
    await enterEditMode(page);

    const container = page.locator('[data-testid="edit-mode-container"]');
    const box = await container.boundingBox();
    expect(box).toBeTruthy();

    // Get initial tool from header
    const headerPill = page.locator('[data-testid="edit-mode-header"]');
    const initialText = await headerPill.textContent();
    console.log(`Initial header: ${initialText}`);

    // Should start with first tool (1 di 6)
    expect(initialText).toContain('1 di 6');

    // Click/tap to place a marker
    const tapX = box.x + box.width / 2;
    const tapY = box.y + box.height / 2;

    if (isMobile) {
      await page.touchscreen.tap(tapX, tapY);
    } else {
      await page.mouse.click(tapX, tapY);
    }
    await page.waitForTimeout(500);

    // Check if tool advanced (should now be 2 di 6)
    const afterText = await headerPill.textContent();
    console.log(`After click/tap header: ${afterText}`);

    // Tool should have advanced
    expect(afterText).toContain('2 di 6');
  });

  // =========================================================================
  // Additional test: Multiple marker placements
  // =========================================================================

  test('BUG-3b: Should be able to place multiple markers in sequence', async ({ page, isMobile }) => {
    // Enter Edit Mode
    await enterEditMode(page);

    const container = page.locator('[data-testid="edit-mode-container"]');
    const box = await container.boundingBox();
    expect(box).toBeTruthy();

    const headerPill = page.locator('[data-testid="edit-mode-header"]');

    // Place 3 markers and verify tool advances each time
    for (let i = 1; i <= 3; i++) {
      const currentText = await headerPill.textContent();
      console.log(`Before marker ${i}: ${currentText}`);
      expect(currentText).toContain(`${i} di 6`);

      // Offset each click slightly
      const tapX = box.x + box.width / 3 + i * 50;
      const tapY = box.y + box.height / 3 + i * 30;

      if (isMobile) {
        await page.touchscreen.tap(tapX, tapY);
      } else {
        await page.mouse.click(tapX, tapY);
      }
      await page.waitForTimeout(400);
    }

    // Should now be at tool 4 di 6
    const finalText = await headerPill.textContent();
    console.log(`After 3 markers: ${finalText}`);
    expect(finalText).toContain('4 di 6');
  });
});
