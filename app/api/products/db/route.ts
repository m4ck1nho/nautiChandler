import { NextRequest, NextResponse } from 'next/server';
import { DbProductGrouped } from '@/lib/types';
import { parsePrice } from '@/lib/productGrouping';
import path from 'path';
import { promises as fs } from 'fs';

// Response type
interface DbProductsResponse {
  products: DbProductGrouped[];
  page: number;
  hasMore: boolean;
  total?: number;
  searchTerm?: string;
  facets?: {
    colors: string[];
    sizes: string[];
    maxPrice: number | null;
  };
  error?: string;
  source: 'json';
}

// Category mapping for robust filtering
const TARGET_CATEGORIES = [
  { name: 'electronics', aliases: ['electronic'] },
  { name: 'motor', aliases: [] },
  { name: 'ropes', aliases: ['rope'] },
  { name: 'safety', aliases: [] },
  { name: 'anchors', aliases: ['anchor', 'anchoring', 'docking'] },
  { name: 'fitting', aliases: ['fittings'] },
  { name: 'plumbing', aliases: [] },
  { name: 'painting', aliases: ['paint'] },
  { name: 'screws', aliases: ['screw'] },
  { name: 'tools', aliases: ['tool', 'machine'] },
  { name: 'electrics', aliases: ['lighting', 'electric'] },
  { name: 'maintenance', aliases: ['cleaning'] },
  { name: 'navigation', aliases: [] },
  { name: 'clothing', aliases: ['personal', 'gear', 'nautical'] },
  { name: 'life-on-board', aliases: ['life', 'board'] },
  { name: 'inflatables', aliases: ['inflatable', 'water', 'toys'] },
];

/**
 * Normalize category name to match stored data
 */
function normalizeCategory(rawCategory: string): string {
  const cat = rawCategory.toLowerCase().replace(/\s+/g, ' ').trim();

  // Direct match check
  for (const tc of TARGET_CATEGORIES) {
    if (cat === tc.name) return tc.name;
    if (tc.aliases.some(alias => cat.includes(alias))) return tc.name;
    if (cat.includes(tc.name)) return tc.name;
  }

  return cat;
}

/**
 * GET /api/products/db
 * 
 * Fetches products from static JSON file with filtering support.
 */
export async function GET(request: NextRequest): Promise<NextResponse<DbProductsResponse>> {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = parseInt(searchParams.get('per_page') || '20', 10);
    const priceMin = searchParams.get('price_min') ? parseFloat(searchParams.get('price_min')!) : undefined;
    const priceMax = searchParams.get('price_max') ? parseFloat(searchParams.get('price_max')!) : undefined;
    const inStock = searchParams.get('in_stock') === 'true';

    console.log(`[DB API] Fetching products... Query: "${query}", Category: "${category}"`, {
      inStock,
      priceMin,
      priceMax,
      page,
      perPage,
    });

    // Read products from static JSON file
    const jsonPath = path.join(process.cwd(), 'public', 'products.json');
    const fileContent = await fs.readFile(jsonPath, 'utf-8');
    const allProducts = JSON.parse(fileContent);

    let filtered = [...allProducts];

    // 1. Filter by search query
    if (query) {
      const qLower = query.toLowerCase();
      filtered = filtered.filter((p: any) =>
        (p.title && p.title.toLowerCase().includes(qLower)) ||
        (p.description && p.description.toLowerCase().includes(qLower)) ||
        (p.category && p.category.toLowerCase().includes(qLower))
      );
    }

    // 2. Filter by category
    if (category) {
      const targetCat = normalizeCategory(category);
      console.log(`[DB API] Category filter: "${category}" -> "${targetCat}"`);

      filtered = filtered.filter((p: any) => {
        const pCat = (p.category || '').toLowerCase();
        return pCat === targetCat || pCat.includes(targetCat) || targetCat.includes(pCat);
      });
    }

    // 3. Filter by price range
    if (priceMin !== undefined || priceMax !== undefined) {
      filtered = filtered.filter((p: any) => {
        const price = parsePrice(p.price);
        if (priceMin !== undefined && price < priceMin) return false;
        if (priceMax !== undefined && price > priceMax) return false;
        return true;
      });
    }

    console.log(`[DB API] Serving ${filtered.length} products from static JSON`);

    // Paginate results
    const startIndex = (page - 1) * perPage;
    const paginatedProducts = filtered.slice(startIndex, startIndex + perPage);

    // Map to DbProductGrouped format
    const mappedProducts: DbProductGrouped[] = paginatedProducts.map((p: any) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      price_numeric: parsePrice(p.price),
      image: p.image,
      link: p.link,
      description: p.description || '',
      category: p.category,
      variant_count: 1,
      min_price: parsePrice(p.price),
      max_price: parsePrice(p.price),
      available_sizes: [],
      available_colors: [],
      source: 'json'
    }));

    return NextResponse.json({
      products: mappedProducts,
      page,
      hasMore: filtered.length > startIndex + perPage,
      total: filtered.length,
      searchTerm: query || undefined,
      facets: {
        colors: [],
        sizes: [],
        maxPrice: null
      },
      source: 'json'
    });

  } catch (error) {
    console.error('[DB API] Error:', error);
    return NextResponse.json({
      products: [],
      page: 1,
      hasMore: false,
      total: 0,
      error: 'Failed to load products',
      facets: {
        colors: [],
        sizes: [],
        maxPrice: null
      },
      source: 'json'
    }, { status: 500 });
  }
}
