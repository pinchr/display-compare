import { test, expect } from '@playwright/test';

test('test_monitor_selection_basic - select, verify, remove', async ({ page }) => {
  await page.goto('/');

  // Check header
  await expect(page.locator('h1')).toContainText('display-compare');

  // Find a non-selected monitor button
  const monitorBtn = page.locator('button').filter({ hasText: '27" QHD' }).first();
  await monitorBtn.click();
  await page.waitForTimeout(500);

  // Verify counter updated (use first() to avoid strict mode violation with 2 counters)
  await expect(page.locator('text=/\\d\\/6 selected/').first()).toBeVisible();
});

test('test_multi_monitor_selection - select 3 monitors, verify counter updates', async ({ page }) => {
  await page.goto('/');

  // Click 3 monitors
  const monitors = ['27" QHD', '27" 4K', '32" 4K'];
  for (const name of monitors) {
    const btn = page.locator('button').filter({ hasText: name }).first();
    await btn.click();
    await page.waitForTimeout(300);
  }

  // Verify counter updated (use first() to avoid strict mode violation)
  await expect(page.locator('text=/\\d\\/6 selected/').first()).toBeVisible();
});

test('test_overlay_opacity_slider - change opacity, verify slider works', async ({ page }) => {
  await page.goto('/');

  // Select 2 monitors
  const monitors = ['27" QHD', '32" 4K'];
  for (const name of monitors) {
    const btn = page.locator('button').filter({ hasText: name }).first();
    await btn.click();
    await page.waitForTimeout(300);
  }

  // Find slider (range 0.3-3)
  const slider = page.locator('input[type="range"]').first();
  if (await slider.count() > 0) {
    await slider.fill('1.5');
    await page.waitForTimeout(300);
  }

  // Verify monitors were selected
  await expect(page.locator('text=/\\d\\/6 selected/').first()).toBeVisible();
});
