import { test, expect } from '@playwright/test';

test('test_preset_bar_search - filter monitors by keyword', async ({ page }) => {
  await page.goto('/');

  // Find search input
  const searchInput = page.locator('input[placeholder*="Search"]');
  await expect(searchInput).toBeVisible();

  // Type "Samsung" to filter
  await searchInput.fill('Samsung');
  await page.waitForTimeout(500);

  // Verify some results appear (should contain "Samsung")
  const results = page.locator('button:has-text("Samsung")');
  const count = await results.count();
  expect(count).toBeGreaterThan(0);

  // Clear search
  await searchInput.fill('');
  await page.waitForTimeout(300);

  // Verify all presets are visible again
  const allPresets = page.locator('section button').first();
  await expect(allPresets).toBeVisible();
});
