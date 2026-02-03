import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
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

function buildSearchUrl(query: string): string {
  const baseUrl = 'https://nautichandler.com';
  if (!query) {
    // Fallback to homepage if no query – but we never crash
    return `${baseUrl}/en/`;
  }
  return `${baseUrl}/en/search?controller=search&s=${encodeURIComponent(query)}`;
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ProductsResponse & { grouped?: ProductWithVariants[] }>> {
  // Wrap EVERYTHING in try/catch to prevent any 500 errors
  try {
    const searchParams = request.nextUrl.searchParams;

    // Accept both ?q= and ?search= without strict validation
    const query = searchParams.get('q') || searchParams.get('search') || '';

    const targetUrl = buildSearchUrl(query);
    console.log('[LIVE SEARCH] Fetching:', targetUrl);

    let response;
    let html: string;
    let $: cheerio.CheerioAPI;

    try {
      response = await axiosInstance.get(targetUrl, {
        headers: browserHeaders,
        timeout: 30000, // 30 second timeout
      });

      html = typeof response.data === 'string' ? response.data : String(response.data);
      $ = cheerio.load(html);

      // Log HTML structure for debugging
      const bodyLength = $('body').html()?.length || 0;
      console.log(`[LIVE SEARCH] HTML received: ${bodyLength} chars, status: ${response.status}`);

      if (bodyLength < 1000) {
        console.warn('[LIVE SEARCH] HTML seems too short - might be blocked or error page');
      }
    } catch (fetchError) {
      console.error('[LIVE SEARCH] SCRAPE ERROR (fetch):', fetchError instanceof Error ? fetchError.message : fetchError);
      
      // Return graceful error - never 500
      return NextResponse.json(
        {
          products: [],
          grouped: [],
          error: 'Failed to load products from external site. Please try again later.',
        },
        { status: 200 },
      );
    }

    let products: Product[] = [];
    try {
      products = parseProducts($);
      console.log('[LIVE SEARCH] Scraped products:', products.length);

      if (products.length === 0) {
        // Log selector check for debugging
        const testSelectors = ['.product-miniature', '.product-container', '.product-item'];
        const selectorMatches = testSelectors.map(s => ({
          selector: s,
          count: $(s).length,
        }));
        console.warn('[LIVE SEARCH] No products found. Selector check:', selectorMatches);
      }
    } catch (parseError) {
      console.error('[LIVE SEARCH] SCRAPE ERROR (parse):', parseError instanceof Error ? parseError.message : parseError);
      
      // Return graceful error - never 500
      return NextResponse.json(
        {
          products: [],
          grouped: [],
          error: 'Failed to parse product data. Site structure may have changed.',
        },
        { status: 200 },
      );
    }

    if (products.length === 0) {
      // Graceful empty result – no 500s
      return NextResponse.json(
        {
          products: [],
          grouped: [],
          error: undefined,
        },
        { status: 200 },
      );
    }

    // In‑memory grouping – Samsung/MacBook style variants
    let grouped: ProductWithVariants[] = [];
    try {
      grouped = deduplicateProducts(products);
      console.log('[LIVE SEARCH] Grouped into', grouped.length, 'product groups');
    } catch (groupError) {
      console.error('[LIVE SEARCH] SCRAPE ERROR (group):', groupError instanceof Error ? groupError.message : groupError);
      // If grouping fails, return products as-is
      grouped = products.map(p => ({ ...p, variantCount: 1 }));
    }

    return NextResponse.json(
      {
        products: grouped, // we return the grouped representatives as the main list
        grouped,
        error: undefined,
      },
      { status: 200 },
    );
  } catch (error) {
    // Final catch-all - should never reach here, but just in case
    console.error('[LIVE SEARCH] SCRAPE ERROR (unexpected):', error instanceof Error ? error.message : error);

    // Never crash the client – always return 200 with an error field
    return NextResponse.json(
      {
        products: [],
        grouped: [],
        error: 'Live search failed. Please try again.',
      },
      { status: 200 },
    );
  }
}

