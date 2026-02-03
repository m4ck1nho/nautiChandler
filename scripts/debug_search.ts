import { chromium } from 'playwright';
import * as fs from 'fs';

async function main() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const url = 'https://nautichandler.com/en/search?s=shampoo';
    console.log(`Navigating to ${url}...`);

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000); // Wait for potential CSR

    const content = await page.content();
    fs.writeFileSync('debug_search.html', content);
    console.log('Saved debug_search.html');

    const products = await page.locator('.product-miniature').count();
    console.log(`Found ${products} .product-miniature elements`);

    const jsProducts = await page.locator('.js-product-miniature').count();
    console.log(`Found ${jsProducts} .js-product-miniature elements`);

    await browser.close();
}

main().catch(console.error);
