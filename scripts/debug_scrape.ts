import { chromium } from 'playwright';
import * as fs from 'fs';

// DEBUG SCRIPT v3: Category Discovery
// Since Search is giving 500 Errors, we will find the Category URLs from the menu.

async function main() {
    console.log('\n🗺️  STARTING CATEGORY DISCOVERY');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('👉 Going to Home Page...');
        await page.goto('https://nautichandler.com/en/', { waitUntil: 'domcontentloaded', timeout: 60000 });

        console.log('   ✅ Loaded. Scanning for Categories...');

        // Extract Links from the main menu
        // Common Prestashop selector is #top-menu a, or .category-top-menu a
        const categories = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            return links
                .map(a => ({ text: a.textContent?.trim(), href: a.href }))
                .filter(a => a.href.includes('/en/') && !a.href.includes('search') && !a.href.includes('cart') && !a.href.includes('login') && a.text && a.text.length > 2)
                .slice(0, 50); // Get first 50 relevant links
        });

        console.log('\n   Found Potential Categories:');
        categories.forEach(c => console.log(`   � [${c.text}]: ${c.href}`));

    } catch (error) {
        console.error('   ❌ Error:', error);
    }

    console.log('\n🛑 Closing...');
    await browser.close();
}

main().catch(console.error);
