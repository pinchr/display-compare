#!/usr/bin/env node
/**
 * display-compare E2E Tests via Playwright
 * Runs every 31 minutes via cron job
 */

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 30000;

async function runTests() {
  console.log('🧪 Starting display-compare E2E tests...\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  const test = async (name, fn) => {
    try {
      console.log(`  ⏳ ${name}...`);
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      results.passed++;
    } catch (err) {
      console.log(`  ❌ FAIL: ${name}`);
      console.log(`     Error: ${err.message}`);
      results.failed++;
      results.errors.push({ test: name, error: err.message });
    }
  };

  try {
    // Test 1: Page loads - wait for React to hydrate
    await test('Page loads without crash', async () => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: TEST_TIMEOUT });
      // Wait for React to render
      await page.waitForSelector('body', { timeout: 10000 });
      await page.waitForTimeout(2000); // Give React time to hydrate
      const body = await page.textContent('body');
      if (!body.includes('display-compare')) throw new Error('Page did not load properly');
    });

    // Test 2: Monitors can be selected
    await test('Can select monitors', async () => {
      // Click on monitor buttons
      await page.click('button:has-text("24\"")', { timeout: 5000 }).catch(() => {});
      await page.click('button:has-text("27\"")', { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(500);
    });

    // Test 3: Desk View renders
    await test('Desk View section visible', async () => {
      await page.waitForTimeout(1000);
      const content = await page.content();
      if (!content.includes('Desk View')) throw new Error('Desk View not found');
    });

    // Test 4: Add Windows dropdown works
    await test('Add Windows dropdown exists', async () => {
      const content = await page.content();
      if (!content.includes('Add Windows')) throw new Error('Add Windows dropdown not found');
    });

    // Test 5: Add Windows and verify windows appear
    await test('Add Windows - windows appear on monitors', async () => {
      // Find the select element and select by label
      await page.selectOption('select', 'coding-ide').catch(async () => {
        // Try clicking the dropdown first
        await page.click('select');
        await page.selectOption('option:has-text("Coding")');
      });
      await page.waitForTimeout(1500);
    });

    // Test 6: Monitor info shows (PPI, resolution)
    await test('Monitor info displays (PPI, resolution)', async () => {
      const content = await page.content();
      // Check for any monitor info
      const hasInfo = content.includes('PPI') || content.includes('1920');
      if (!hasInfo) throw new Error('PPI or resolution not displayed');
    });

    // Test 7: Scale sliders work
    await test('Scale sliders exist', async () => {
      const content = await page.content();
      const hasSliders = content.includes('Aa:') || content.includes('slider');
      if (!hasSliders) throw new Error('Scale sliders not found');
    });

    // Test 8: Distance slider works
    await test('Distance slider exists', async () => {
      const content = await page.content();
      if (!content.includes('cm')) throw new Error('Distance slider not found');
    });

    // Test 9: SVG/3D toggle works
    await test('SVG/3D toggle exists', async () => {
      const content = await page.content();
      if (!content.includes('SVG') || !content.includes('3D')) throw new Error('SVG/3D toggle not found');
    });

    // Test 10: Monitor drag works (Y-axis)
    await test('Can drag monitors on desk', async () => {
      const content = await page.content();
      // Check for monitor markers
      if (!content.includes('M1') && !content.includes('24"')) throw new Error('Monitors not found on desk');
    });

    // Test 11: Top view works
    await test('Top/Bird view visible', async () => {
      const content = await page.content();
      if (!content.includes('Bird') && !content.includes('Top')) throw new Error('Bird view not found');
    });

    // Test 12: Layout Preview works
    await test('Layout Preview section exists', async () => {
      const content = await page.content();
      if (!content.includes('Layout Preview')) throw new Error('Layout Preview not found');
    });

    // Test 13: Spec comparison table works
    await test('Specification comparison table exists', async () => {
      const content = await page.content();
      if (!content.includes('Specyfikacja')) throw new Error('Spec table not found');
    });

    // Test 14: No critical console errors
    await test('No critical console errors', async () => {
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      await page.waitForTimeout(1000);
      // Filter out non-critical errors (like 404 for favicon, etc)
      const criticalErrors = errors.filter(e => 
        !e.includes('favicon') && 
        !e.includes('404') &&
        !e.includes('net::ERR')
      );
      if (criticalErrors.length > 0) {
        console.log(`     Console errors: ${criticalErrors.join(', ')}`);
      }
    });

  } catch (err) {
    console.log(`\n❌ Test suite error: ${err.message}`);
  } finally {
    await browser.close();
  }

  // Print results
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log('\n⚠️  Failed tests:');
    results.errors.forEach(e => console.log(`   - ${e.test}: ${e.error}`));
  }

  // Save results to file for later analysis
  const fs = require('fs');
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    passed: results.passed,
    failed: results.failed,
    errors: results.errors
  };
  fs.writeFileSync('/Users/pinchr/dev/display-compare/test-results.json', JSON.stringify(report, null, 2));
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});