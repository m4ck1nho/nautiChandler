import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { Product, ProductFilters } from '@/lib/types';
import { deduplicateProducts, parsePrice } from '@/lib/productGrouping';

// Response interface
interface ProductsResponse {
  products: Product[];
  page: number;
  hasMore: boolean;
  total?: number;
  error?: string;
  source?: string;
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

  for (const tc of TARGET_CATEGORIES) {
    if (cat === tc.name) return tc.name;
    if (tc.aliases.some(alias => cat.includes(alias))) return tc.name;
    if (cat.includes(tc.name)) return tc.name;
  }

  return cat;
}

/**
 * Apply filters to products
 */
function applyFilters(products: Product[], filters: ProductFilters): Product[] {
  let result = [...products];

  // Price filter
  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    result = result.filter(p => {
      const price = parsePrice(p.price);
      if (filters.priceMin !== undefined && price < filters.priceMin) return false;
      if (filters.priceMax !== undefined && price > filters.priceMax) return false;
      return true;
    });
  }

  // Sorting
  if (filters.sortBy) {
    result.sort((a, b) => {
      const priceA = parsePrice(a.price);
      const priceB = parsePrice(b.price);
      switch (filters.sortBy) {
        case 'price-asc':
          return priceA - priceB;
        case 'price-desc':
          return priceB - priceA;
        case 'name':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
  }

  return result;
}

/**
 * GET /api/products
 * 
 * Main products API - fetches from static JSON file with filtering and pagination.
 */
export async function GET(request: NextRequest): Promise<NextResponse<ProductsResponse>> {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const query = searchParams.get('q') || '';
    const categoryId = searchParams.get('category') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = parseInt(searchParams.get('per_page') || '20', 10);
    const deduplicate = searchParams.get('deduplicate') === 'true';

    // Filters
    const filters: ProductFilters = {
      priceMin: searchParams.get('price_min') ? parseFloat(searchParams.get('price_min')!) : undefined,
      priceMax: searchParams.get('price_max') ? parseFloat(searchParams.get('price_max')!) : undefined,
      sortBy: searchParams.get('sort') as ProductFilters['sortBy'] || undefined,
    };

    console.log(`[Products API] Query: "${query}", Category: "${categoryId}", Page: ${page}`);

    // Read products from static JSON file
    const jsonPath = path.join(process.cwd(), 'public', 'products.json');
    const fileContent = await fs.readFile(jsonPath, 'utf-8');
    const allProducts: Product[] = JSON.parse(fileContent);

    let products = [...allProducts];

    // Filter by category
    if (categoryId) {
      const targetCat = normalizeCategory(categoryId);
      console.log(`[Products API] Category filter: "${categoryId}" -> "${targetCat}"`);

      products = products.filter(p => {
        const pCat = (p.category || '').toLowerCase();
        return pCat === targetCat || pCat.includes(targetCat) || targetCat.includes(pCat);
      });
    }

    // Filter by search query
    if (query) {
      const qLower = query.toLowerCase();
      products = products.filter(p =>
        (p.title && p.title.toLowerCase().includes(qLower)) ||
        (p.description && p.description.toLowerCase().includes(qLower)) ||
        (p.category && p.category.toLowerCase().includes(qLower))
      );
    }

    // Apply price/sort filters
    products = applyFilters(products, filters);

    // Deduplicate if requested
    if (deduplicate) {
      products = deduplicateProducts(products);
    }

    console.log(`[Products API] Returning ${products.length} products`);

    // Paginate
    const startIndex = (page - 1) * perPage;
    const paginatedProducts = products.slice(startIndex, startIndex + perPage);

    return NextResponse.json({
      products: paginatedProducts,
      page,
      hasMore: products.length > startIndex + perPage,
      total: products.length,
      source: 'json',
    });

  } catch (error) {
    console.error('[Products API] Error:', error);
    return NextResponse.json({
      products: [],
      page: 1,
      hasMore: false,
      total: 0,
      error: 'Failed to load products',
      source: 'error',
    }, { status: 500 });
  }
}
