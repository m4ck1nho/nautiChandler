
import puppeteerExtra from 'puppeteer-extra';
// Singleton cache for local development
let localPuppeteerInstance: any = null;

// Define Product Interface
export interface ScrapedProduct {
    id: string;
    title: string;
    price: string;
    image: string;
    link: string;
    category: string;
}

export interface ScraperResult {
    products: ScrapedProduct[];
    logs: string[];
}

export async function scrapeLiveProducts(url: string, pageNum: number = 1): Promise<ScraperResult> {
    const logs: string[] = [];
    const log = (msg: string) => { console.log(msg); logs.push(msg); };
    let browser = null;

    try {
        // DETERMINE ENVIRONMENT
        const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

        log(`[SCRAPER] Launching in ${isProduction ? 'PRODUCTION' : 'LOCAL'} mode for Page ${pageNum}`);

        if (isProduction) {
            // PRODUCTION: Dynamic import to avoid local issues with missing binaries
            const chromium = (await import('@sparticuz/chromium')).default as any;
            const puppeteerCore = (await import('puppeteer-core')).default as any;

            // Use as any to bypass incomplete type definitions for chromium
            const execPath = await chromium.executablePath();

            browser = await puppeteerCore.launch({
                args: chromium.args,
                defaultViewport: chromium.defaultViewport,
                executablePath: execPath,
                headless: chromium.headless,
                ignoreHTTPSErrors: true,
            });
        } else {
            // LOCAL: Use puppeteer-extra
            if (!localPuppeteerInstance) {
                const { default: puppeteerExtra } = await import('puppeteer-extra');
                // Stealth Plugin disabled locally to avoid crash
                localPuppeteerInstance = puppeteerExtra;
            }

            browser = await localPuppeteerInstance.launch({
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                headless: true
            });
        }

        // Cast browser to any to allow newPage() without strict typing issues from mixed libs
        const page = await (browser as any).newPage();

        // Optimize navigation
        await page.setViewport({ width: 1366, height: 768 });
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        // Navigate
        log(`[SCRAPER] Navigating to ${url}`);
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        log(`[SCRAPER] Status: ${response?.status()}`);

        const title = await page.title();
        log(`[SCRAPER] Title: ${title}`);

        // Check if blocked or empty
        const content = await page.content();
        log(`[SCRAPER] HTML Length: ${content.length}`);

        // INFINITE SCROLL LOGIC
        const SCROLLS_NEEDED = (pageNum - 1) * 2;
        if (SCROLLS_NEEDED > 0) {
            log(`[SCRAPER] Scrolling ${SCROLLS_NEEDED} times...`);
            for (let i = 0; i < SCROLLS_NEEDED; i++) {
                try {
                    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                    await new Promise((r) => setTimeout(r, 1500));
                } catch (e) {
                    console.error('[SCRAPER] Scroll error:', e);
                }
            }
        } else {
            await page.evaluate(() => window.scrollBy(0, 500));
            await new Promise((r) => setTimeout(r, 1000));
        }

        // EXTRACT PRODUCTS
        const allProducts = await page.evaluate(() => {
            const items: ScrapedProduct[] = [];
            const selectors = [
                '.product-miniature',
                '.product-container',
                '.product-item',
                '[data-id-product]',
                '.js-product-miniature',
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

                    // IMAGE EXTRACTION
                    let image = '';
                    if (imgEl) {
                        const candidates = [
                            imgEl.getAttribute('data-image-large-src'),
                            imgEl.getAttribute('data-src'),
                            imgEl.getAttribute('src')
                        ];
                        for (const cand of candidates) {
                            if (cand && !cand.startsWith('data:')) {
                                image = cand;
                                break;
                            }
                        }
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
                        category: 'search',
                    });
                }
            });
            return items;
        });

        log(`[SCRAPER] Found ${allProducts.length} items total`);

        // SLICE RESULTS
        const ITEMS_PER_SCROLL = 24;
        let start = 0;
        let end = allProducts.length;

        if (pageNum > 1) {
            start = (pageNum - 1) * ITEMS_PER_SCROLL;
            end = start + ITEMS_PER_SCROLL;
        } else {
            end = ITEMS_PER_SCROLL;
        }

        const pagedProducts = allProducts.slice(start, end);
        return { products: pagedProducts, logs };

    } catch (error) {
        log(`[SCRAPER] Error: ${(error as Error).message}`);
        return { products: [], logs };
    } finally {
        if (browser) {
            await (browser as any).close();
        }
    }
}
