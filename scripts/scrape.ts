import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// Product type
interface Product {
    id: string;
    title: string;
    price: string;
    image: string;
    link: string;
    category?: string;
}

const OUTPUT_PATH = path.join(process.cwd(), 'public', 'products.json');

// DIRECT CATEGORY URLS (Bypassing Search 500 Errors)
const TARGET_CATEGORIES = [
    { name: 'electronics', url: 'https://nautichandler.com/en/190-electronics' },
    { name: 'motor', url: 'https://nautichandler.com/en/100393-motor' },
    { name: 'ropes', url: 'https://nautichandler.com/en/100395-ropes' },
    { name: 'safety', url: 'https://nautichandler.com/en/100389-safety' },
    { name: 'anchors', url: 'https://nautichandler.com/en/100810-anchors' }, // Changed from generic 'anchoring'
    { name: 'fitting', url: 'https://nautichandler.com/en/100396-fitting' },
    { name: 'plumbing', url: 'https://nautichandler.com/en/100713-plumbing' },
    { name: 'painting', url: 'https://nautichandler.com/en/100390-painting' },
    { name: 'screws', url: 'https://nautichandler.com/en/100394-screws' },
    { name: 'tools', url: 'https://nautichandler.com/en/100391-tools-machines' },
    { name: 'electrics', url: 'https://nautichandler.com/en/100392-electricslighting' },
    { name: 'maintenance', url: 'https://nautichandler.com/en/100669-maintenance-cleaning-products' },
    { name: 'navigation', url: 'https://nautichandler.com/en/100329-navigation' },
    { name: 'clothing', url: 'https://nautichandler.com/en/43-personal-equipment' }
];

const ITEMS_PER_CATEGORY = 20;

async function main() {
    console.log('\n═════════════════════════════════════════════════════════');
    console.log('                 🌊 YACHTDROP SCRAPER v2');
    console.log('            (Direct Category Access Strategy)');
    console.log('═════════════════════════════════════════════════════════\n');

    const browser = await chromium.launch({
        headless: true // We can use headless now that we are hitting valid pages
    });
    const page = await browser.newPage();

    await page.setViewportSize({ width: 1280, height: 800 });

    // Set headers to look like a real browser
    await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    let allProducts: Product[] = [];

    for (const cat of TARGET_CATEGORIES) {
        console.log(`  📡 Scrapping Category: "${cat.name}"`);
        console.log(`     URL: ${cat.url}`);

        try {
            await page.goto(cat.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
            await page.waitForTimeout(2000); // Allow lazy load

            // Scroll down a bit to trigger any lazy loading
            await page.evaluate(() => window.scrollBy(0, 500));
            await page.waitForTimeout(1000);

            // Selectors
            let productSelector = '.product-miniature';
            let foundCount = await page.locator(productSelector).count();

            // Fallback selector
            if (foundCount === 0) {
                productSelector = '.js-product-miniature';
                foundCount = await page.locator(productSelector).count();
            }

            console.log(`     Found ${foundCount} items on page.`);

            if (foundCount > 0) {
                const pageProducts = await page.evaluate((args) => {
                    const { selector, category, limit } = args;
                    const items: any[] = [];
                    const elements = document.querySelectorAll(selector);

                    for (let i = 0; i < elements.length && items.length < limit; i++) {
                        const el = elements[i];
                        const titleEl = el.querySelector('.product-name a') || el.querySelector('.product-name') || el.querySelector('.product-title');
                        const priceEl = el.querySelector('.price') || el.querySelector('.product-price');
                        const imgEl = el.querySelector('.product-thumbnail img') || el.querySelector('img');
                        const linkEl = el.querySelector('.product-name a') || el.querySelector('a.thumbnail') || el.querySelector('a');

                        const title = titleEl?.textContent?.trim() || '';
                        const price = priceEl?.textContent?.trim() || '€0.00';
                        const link = linkEl?.getAttribute('href') || '';
                        let image = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || '';

                        // Fix relative image URLs
                        if (image) {
                            if (image.startsWith('//')) image = 'https:' + image;
                            else if (image.startsWith('/')) image = 'https://nautichandler.com' + image;
                        }

                        if (title && link) {
                            items.push({
                                title,
                                price,
                                image,
                                link,
                                category // Tag with our internal category name
                            });
                        }
                    }
                    return items;
                }, { selector: productSelector, category: cat.name, limit: ITEMS_PER_CATEGORY });

                console.log(`     Extracted ${pageProducts.length} valid items.`);

                // Add to master list
                for (const p of pageProducts) {
                    if (!allProducts.find(existing => existing.link === p.link)) {
                        allProducts.push({ id: 'temp', ...p });
                    }
                }
            } else {
                console.log(`     ⚠️ No items found for ${cat.name}`);
            }

        } catch (error) {
            console.error(`  ❌ Error processing ${cat.name}:`, error);
        }
    }

    if (allProducts.length === 0) {
        console.log('  ❌ Aborting. No products found.');
        await browser.close();
        return;
    }

    // Assign final IDs
    const finalProducts: Product[] = allProducts.map((p, index) => ({
        id: `prod-${index + 1}`,
        title: p.title,
        price: p.price,
        image: p.image,
        link: p.link,
        category: p.category
    }));

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalProducts, null, 2));
    console.log(`\n  🎉 SUCCESS! Saved ${finalProducts.length} products to public/products.json`);

    await browser.close();
}

main().catch(console.error);
