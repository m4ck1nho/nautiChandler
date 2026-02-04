import { chromium } from 'playwright';

async function main() {
    console.log('\n═════════════════════════════════════════════════════════');
    console.log('                 🔍 SEARCH VERIFICATION');
    console.log('═════════════════════════════════════════════════════════\n');

    const browser = await chromium.launch({
        headless: true
    });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });

    // Exact headers from scrape.ts
    await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const searchQuery = 'ropes';
    // Trying the restored URL pattern
    const searchUrl = `https://nautichandler.com/en/search?controller=search&s=${searchQuery}`;
    // Also try the fallback pattern if needed
    const fallbackUrl = `https://nautichandler.com/en/search?s=${searchQuery}`;

    console.log(`  📡 Testing Search Query: "${searchQuery}"`);
    console.log(`     Primary URL: ${searchUrl}`);

    try {
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        console.log(`     ✅ Page loaded (Primary URL)`);

        // Debug: Log the final URL (in case of redirects)
        console.log(`     📍 Final URL: ${page.url()}`);

        await page.waitForTimeout(2000);

        // Check for products
        let productSelector = '.product-miniature';
        let foundCount = await page.locator(productSelector).count();
        if (foundCount === 0) {
            productSelector = '.js-product-miniature';
            foundCount = await page.locator(productSelector).count();
        }

        console.log(`     Found ${foundCount} items.`);

        if (foundCount > 0) {
            const title = await page.locator(productSelector).first().locator('.product-title, .product-name').textContent();
            console.log(`     Example item: "${title?.trim()}"`);
        } else {
            console.log('     ⚠️ No items found. Checking fallback URL...');

            // Try fallback
            console.log(`     Rationale: 500/404 errors might be specific to controller param.`);
            console.log(`     Fallback URL: ${fallbackUrl}`);
            await page.goto(fallbackUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            console.log(`     ✅ Page loaded (Fallback URL)`);
            console.log(`     📍 Final URL: ${page.url()}`);

            foundCount = await page.locator(productSelector).count();
            console.log(`     Found ${foundCount} items.`);
        }

    } catch (error) {
        console.error(`  ❌ Error:`, error);
    }

    await browser.close();
}

main().catch(console.error);
