import { test, expect } from '@playwright/test';

test('test_max_monitors_limit - try to select 7th monitor, verify blocked', async ({ page }) => {
  await page.goto('/');
  
  // Get all available monitor buttons
  const monitorButtons = page.locator('button').filter({ hasText: /" (FHD|QHD|4K)/ });
  const count = await monitorButtons.count();
  
  // Click up to 7 monitors (or as many as available)
  let clicked = 0;
  for (let i = 0; i < Math.min(count, 7); i++) {
    const btn = monitorButtons.nth(i);
    await btn.click();
    await page.waitForTimeout(300);
    clicked++;
  }
  
  // Get counter value - extract number before /6
  const counter = page.locator('text=/\\d\\/6 selected/').first();
  const counterText = await counter.textContent() || '';
  const parts = counterText.split('/');
  const selectedCount = parts.length > 0 ? parseInt(parts[0]) : 0;
  
  // Verify max 6 monitors are selected
  expect(selectedCount).toBeLessThanOrEqual(6);
  
  // If we tried to click 7+, verify counter is still at 6 (not 7)
  if (clicked >= 7) {
    expect(selectedCount).toBe(6);
  }
});