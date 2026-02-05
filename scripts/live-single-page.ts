
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function scrapePage(url: string, pageNum: number = 1) {
    // Launch puppeteer with stealth
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        // Optimize navigation
        await page.setViewport({ width: 1366, height: 768 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.error(`[DEBUG] Navigating to ${url} for Page ${pageNum}`);

        // Go to URL
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Debugging
        const title = await page.title();
        const content = await page.content();
        console.error(`[DEBUG] Title: ${title}`);
        console.error(`[DEBUG] Status: ${response?.status()}`);
        console.error(`[DEBUG] HTML Length: ${content.length}`);

        if (content.length < 500) {
            console.error('[DEBUG] BLOCK DETECTED (Content too short)');
        }

        // INFINITE SCROLL LOGIC
        const SCROLLS_NEEDED = (pageNum - 1) * 2;

        if (SCROLLS_NEEDED > 0) {
            console.error(`[DEBUG] Performing ${SCROLLS_NEEDED} scrolls for page ${pageNum}...`);

            for (let i = 0; i < SCROLLS_NEEDED; i++) {
                try {
                    // Scroll to bottom
                    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                    // Wait for potential network requests (lazy load)
                    await new Promise(r => setTimeout(r, 1500));
                } catch (e) {
                    console.error('[DEBUG] Scroll error:', e);
                }
            }
        } else {
            // Even for page 1, do a small scroll to trigger lazy loaded images
            await page.evaluate(() => window.scrollBy(0, 500));
            await new Promise(r => setTimeout(r, 1000));
        }

        // Evaluate
        const allProducts = await page.evaluate(() => {
            const items: any[] = [];

            const selectors = [
                '.product-miniature',
                '.product-container',
                '.product-item',
                '[data-id-product]',
                '.js-product-miniature'
            ];

            let selector = '';
            for (const s of selectors) {
                if (document.querySelectorAll(s).length > 0) {
                    selector = s;
                    break;
                }
            }

            if (!selector) return [];

            document.querySelectorAll(selector).forEach((el) => {
                const titleEl = el.querySelector('.product-title a, .product-name a, h3 a');
                const priceEl = el.querySelector('.price, .product-price, [itemprop="price"]');
                const imgEl = el.querySelector('img');
                const linkEl = el.querySelector('a');

                if (titleEl && priceEl) {
                    const title = titleEl.textContent?.trim() || '';
                    const price = priceEl.textContent?.trim() || '';
                    const link = (titleEl as HTMLAnchorElement).href;

                    // IMPROVED IMAGE EXTRACTION
                    let image = '';
                    if (imgEl) {
                        // Check data-image-large-src first (PrestaShop standard)
                        const candidates = [
                            imgEl.getAttribute('data-image-large-src'),
                            imgEl.getAttribute('data-src'),
                            imgEl.getAttribute('src')
                        ];

                        // Find first valid non-base64 URL
                        for (const cand of candidates) {
                            if (cand && !cand.startsWith('data:')) {
                                image = cand;
                                break;
                            }
                        }

                        // If we are desperate and only have base64, see if there's any other data attrib
                        if (!image && imgEl.attributes.length > 0) {
                            for (let i = 0; i < imgEl.attributes.length; i++) {
                                const attrName = imgEl.attributes[i].name;
                                const attrVal = imgEl.attributes[i].value;
                                if (attrName.startsWith('data-') && attrVal.startsWith('http')) {
                                    image = attrVal;
                                    break;
                                }
                            }
                        }
                    }

                    items.push({
                        id: link,
                        title,
                        price,
                        image: image || '',
                        link,
                        category: 'search'
                    });
                }
            });
            return items;
        });

        console.error(`[DEBUG] Found total ${allProducts.length} items on page`);

        // SLICE RESULTS logic
        const ITEMS_PER_SCROLL = 24;

        let start = 0;
        let end = allProducts.length;

        if (pageNum > 1) {
            start = (pageNum - 1) * ITEMS_PER_SCROLL;
            end = start + ITEMS_PER_SCROLL;
        } else {
            // For page 1, limit to first batch
            end = ITEMS_PER_SCROLL;
        }

        const pagedProducts = allProducts.slice(start, end);
        console.error(`[DEBUG] Returning items ${start} to ${end} (${pagedProducts.length} items)`);

        console.log(JSON.stringify(pagedProducts));

    } catch (error) {
        console.error('Error scraping:', error);
        console.log('[]');
    } finally {
        await browser.close();
    }
}

const url = process.argv[2];
const pageArg = process.argv[3] ? parseInt(process.argv[3]) : 1;

if (url) {
    scrapePage(url, pageArg);
} else {
    console.log('[]');
}
