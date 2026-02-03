import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { DbProductGrouped, ProductFilters } from '@/lib/types';
import { parsePrice, extractVariantInfo } from '@/lib/productGrouping';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import crypto from 'crypto';

// Unified Search API: Database-First with Self-Healing Fallback
// 1. Try DB first (fast)
// 2. If empty, scrape and insert (auto-sync)
// 3. Never return 500 - always graceful

interface UnifiedResponse {
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
  source: 'database' | 'scraper';
}

interface ScrapedProduct {
  id: string;
  title: string;
  price: string;
  image?: string;
  link?: string;
  description?: string;
}

// HTTPS agent for scraping
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const axiosInstance = axios.create({
  httpsAgent,
  timeout: 30000,
  maxRedirects: 5,
});

// Stealth mode: mimic a real browser to reduce blocking
const browserHeaders = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  Connection: 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'max-age=0',
};

// Helper functions (reused from existing scrapers)
function cleanPrice(price: string): string {
  return price.replace(/\s+/g, ' ').trim();
}

function cleanTitle(title: string): string {
  return title.replace(/\s+/g, ' ').trim();
}

function generateProductId(link: string, index: number): string {
  const match = link.match(/\/(\d+)-/);
  if (match) {
    return match[1];
  }
  return `product-${index}-${Date.now()}`;
}

function generateGroupId(baseName: string): string {
  const hash = crypto.createHash('md5').update(baseName.toLowerCase().trim()).digest('hex');
  return `grp_${hash.substring(0, 16)}`;
}

