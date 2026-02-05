import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import path from 'path';
import { Product, ProductWithVariants, ProductsResponse } from '@/lib/types';
import { deduplicateProducts } from '@/lib/productGrouping';

// This route provides a **database-free**, live search endpoint.
// It scrapes nautichandler.com in real time and performs in‑memory
// grouping of product variants before returning results to the client.

// Loosened error handling:
// - No strict validation on query params
// - Never throws 500 just because params are missing

// HTTPS agent (mirrors the existing scraper behaviour)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const axiosInstance = axios.create({
  httpsAgent,
  timeout: 25000,
  maxRedirects: 5,
});

// Anti-bot headers to mimic real browser
const browserHeaders = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  Connection: 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Cache-Control': 'max-age=0',
};

// Clean helpers (copied from legacy scraper to keep behaviour identical)
function cleanPrice(price: string): string {
  return price.replace(/\s+/g, ' ').trim();
}

function cleanTitle(title: string): string {
  return title.replace(/\s+/g, ' ').trim();
}

// Generate a pseudo ID from the product link so links are stable
function generateProductId(link: string, index: number): string {
  const match = link.match(/\/(\d+)-/);
  if (match) {
    return match[1];
  }
  return `live-product-${index}-${Date.now()}`;
}

// Minimal product parser (mirrors `parseProducts` in /api/products)
function parseProducts($: cheerio.CheerioAPI): Product[] {
  const products: Product[] = [];

  const selectors = [
    '.product-miniature',
    '.product-container',
    '.product-item',
    '[data-id-product]',
    '.js-product-miniature',
  ];

  // Check if any selector matches
  let foundSelector = false;
  for (const selector of selectors) {
    if ($(selector).length > 0) {
      foundSelector = true;
      console.log(`[LIVE SEARCH] Found products using selector: ${selector} (${$(selector).length} items)`);
      break;
    }
  }

  if (!foundSelector) {
    console.warn('[LIVE SEARCH] No product selectors matched. Site structure may have changed.');
    // Try to find any product-like elements as fallback
    const fallbackCount = $('article, .product, [class*="product"]').length;
    if (fallbackCount > 0) {
      console.warn(`[LIVE SEARCH] Found ${fallbackCount} potential product elements but no matching selector.`);
    }
  }

  for (const selector of selectors) {
    $(selector).each((index, element) => {
      try {
        const $product = $(element);

        // Title + link
        let title = '';
        let link = '';
        const titleSelectors = [
          '.product-title a',
          '.product-name a',
          'h3 a',
          'h2 a',
          '.name a',
        ];
        for (const ts of titleSelectors) {
          const el = $product.find(ts).first();
          if (el.length) {
            title = cleanTitle(el.text());
            link = el.attr('href') || '';
            if (title && link) break;
          }
        }

        // Validate title was found
        if (!title) {
          console.warn('[LIVE SEARCH] Product element found but no title extracted:', selector);
        }

        // Price
        let price = '';
        const priceSelectors = [
          '.price',
          '.product-price',
          '[itemprop="price"]',
          '.current-price',
        ];
        for (const ps of priceSelectors) {
          const el = $product.find(ps).first();
          if (el.length) {
            price = cleanPrice(el.text());
            if (price) break;
          }
        }

        // Image (handle lazy loading + relative URLs)
        let image = '';
        const imgSelectors = [
          '.thumbnail-container img',
          '.product-image img',
          '.product-thumbnail img',
          '.product-cover img',
          'a.thumbnail img',
          'img.product-thumbnail-first',
          'img',
        ];

        for (const is of imgSelectors) {
          const imgElement = $product.find(is).first();
          if (imgElement.length) {
            image =
              imgElement.attr('data-src') ||
              imgElement.attr('data-full-size-image-url') ||
              imgElement.attr('data-cover') ||
              imgElement.attr('data-lazy-src') ||
              imgElement.attr('data-original') ||
              imgElement.attr('src') ||
              '';
            if (image) break;
          }
        }

        if (image) {
          image = image.trim();
          if (image.startsWith('//')) {
            image = 'https:' + image;
          } else if (image.startsWith('/')) {
            image = 'https://nautichandler.com' + image;
          } else if (!image.startsWith('http')) {
            image = 'https://nautichandler.com/' + image;
          }
          image = image.replace(/([^:])\/\//g, '$1/'); // collapse double slashes
        }

        if (title && price && link) {
          products.push({
            id: generateProductId(link, products.length),
            title,
            price,
            image,
            link,
          });
        }
      } catch (err) {
        console.error('[LIVE SEARCH] Error parsing product:', err);
      }
    });

    if (products.length > 0) break;
  }

  return products;
}

// Smart Category Mapping
const DIRECT_CATEGORY_URLS: Record<string, string> = {
  'electronics': 'https://nautichandler.com/en/190-electronics',
  'motor': 'https://nautichandler.com/en/100393-motor',
  'ropes': 'https://nautichandler.com/en/100395-ropes',
  'safety': 'https://nautichandler.com/en/100389-safety',
  'anchors': 'https://nautichandler.com/en/100810-anchors',
  'fitting': 'https://nautichandler.com/en/100396-fitting',
  'plumbing': 'https://nautichandler.com/en/100713-plumbing',
  'painting': 'https://nautichandler.com/en/100390-painting',
  'screws': 'https://nautichandler.com/en/100394-screws',
  'tools': 'https://nautichandler.com/en/100391-tools-machines',
  'electrics': 'https://nautichandler.com/en/100392-electricslighting',
  'maintenance': 'https://nautichandler.com/en/100669-maintenance-cleaning-products',
  'navigation': 'https://nautichandler.com/en/100329-navigation',
  'clothing': 'https://nautichandler.com/en/43-personal-equipment',
  'life-on-board': 'https://nautichandler.com/en/197-life-on-board',
  'inflatables': 'https://nautichandler.com/en/100911-inflatablewater-toys'
};

function buildSearchUrl(query: string, page: string = '1'): string {
  const normalizedQuery = query.toLowerCase().trim();
  const pageParam = parseInt(page) > 1 ? `?page=${page}` : '';

  // 1. Check for exact category match or simple plural/singular mapping
  // (e.g. "anchor" -> "anchors")
  let targetUrl = '';

  if (DIRECT_CATEGORY_URLS[normalizedQuery]) {
    targetUrl = DIRECT_CATEGORY_URLS[normalizedQuery];
  } else if (DIRECT_CATEGORY_URLS[normalizedQuery + 's']) {
    targetUrl = DIRECT_CATEGORY_URLS[normalizedQuery + 's'];
  } else if (normalizedQuery.endsWith('s') && DIRECT_CATEGORY_URLS[normalizedQuery.slice(0, -1)]) {
    targetUrl = DIRECT_CATEGORY_URLS[normalizedQuery.slice(0, -1)];
  }

  // If found a direct category, use it (it's much more reliable)
  if (targetUrl) {
    return `${targetUrl}${pageParam}`; // Category pages use ?page=X
  }

  // 2. Fallback to generic search
  // Note: Search controller often 500s on page 2+
  const searchPageParam = parseInt(page) > 1 ? `&p=${page}` : ''; // Search uses &p=X in some versions, or &page=
  const baseUrl = 'https://nautichandler.com';
  if (!query) {
    return `${baseUrl}/en/search?controller=search&s=${encodeURIComponent('')}${searchPageParam}`;
  }
  return `${baseUrl}/en/search?controller=search&s=${encodeURIComponent(query)}${searchPageParam}`;
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ProductsResponse & { grouped?: ProductWithVariants[] }>> {
  // Wrap EVERYTHING in try/catch to prevent any 500 errors
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || searchParams.get('search') || '';
    const page = searchParams.get('page') || '1';
    const targetUrl = buildSearchUrl(query, page);

    console.log('[LIVE SEARCH] Spawning Playwright for:', targetUrl);

    // Execute the script
    const { exec } = require('child_process');
    const scriptPath = path.join(process.cwd(), 'scripts', 'live-single-page.ts');

    // Use npx ts-node to run it
    const command = `npx ts-node "${scriptPath}" "${targetUrl}"`;

    const products: Product[] = await new Promise((resolve) => {
      exec(command, { maxBuffer: 1024 * 1024 * 5 }, (error: any, stdout: string, stderr: string) => {
        if (error) {
          console.error('[LIVE SEARCH] Script error:', stderr);
          resolve([]);
          return;
        }
        try {
          const data = JSON.parse(stdout.trim());
          // Clean pseudo-ids
          const clean = data.map((p: any, i: number) => ({
            ...p,
            id: `live-${page}-${i}-${Date.now()}` // Unique ID
          }));
          resolve(clean);
        } catch (e) {
          console.error('JSON parse error from script output:', stdout);
          resolve([]);
        }
      });
    });

    console.log(`[LIVE SEARCH] Found ${products.length} products via script`);

    // Grouping logic (re-used)
    let grouped: ProductWithVariants[] = [];
    try {
      grouped = deduplicateProducts(products);
    } catch (groupError) {
      grouped = products.map(p => ({ ...p, variantCount: 1 }));
    }

    return NextResponse.json(
      {
        products: grouped,
        grouped,
        hasMore: products.length > 0,
        error: undefined,
      },
      { status: 200 },
    );

  } catch (error) {
    console.error('[LIVE SEARCH] Unexpected error:', error);
    return NextResponse.json({ products: [], grouped: [], hasMore: false, error: 'Failed' }, { status: 200 });
  }
}
