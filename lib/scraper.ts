
// Singleton cache for local development
let localBrowserInstance: any = null;

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
        const isVercel = !!process.env.VERCEL;
        const isRailway = !!process.env.RAILWAY_ENVIRONMENT || !!process.env.RAILWAY_PROJECT_ID;
        const isProduction = process.env.NODE_ENV === 'production';
        const isLocal = !isVercel && !isRailway && !isProduction;

        log(`[SCRAPER] Environment: Vercel=${isVercel}, Railway=${isRailway}, Local=${isLocal}`);

        // Vercel serverless doesn't work well with Puppeteer - skip
        if (isVercel) {
            log('[SCRAPER] Vercel detected - skipping live scraping (serverless limitations)');
            return { products: [], logs };
        }

        // RAILWAY (Container) - Use system Chromium from Docker
        if (isRailway || isProduction) {
            log(`[SCRAPER] Launching in PRODUCTION/RAILWAY mode for Page ${pageNum}`);
            const puppeteerCore = (await import('puppeteer-core')).default;

            // Use system Chromium installed via Dockerfile
            const execPath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';
            log(`[SCRAPER] Using system Chromium at: ${execPath}`);

            browser = await puppeteerCore.launch({
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--single-process'
                ],
                executablePath: execPath,
                headless: true,
            });
            log('[SCRAPER] Browser launched successfully!');
        } else {
            // LOCAL: Use standard puppeteer with bundled Chromium
            log(`[SCRAPER] Launching in LOCAL mode for Page ${pageNum}`);
            if (!localBrowserInstance) {
                const { default: puppeteer } = await import('puppeteer');
                localBrowserInstance = puppeteer;
            }

            browser = await localBrowserInstance.launch({
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                headless: false, // VISUAL DEBUGGING
                defaultViewport: null,
            });
        }


        const page = await (browser as any).newPage();

        // --- MANUAL STEALTH EVASION ---
        await page.evaluateOnNewDocument(() => {
            // Pass the Webdriver Test
            Object.defineProperty(navigator, 'webdriver', { get: () => false });

            // Pass the Chrome Test
            // @ts-ignore
            window.chrome = { runtime: {} };

            // Pass the Permissions Test
            const originalQuery = window.navigator.permissions.query;
            // @ts-ignore
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: 'denied' }) :
                    originalQuery(parameters)
            );

            // Pass the Plugins Length Test
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });

            // Pass the Languages Test
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        });

        // Optimize navigation
        await page.setViewport({ width: 1366, height: 768 });
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        // Set extra headers to mimic real browser
        await page.setExtraHTTPHeaders({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
        });

        // Navigate with retry logic
        log(`[SCRAPER] Navigating to ${url}`);
        let response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // If 500, retry once after a delay
        if (response?.status() === 500) {
            log('[SCRAPER] Got 500, retrying after 2s...');
            await new Promise(r => setTimeout(r, 2000));
            response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        }

        log(`[SCRAPER] Status: ${response?.status()}`);

        const title = await page.title();
        log(`[SCRAPER] Title: ${title}`);

        // EXTRACT PRODUCTS HELPER
        const countItems = async () => {
            return await page.evaluate(() => {
                const selectors = [
                    '.product-miniature',
                    '.product-container',
                    '.product-item',
                    '[data-id-product]',
                    '.js-product-miniature'
                ];
                for (const s of selectors) {
                    const len = document.querySelectorAll(s).length;
                    if (len > 0) return len;
                }
                return 0;
            });
        };

        // POPUP DISMISSAL - CONTINUOUS KILLER
        const dismissPopups = async () => {
            log('[SCRAPER] Killer: Injecting continuous popup removal script...');

            await page.evaluate(() => {
                // Run this logic every 500ms to catch late-rendering popups
                const intervalId = setInterval(() => {
                    // 1. Remove Host Elements (Main DOM)
                    const hosts = ['#usercentrics-root', '#CybotCookiebotDialog', '#cookiebanner', '.popup-overlay'];
                    hosts.forEach(sel => {
                        const el = document.querySelector(sel);
                        if (el) el.remove();
                    });

                    // 2. Deep Shadow DOM Traversal to find "Fixed" overlays
                    function nukeFixed(root: Document | Element | ShadowRoot) {
                        // Get all elements in this root
                        const all = root.querySelectorAll('*'); // Expensive but necessary
                        all.forEach(el => {
                            if (el.shadowRoot) {
                                nukeFixed(el.shadowRoot); // Recurse
                            }

                            // Check style
                            try {
                                const style = window.getComputedStyle(el);
                                if ((style.position === 'fixed' || style.position === 'absolute') && parseInt(style.zIndex) > 999) {
                                    // Safety: Don't remove header/nav if they are high z-index
                                    if (el.tagName !== 'HEADER' && el.tagName !== 'NAV' && !el.classList.contains('header')) {
                                        el.remove();
                                    }
                                }
                            } catch (e) { /* ignore */ }
                        });
                    }
                    nukeFixed(document);

                    // 3. Force Scroll Unlock
                    document.documentElement.style.setProperty('overflow', 'initial', 'important');
                    document.body.style.setProperty('overflow', 'initial', 'important');
                }, 500);

                // Stop after 30 seconds
                setTimeout(() => clearInterval(intervalId), 30000);
            });

            // Wait a bit to let the killer work
            await new Promise(r => setTimeout(r, 2000));
        };

        // HUMAN SCROLL LOGIC
        const scrollSmoothly = async (targetCount: number, maxTimeMs: number) => {
            await dismissPopups(); // Start the killer ONCE

            const startTime = Date.now();
            let count = await countItems();

            while (count < targetCount && (Date.now() - startTime) < maxTimeMs) {
                await page.evaluate(() => {
                    const distance = 300;
                    window.scrollBy(0, distance);
                });

                await new Promise(r => setTimeout(r, 300));

                if (Math.random() > 0.8) {
                    const newCount = await countItems();
                    if (newCount > count) {
                        count = newCount;
                        log(`[SCRAPER] Loaded more! Count now: ${count}`);
                    }
                }
            }
            return count;
        };

        // HYBRID NAVIGATION STRATEGY
        // 1. If Infinite Scroll (Search): Scroll to load.
        // 2. If Standard Pagination (Category): Reload with ?page=N.

        let isStandardPagination = false;
        if (pageNum > 1) {
            // Check for pagination element
            isStandardPagination = await page.evaluate(() => {
                return !!document.querySelector('.pagination, .page-list, #pagination');
            });

            // If we suspect standard pagination (or if it's not explicitly search), try URL param
            // Note: Some search pages might ALSO have pagination as fallback, but we prefer scroll if possible.
            // A strong signal for "Category" is if the URL doesn't contain "search" or "s=".
            const currentUrl = page.url();
            const isCategoryUrl = !currentUrl.includes('search') && !currentUrl.includes('s=');

            if (isCategoryUrl || isStandardPagination) {
                log('[SCRAPER] Detected Standard Pagination / Category Page.');

                // Robust URL Construction
                const urlObj = new URL(currentUrl);
                urlObj.searchParams.set('page', pageNum.toString());
                const targetUrl = urlObj.toString();

                log(`[SCRAPER] Navigating directly to Page ${pageNum}: ${targetUrl}`);
                await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

                // On discrete pages, we don't need to scroll massively, just normal extraction.
                // But we should still dismiss popups in case they block visibility.
                await dismissPopups();
            } else {
                log('[SCRAPER] Detected Infinite Scroll / Search Page.');
                const target = pageNum * 24;
                log(`[SCRAPER] Scrolling to find target ${target}...`);
                await scrollSmoothly(target, 25000);
            }
        } else {
            await dismissPopups();
            await page.evaluate(() => window.scrollBy(0, 500));
            await new Promise((r) => setTimeout(r, 1000));
        }

        // EXTRACT PRODUCTS
        const allProducts = await page.evaluate(() => {
            const items: ScrapedProduct[] = [];
            let selector = '';

            // Try specific selectors clearly
            const candidates = [
                '#js-product-list .product-miniature',
                '.products .product-miniature',
                '.product-miniature',
                '.product-container',
                '.product-item'
            ];

            for (const s of candidates) {
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

        if (allProducts.length === 0) {
            log('[SCRAPER] 0 items found! Taking screenshot debug-failed-scrape.png');
            // Try/Catch for screenshot to avoid crashing if path is invalid or permission denied
            try {
                await page.screenshot({ path: 'debug-failed-scrape.png', fullPage: true });
                const html = await page.content();
                const fs = await import('fs');
                fs.writeFileSync('debug-failed-scrape.html', html);
                log('[SCRAPER] HTML dumped to debug-failed-scrape.html');
            } catch (err) {
                log(`[SCRAPER] Debug export failed: ${(err as Error).message}`);
            }
        }

        // SLICE RESULTS - ADAPTIVE STRATEGY
        // The site uses two modes:
        // 1. "Search": Infinite Scroll (Cumulative). Page 2 needs items 25-48.
        // 2. "Category": Standard Pagination (Discrete). ?page=2 loads items 25-48 directly as a standalone list of ~24.

        const ITEMS_PER_PAGE = 24;
        let pagedProducts: ScrapedProduct[] = [];

        log(`[SCRAPER] Total items found: ${allProducts.length}. Determining slice strategy...`);

        if (allProducts.length > ITEMS_PER_PAGE) {
            // Case A: Cumulative (Infinite Scroll)
            // We have >24 items, so likely we scrolled and accumulated 1..N pages.
            // We need to slice the specific segment for the requested page.
            log('[SCRAPER] Mode: CUMULATIVE (Infinite Scroll detected)');
            let start = 0;
            let end = allProducts.length;

            if (pageNum > 1) {
                start = (pageNum - 1) * ITEMS_PER_PAGE;
                end = start + ITEMS_PER_PAGE;
                // Safety: if start is beyond length, just take last page worth
                if (start >= allProducts.length) {
                    start = Math.max(0, allProducts.length - ITEMS_PER_PAGE);
                    end = allProducts.length;
                }
            } else {
                end = ITEMS_PER_PAGE;
            }
            pagedProducts = allProducts.slice(start, end);

        } else {
            // Case B: Discrete (Standard Pagination)
            // We have <=24 items. This likely means ?page=X worked directly and gave us just that page's items.
            // Return them all (do NOT offset by pageNum * 24, or we'd get empty list).
            log('[SCRAPER] Mode: DISCRETE (Standard Pagination detected)');
            pagedProducts = allProducts;
        }

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