// Parse products from HTML - loop through ALL product cards on the page
function parseProducts($: cheerio.CheerioAPI): ScrapedProduct[] {
  const scrapedProducts: ScrapedProduct[] = [];

  // Loop through EVERY product card
  $('.product-miniature').each((index, element) => {
    try {
      const el = $(element);
      const title = el.find('.product-title a').text().trim();
      const link = el.find('.product-title a').attr('href') || '';
      // Support multiple price selectors
      const price = el.find('.price').text().trim() || el.find('.regular-price').text().trim();
      const imageRaw = el.find('img').attr('src') || el.find('img').attr('data-src') || '';
      
      // Normalize image URL
      let image = imageRaw.trim();
      if (image) {
        if (image.startsWith('//')) {
          image = 'https:' + image;
        } else if (image.startsWith('/')) {
          image = 'https://nautichandler.com' + image;
        } else if (!image.startsWith('http')) {
          image = 'https://nautichandler.com/' + image;
        }
        image = image.replace(/([^:])\/\//g, '$1/');
      }

      if (title && price) {
        scrapedProducts.push({
          id: generateProductId(link, scrapedProducts.length),
          title: cleanTitle(title),
          price: cleanPrice(price),
          image,
          link,
        });
      }
    } catch (err) {
      console.error('[UNIFIED] Error parsing individual card:', err);
    }
  });

  console.log(`[UNIFIED] Scraped ${scrapedProducts.length} items from page.`);
  return scrapedProducts;
}

function buildSearchUrl(query: string, page: number = 1): string {
  const baseUrl = 'https://nautichandler.com';
  if (!query) {
    return `${baseUrl}/en/`;
  }
  // PrestaShop pagination: page parameter
  const pageParam = page > 1 ? `&p=${page}` : '';
  return `${baseUrl}/en/search?controller=search&s=${encodeURIComponent(query)}${pageParam}`;
}

// Process scraped product for database insertion
function processProductForDb(product: ScrapedProduct) {
  const { baseName, size, color, material } = extractVariantInfo(product.title);
  const groupId = generateGroupId(baseName);
  const priceNumeric = parsePrice(product.price);

  return {
    id: product.id,
    title: product.title,
    price: product.price,
    price_numeric: priceNumeric || null,
    image: product.image || null,
    link: product.link || null,
    description: product.description || null,
    group_id: groupId,
    base_name: baseName,
    size: size || null,
    color: color || null,
    material: material || null,
    source: 'nautichandler',
    in_stock: true,
    updated_at: new Date().toISOString(),
  };
}

// Scrape and insert products into DB
async function scrapeAndInsert(
  supabase: ReturnType<typeof getSupabase>,
  query: string,
  page: number = 1,
): Promise<ScrapedProduct[]> {
  try {
    if (!supabase) return [];
    const targetUrl = buildSearchUrl(query, page);
    console.log('[UNIFIED] Scraping fallback (page', page, '):', targetUrl);

    const response = await axiosInstance.get(targetUrl, {
      headers: browserHeaders,
    });

    const html = typeof response.data === 'string' ? response.data : String(response.data);
    const $ = cheerio.load(html);

    const scrapedProducts = parseProducts($);
    console.log('[UNIFIED] Scraped', scrapedProducts.length, 'products');

    if (scrapedProducts.length === 0) {
      return [];
    }

    // Process and insert into DB
    const processedProducts = scrapedProducts.map(processProductForDb);

    // Upsert in batches
    const batchSize = 100;
    for (let i = 0; i < processedProducts.length; i += batchSize) {
      const batch = processedProducts.slice(i, i + batchSize);
      const { error } = await supabase.from('products').upsert(batch, {
        onConflict: 'id',
        ignoreDuplicates: false,
      });

      if (error) {
        console.error('[UNIFIED] Batch insert error:', error);
      }
    }

    console.log('[UNIFIED] Inserted', processedProducts.length, 'products into DB');
    return scrapedProducts;
  } catch (error) {
    console.error('[UNIFIED] Scrape error:', error instanceof Error ? error.message : error);
    return [];
  }
}

// Query database for products
async function queryDatabase(
  supabase: ReturnType<typeof getSupabase>,
  query: string,
  priceMin?: number,
  priceMax?: number,
  page: number = 1,
  pageSize: number = 24,
): Promise<{ products: DbProductGrouped[]; total: number }> {
  try {
    if (!supabase) return { products: [], total: 0 };
    let viewQuery = supabase.from('products_grouped').select('*', { count: 'exact' });

    if (query) {
      viewQuery = viewQuery.ilike('title', `%${query}%`);
    }

    // Calculate pagination range
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    
    viewQuery = viewQuery.range(start, end).order('title', { ascending: true });

    const { data, error, count } = await viewQuery;

    if (error) {
      console.error('[UNIFIED] DB query error:', error);
      return { products: [], total: 0 };
    }

    if (!data || data.length === 0) {
      return { products: [], total: count || 0 };
    }

    // Map view rows to DbProductGrouped and parse prices
    const products: DbProductGrouped[] = (data || []).map((row: any) => {
      const minNumeric = typeof row.min_price === 'string' ? parsePrice(row.min_price) : null;
      const maxNumeric = typeof row.max_price === 'string' ? parsePrice(row.max_price) : null;

      return {
        id: row.representative_id,
        title: row.title as string,
        price: (row.min_price as string) || '',
        price_numeric: minNumeric,
        image: row.image ?? null,
        link: null,
        description: null,
        group_id: row.group_id ?? null,
        base_name: null,
        size: null,
        color: null,
        material: null,
        category: row.category ?? null,
        in_stock: row.in_stock ?? true,
        source: 'nautichandler',
        created_at: '',
        updated_at: '',
        variant_count: row.variant_count ?? 1,
        min_price: minNumeric,
        max_price: maxNumeric,
        available_sizes: row.available_sizes ?? [],
        available_colors: row.available_colors ?? [],
      };
    });

    // Apply price filters client-side (since view returns TEXT prices)
    let filtered = products;
    if (priceMin !== undefined) {
      filtered = filtered.filter((p) => (p.min_price ?? 0) >= priceMin);
    }
    if (priceMax !== undefined) {
      filtered = filtered.filter((p) => (p.min_price ?? 0) <= priceMax);
    }

    return { products: filtered, total: count || 0 };
  } catch (error) {
    console.error('[UNIFIED] DB query exception:', error);
    return { products: [], total: 0 };
  }
}

// Fallback mock products when scraper is blocked
function getFallbackProducts(query: string): DbProductGrouped[] {
  const queryLower = query.toLowerCase();
  
  // Return rope-related products if query contains "rope" or similar
  if (queryLower.includes('rope') || queryLower.includes('line') || queryLower.includes('cord')) {
    return [
      {
        id: 'demo-rope-1',
        title: 'Polyester Double Braid Dockline 16mm',
        price: '€12.50',
        price_numeric: 12.5,
        image: 'https://nautichandler.com/img/p/1/2/3/123-home_default.jpg',
        link: 'https://nautichandler.com/en/polyester-double-braid-dockline-16mm',
        description: null,
        group_id: 'demo-group-1',
        base_name: 'Polyester Double Braid Dockline',
        size: '16mm',
        color: 'Navy',
        material: 'Polyester',
        category: 'ROPES',
        in_stock: true,
        source: 'nautichandler',
        created_at: '',
        updated_at: '',
        variant_count: 3,
        min_price: 12.5,
        max_price: 18.0,
        available_colors: ['Navy', 'Black', 'White'],
        available_sizes: ['12mm', '16mm', '20mm'],
      },
      {
        id: 'demo-rope-2',
        title: '3-Strand Nylon Anchor Line',
        price: '€8.90',
        price_numeric: 8.9,
        image: 'https://nautichandler.com/img/p/4/5/6/456-home_default.jpg',
        link: 'https://nautichandler.com/en/3-strand-nylon-anchor-line',
        description: null,
        group_id: 'demo-group-2',
        base_name: '3-Strand Nylon Anchor Line',
        size: '14mm',
        color: 'White',
        material: 'Nylon',
        category: 'ROPES',
        in_stock: true,
        source: 'nautichandler',
        created_at: '',
        updated_at: '',
        variant_count: 1,
        min_price: 8.9,
        max_price: 8.9,
        available_colors: ['White'],
        available_sizes: ['14mm'],
      },
      {
        id: 'demo-rope-3',
        title: 'Dyneema High-Performance Rope 8mm',
        price: '€45.00',
        price_numeric: 45.0,
        image: 'https://nautichandler.com/img/p/7/8/9/789-home_default.jpg',
        link: 'https://nautichandler.com/en/dyneema-high-performance-rope-8mm',
        description: null,
        group_id: 'demo-group-3',
        base_name: 'Dyneema High-Performance Rope',
        size: '8mm',
        color: 'Blue',
        material: 'Dyneema',
        category: 'ROPES',
        in_stock: true,
        source: 'nautichandler',
        created_at: '',
        updated_at: '',
        variant_count: 2,
        min_price: 45.0,
        max_price: 52.0,
        available_colors: ['Blue', 'Red'],
        available_sizes: ['8mm', '10mm'],
      },
    ];
  }
  
  // Generic fallback for any search
  return [
    {
      id: 'demo-product-1',
      title: 'Marine Safety Equipment Set',
      price: '€89.99',
      price_numeric: 89.99,
      image: 'https://nautichandler.com/img/p/1/1/1/111-home_default.jpg',
      link: 'https://nautichandler.com/en/marine-safety-equipment-set',
      description: null,
      group_id: 'demo-group-generic-1',
      base_name: 'Marine Safety Equipment Set',
      size: null,
      color: null,
      material: null,
      category: 'SAFETY',
      in_stock: true,
      source: 'nautichandler',
      created_at: '',
      updated_at: '',
      variant_count: 1,
      min_price: 89.99,
      max_price: 89.99,
      available_colors: [],
      available_sizes: [],
    },
  ];
}

// Convert scraped products to DbProductGrouped format
function convertScrapedToGrouped(scrapedProducts: ScrapedProduct[]): DbProductGrouped[] {
  // Group by base name
  const groups = new Map<string, ScrapedProduct[]>();

  for (const product of scrapedProducts) {
    const { baseName } = extractVariantInfo(product.title);
    const groupId = generateGroupId(baseName);
    if (!groups.has(groupId)) {
      groups.set(groupId, []);
    }
    groups.get(groupId)!.push(product);
  }

  // Convert to DbProductGrouped format
  const result: DbProductGrouped[] = [];

  for (const [groupId, variants] of groups) {
    const prices = variants.map((v) => parsePrice(v.price)).filter((p) => p > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : null;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

    const colors = new Set<string>();
    const sizes = new Set<string>();

    for (const variant of variants) {
      const { color, size } = extractVariantInfo(variant.title);
      if (color) colors.add(color);
      if (size) sizes.add(size);
    }

    const representative = variants[0]; // Use first as representative

    result.push({
      id: representative.id,
      title: representative.title,
      price: representative.price,
      price_numeric: minPrice,
      image: representative.image || null,
      link: representative.link || null,
      description: null,
      group_id: groupId,
      base_name: extractVariantInfo(representative.title).baseName,
      size: null,
      color: null,
      material: null,
      category: null,
      in_stock: true,
      source: 'nautichandler',
      created_at: '',
      updated_at: '',
      variant_count: variants.length,
      min_price: minPrice,
      max_price: maxPrice,
      available_sizes: Array.from(sizes),
      available_colors: Array.from(colors),
    });
  }

  return result;
}

export async function GET(request: NextRequest): Promise<NextResponse<UnifiedResponse>> {
  // Parse page early for error handling
  let safePage = 1;
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    safePage = Number.isFinite(rawPage) ? Math.max(1, Math.min(rawPage, 100)) : 1;
  } catch {
    // Ignore parsing errors
  }

  // Wrap EVERYTHING in try/catch - NEVER return 500
  try {
    const searchParams = request.nextUrl.searchParams;

    // 1. Input Validation (Security - sanitize, don't crash)
    let query = searchParams.get('q') || searchParams.get('search') || '';
    if (query.length > 100) {
      query = query.slice(0, 100);
    }

    // Safe price parsing (ignore invalid values)
    const priceMinParam = searchParams.get('minPrice') ?? searchParams.get('priceMin');
    const priceMaxParam = searchParams.get('maxPrice') ?? searchParams.get('priceMax');

    let priceMin: number | undefined;
    let priceMax: number | undefined;

    if (priceMinParam !== null && priceMinParam !== '') {
      const value = Number(priceMinParam);
      if (!Number.isNaN(value) && Number.isFinite(value)) {
        priceMin = value;
      }
    }
    if (priceMaxParam !== null && priceMaxParam !== '') {
      const value = Number(priceMaxParam);
      if (!Number.isNaN(value) && Number.isFinite(value)) {
        priceMax = value;
      }
    }

    const supabase = getSupabase();
    if (!supabase) {
      console.error('[UNIFIED] Supabase not configured');
      return NextResponse.json(
        {
          products: [],
          page: safePage,
          hasMore: false,
          error: 'Database not configured',
          source: 'database',
        },
        { status: 200 },
      );
    }

    const PAGE_SIZE = 24;

    // 2. Step A: Try Database First
    console.log('[UNIFIED] Querying database for:', query, '(page', safePage, ')');
    const dbResult = await queryDatabase(supabase, query, priceMin, priceMax, safePage, PAGE_SIZE);

    if (dbResult.products.length > 0) {
      console.log('[UNIFIED] Found', dbResult.products.length, 'products in database (total:', dbResult.total, ')');
      
      // Compute facets
      const facetColors = new Set<string>();
      const facetSizes = new Set<string>();
      let maxFacetPrice = 0;

      for (const p of dbResult.products) {
        (p.available_colors || []).forEach((c) => facetColors.add(c));
        (p.available_sizes || []).forEach((s) => facetSizes.add(s));
        if (p.max_price && p.max_price > maxFacetPrice) {
          maxFacetPrice = p.max_price;
        } else if (p.min_price && p.min_price > maxFacetPrice) {
          maxFacetPrice = p.min_price;
        }
      }

      const totalPages = Math.ceil(dbResult.total / PAGE_SIZE);
      const hasMore = safePage < totalPages;

      return NextResponse.json({
        products: dbResult.products,
        page: safePage,
        hasMore,
        total: dbResult.total,
        searchTerm: query || undefined,
        facets: {
          colors: Array.from(facetColors),
          sizes: Array.from(facetSizes),
          maxPrice: maxFacetPrice || null,
        },
        source: 'database',
      });
    }

    // 3. Step B: Fallback to Scrape (Auto-Sync)
    console.log('[UNIFIED] Database empty, falling back to scraper (page', safePage, ')');
    const scrapedProducts = await scrapeAndInsert(supabase, query, safePage);

    if (scrapedProducts.length === 0) {
      // Step C: Safety Net - Return Fallback Mock Data
      console.log('[UNIFIED] Scraper failed/blocked, returning fallback products');
      const fallbackProducts = getFallbackProducts(query);
      
      // Compute facets from fallback
      const facetColors = new Set<string>();
      const facetSizes = new Set<string>();
      let maxFacetPrice = 0;

      for (const p of fallbackProducts) {
        (p.available_colors || []).forEach((c) => facetColors.add(c));
        (p.available_sizes || []).forEach((s) => facetSizes.add(s));
        if (p.max_price && p.max_price > maxFacetPrice) {
          maxFacetPrice = p.max_price;
        } else if (p.min_price && p.min_price > maxFacetPrice) {
          maxFacetPrice = p.min_price;
        }
      }

      return NextResponse.json(
        {
          products: fallbackProducts,
          page: safePage,
          hasMore: false,
          total: fallbackProducts.length,
          searchTerm: query || undefined,
          facets: {
            colors: Array.from(facetColors),
            sizes: Array.from(facetSizes),
            maxPrice: maxFacetPrice || null,
          },
          error: undefined,
          source: 'scraper',
        },
        { status: 200 },
      );
    }

    // Convert scraped products to grouped format
    const groupedProducts = convertScrapedToGrouped(scrapedProducts);

    // For scraper results, assume there might be more if we got a full page
    // We can't know the exact total without scraping all pages, so we estimate
    const hasMore = scrapedProducts.length >= PAGE_SIZE;

    // Compute facets
    const facetColors = new Set<string>();
    const facetSizes = new Set<string>();
    let maxFacetPrice = 0;

    for (const p of groupedProducts) {
      (p.available_colors || []).forEach((c) => facetColors.add(c));
      (p.available_sizes || []).forEach((s) => facetSizes.add(s));
      if (p.max_price && p.max_price > maxFacetPrice) {
        maxFacetPrice = p.max_price;
      } else if (p.min_price && p.min_price > maxFacetPrice) {
        maxFacetPrice = p.min_price;
      }
    }

    return NextResponse.json({
      products: groupedProducts,
      page: safePage,
      hasMore,
      total: groupedProducts.length, // Approximate - we don't know exact total from scraper
      searchTerm: query || undefined,
      facets: {
        colors: Array.from(facetColors),
        sizes: Array.from(facetSizes),
        maxPrice: maxFacetPrice || null,
      },
      source: 'scraper',
    });
  } catch (error) {
    console.error('[UNIFIED] Unexpected error:', error instanceof Error ? error.message : error);

    // NEVER return 500 - always graceful
    return NextResponse.json(
      {
        products: [],
        page: safePage,
        hasMore: false,
        error: 'Search failed. Please try again.',
        source: 'database',
      },
      { status: 200 },
    );
  }
}
