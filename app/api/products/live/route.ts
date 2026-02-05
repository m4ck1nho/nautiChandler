
import { NextRequest, NextResponse } from 'next/server';
import { Product, ProductWithVariants, ProductsResponse } from '@/lib/types';
import { deduplicateProducts } from '@/lib/productGrouping';
import { scrapeLiveProducts } from '@/lib/scraper';

// This route provides a **database-free**, live search endpoint.
// It scrapes nautichandler.com in real time.

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
  let targetUrl = '';

  if (DIRECT_CATEGORY_URLS[normalizedQuery]) {
    targetUrl = DIRECT_CATEGORY_URLS[normalizedQuery];
  } else if (DIRECT_CATEGORY_URLS[normalizedQuery + 's']) {
    targetUrl = DIRECT_CATEGORY_URLS[normalizedQuery + 's'];
  } else if (normalizedQuery.endsWith('s') && DIRECT_CATEGORY_URLS[normalizedQuery.slice(0, -1)]) {
    targetUrl = DIRECT_CATEGORY_URLS[normalizedQuery.slice(0, -1)];
  }

  // If found a direct category, use it
  if (targetUrl) {
    return `${targetUrl}${pageParam}`;
  }

  // 2. Fallback to generic search
  const searchPageParam = parseInt(page) > 1 ? `&p=${page}` : '';
  const baseUrl = 'https://nautichandler.com';
  if (!query) {
    return `${baseUrl}/en/search?controller=search&s=${encodeURIComponent('')}${searchPageParam}`;
  }
  return `${baseUrl}/en/search?controller=search&s=${encodeURIComponent(query)}${searchPageParam}`;
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ProductsResponse & { grouped?: ProductWithVariants[] }>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || searchParams.get('search') || '';
    const page = searchParams.get('page') || '1';
    const targetUrl = buildSearchUrl(query, page);

    console.log('[LIVE SEARCH] Starting scraper for:', targetUrl);

    // Call the scraper directly
    const { products: rawProducts, logs } = await scrapeLiveProducts(targetUrl, parseInt(page));

    // Log captured logs to server console just in case
    console.log('--- SCRAPER LOGS ---');
    logs.forEach(l => console.log(l));
    console.log('--------------------');

    // Clean pseudo-ids
    const clean = rawProducts.map((p, i) => ({
      ...p,
      id: `live-${page}-${i}-${Date.now()}`
    }));

    // Grouping logic
    let grouped: ProductWithVariants[] = [];
    try {
      grouped = deduplicateProducts(clean);
    } catch (groupError) {
      grouped = clean.map(p => ({ ...p, variantCount: 1 }));
    }

    return NextResponse.json(
      {
        products: grouped,
        grouped,
        hasMore: clean.length > 0,
        error: undefined,
        debugLogs: logs // Send logs to client for debugging
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('[LIVE SEARCH] API Error:', err);
    return NextResponse.json(
      { products: [], grouped: [], hasMore: false, error: `Internal Server Error: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
