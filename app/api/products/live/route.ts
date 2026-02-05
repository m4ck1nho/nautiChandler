
import { NextRequest, NextResponse } from 'next/server';
import { Product, ProductWithVariants, ProductsResponse } from '@/lib/types';
import { deduplicateProducts } from '@/lib/productGrouping';
import { scrapeLiveProducts } from '@/lib/scraper';

// This route provides a **database-free**, live search endpoint.
// It scrapes nautichandler.com in real time.

// Smart Category Mapping - includes aliases for sidebar category names
const DIRECT_CATEGORY_URLS: Record<string, string> = {
  // Electronics
  'electronics': 'https://nautichandler.com/en/190-electronics',
  'electronic': 'https://nautichandler.com/en/190-electronics',

  // Motor
  'motor': 'https://nautichandler.com/en/100393-motor',
  'motors': 'https://nautichandler.com/en/100393-motor',

  // Ropes
  'ropes': 'https://nautichandler.com/en/100395-ropes',
  'rope': 'https://nautichandler.com/en/100395-ropes',

  // Safety
  'safety': 'https://nautichandler.com/en/100389-safety',

  // Anchors & Anchoring
  'anchors': 'https://nautichandler.com/en/100810-anchors',
  'anchor': 'https://nautichandler.com/en/100810-anchors',
  'anchoring': 'https://nautichandler.com/en/100800-anchorage',
  'anchorage': 'https://nautichandler.com/en/100800-anchorage',
  'anchoring & docking': 'https://nautichandler.com/en/100800-anchorage',

  // Fitting
  'fitting': 'https://nautichandler.com/en/100396-fitting',
  'fittings': 'https://nautichandler.com/en/100396-fitting',

  // Plumbing
  'plumbing': 'https://nautichandler.com/en/100713-plumbing',

  // Painting
  'painting': 'https://nautichandler.com/en/100390-painting',

  // Screws
  'screws': 'https://nautichandler.com/en/100394-screws',
  'screw': 'https://nautichandler.com/en/100394-screws',

  // Tools
  'tools': 'https://nautichandler.com/en/100391-tools-machines',
  'tool': 'https://nautichandler.com/en/100391-tools-machines',

  // Electrics & Lighting
  'electrics': 'https://nautichandler.com/en/100392-electricslighting',
  'electrics-lighting': 'https://nautichandler.com/en/100392-electricslighting',
  'lighting': 'https://nautichandler.com/en/100392-electricslighting',

  // Maintenance
  'maintenance': 'https://nautichandler.com/en/100669-maintenance-cleaning-products',
  'maintenance - cleaning products': 'https://nautichandler.com/en/100669-maintenance-cleaning-products',
  'cleaning': 'https://nautichandler.com/en/100669-maintenance-cleaning-products',

  // Navigation
  'navigation': 'https://nautichandler.com/en/100329-navigation',

  // Clothing / Personal Equipment
  'clothing': 'https://nautichandler.com/en/43-personal-equipment',
  'personal equipment': 'https://nautichandler.com/en/43-personal-equipment',

  // Life on Board
  'life-on-board': 'https://nautichandler.com/en/197-life-on-board',
  'life on board': 'https://nautichandler.com/en/197-life-on-board',
  'lifeonboard': 'https://nautichandler.com/en/197-life-on-board',

  // Inflatables
  'inflatables': 'https://nautichandler.com/en/100911-inflatablewater-toys',
  'inflatable': 'https://nautichandler.com/en/100911-inflatablewater-toys',
  'inflatable-water toys': 'https://nautichandler.com/en/100911-inflatablewater-toys',
  'water toys': 'https://nautichandler.com/en/100911-inflatablewater-toys',
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

  // 2. Fallback: Search WITHIN a broad category (bypasses the broken /search endpoint)
  // We use the main "fitting" category as a catch-all since it's large and varied.
  // The `s=` param triggers PrestaShop's in-category search which still works.
  const baseCategory = 'https://nautichandler.com/en/100396-fitting';
  const searchSuffix = `?s=${encodeURIComponent(query)}`;
  const pageParamAlt = parseInt(page) > 1 ? `&page=${page}` : '';

  return `${baseCategory}${searchSuffix}${pageParamAlt}`;
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ProductsResponse & { grouped?: ProductWithVariants[] }>> {
  try {
    const searchParams = request.nextUrl.searchParams;

    // DEBUG: Log raw params
    console.log('[LIVE API] Raw URL:', request.url);
    console.log('[LIVE API] Search Params:', Object.fromEntries(searchParams.entries()));

    // Check 'q', 'search', AND 'category'
    const query = searchParams.get('q') || searchParams.get('search') || searchParams.get('category') || '';
    const page = searchParams.get('page') || '1';

    // If it's a category filter, ensure it's lowercase for the mapping lookup
    const targetUrl = buildSearchUrl(query.toLowerCase(), page);

    console.log('[LIVE SEARCH] Starting scraper for:', targetUrl);

    // Call the scraper directly
    const { products: rawProducts, logs } = await scrapeLiveProducts(targetUrl, parseInt(page));

    // Log captured logs to server console just in case
    console.log('--- SCRAPER LOGS ---');
    logs.forEach(l => console.log(l));
    console.log('--------------------');

    // Generate stable, unique IDs based on product link (URL is unique per product)
    const clean = rawProducts.map((p, i) => {
      // Create a simple hash from the link to ensure stable IDs across requests
      const linkHash = p.link ? p.link.replace(/[^a-zA-Z0-9]/g, '').slice(-20) : `${i}`;
      return {
        ...p,
        id: `live-${page}-${linkHash}`
      };
    });

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
