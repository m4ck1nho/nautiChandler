import puppeteer from "@cloudflare/puppeteer";
import { createClient } from "@supabase/supabase-js";

export interface Env {
    MYBROWSER: any;
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
}

const TARGET_CATEGORIES = [
    { name: 'electronics', url: 'https://nautichandler.com/en/190-electronics' },
    { name: 'motor', url: 'https://nautichandler.com/en/100393-motor' },
    { name: 'ropes', url: 'https://nautichandler.com/en/100395-ropes' },
    { name: 'safety', url: 'https://nautichandler.com/en/100389-safety' },
    { name: 'anchors', url: 'https://nautichandler.com/en/100810-anchors' },
    { name: 'fitting', url: 'https://nautichandler.com/en/100396-fitting' },
    { name: 'plumbing', url: 'https://nautichandler.com/en/100713-plumbing' },
    { name: 'painting', url: 'https://nautichandler.com/en/100390-painting' },
    { name: 'screws', url: 'https://nautichandler.com/en/100394-screws' },
    { name: 'tools', url: 'https://nautichandler.com/en/100391-tools-machines' },
    { name: 'electrics', url: 'https://nautichandler.com/en/100392-electricslighting' },
    { name: 'maintenance', url: 'https://nautichandler.com/en/100669-maintenance-cleaning-products' },
    { name: 'navigation', url: 'https://nautichandler.com/en/100329-navigation' },
    { name: 'clothing', url: 'https://nautichandler.com/en/43-personal-equipment' },
    { name: 'life-on-board', url: 'https://nautichandler.com/en/197-life-on-board' },
    { name: 'inflatables', url: 'https://nautichandler.com/en/100911-inflatablewater-toys' }
];

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const { searchParams } = new URL(request.url);
        const categoryName = searchParams.get("category");

        const category = TARGET_CATEGORIES.find(c => c.name === categoryName) || TARGET_CATEGORIES[0];
        const url = category.url;

        let browser;
        try {
            console.log(`Launching browser for category: ${category.name} (${url})`);
            browser = await puppeteer.launch(env.MYBROWSER);
            const page = await browser.newPage();

            // Mobile-first viewport
            await page.setViewport({ width: 390, height: 844 });

            await page.goto(url, { waitUntil: "networkidle2" });

            // Scroll for lazy loading
            await page.evaluate(async () => {
                await new Promise((resolve) => {
                    let totalHeight = 0;
                    const distance = 100;
                    const timer = setInterval(() => {
                        const scrollHeight = document.body.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;
                        if (totalHeight >= scrollHeight) {
                            clearInterval(timer);
                            resolve(true);
                        }
                    }, 100);
                });
            });

            // Extract products using the logic from the original scraper
            const products = await page.evaluate((catName) => {
                const selector = '.product-miniature, .js-product-miniature';
                const elements = document.querySelectorAll(selector);
                const items: any[] = [];

                elements.forEach((el) => {
                    const titleEl = el.querySelector('.product-name a, .product-name, .product-title');
                    const priceEl = el.querySelector('.price, .product-price');
                    const imgEl = el.querySelector('.product-thumbnail img, img');
                    const linkEl = el.querySelector('.product-name a, a.thumbnail, a');

                    const title = titleEl?.textContent?.trim() || '';
                    const price = priceEl?.textContent?.trim() || '€0.00';
                    const link = (linkEl as HTMLAnchorElement)?.href || '';

                    let image = imgEl?.getAttribute('data-src') || imgEl?.getAttribute('src') || '';
                    if (image.startsWith('data:')) {
                        image = imgEl?.getAttribute('data-src') ||
                            imgEl?.getAttribute('data-image-large-src') ||
                            imgEl?.getAttribute('data-full-size-image-url') || '';
                    }

                    if (image && !image.startsWith('data:')) {
                        if (image.startsWith('//')) image = 'https:' + image;
                        else if (image.startsWith('/')) image = 'https://nautichandler.com' + image;
                    }

                    if (title && link) {
                        items.push({
                            title,
                            price,
                            image,
                            link,
                            category: catName
                        });
                    }
                });
                return items;
            }, category.name);

            // Initialize Supabase
            const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

            // Sync to 'products' table (assuming it exists based on project goals)
            const { error } = await supabase
                .from("products")
                .upsert(products.map(p => ({
                    ...p,
                    updated_at: new Date().toISOString()
                })), { onConflict: 'link' });

            if (error) {
                console.error("Supabase Error:", error.message);
                throw new Error(`Supabase Sync Failed: ${error.message}`);
            }

            return new Response(JSON.stringify({
                success: true,
                category: category.name,
                count: products.length,
                timestamp: new Date().toISOString()
            }), {
                headers: { "Content-Type": "application/json" },
            });

        } catch (e: any) {
            console.error("Worker Error:", e.message);
            return new Response(JSON.stringify({ error: e.message }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        } finally {
            if (browser) await browser.close();
        }
    },
};
