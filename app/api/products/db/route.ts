import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { DbProduct, DbProductGrouped, ProductFilters } from '@/lib/types';
import { parsePrice } from '@/lib/productGrouping';

interface DbProductsResponse {
  products: DbProductGrouped[];
  page: number;
  hasMore: boolean;
  total?: number;
  searchTerm?: string; // Return the search term for display
  facets?: {
    colors: string[];
    sizes: string[];
    maxPrice: number | null;
  };
  error?: string;
  source: 'database';
}

export async function GET(request: NextRequest): Promise<NextResponse<DbProductsResponse>> {
  // Parse page early for error handling
  let safePage = 1;
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    safePage = Number.isFinite(rawPage) ? Math.max(1, Math.min(rawPage, 100)) : 1;
  } catch {
    // Ignore parsing errors, use default
  }

  // Wrap EVERYTHING in try/catch to prevent any 500 errors
  try {
    const searchParams = request.nextUrl.searchParams;

    // Support both ?search= and legacy ?q=, and gently sanitize length
    let query = searchParams.get('search') || searchParams.get('q') || '';
    if (query.length > 100) {
      query = query.slice(0, 100);
    }

    const groupId = searchParams.get('groupId'); // Fetch specific group (for variants)
    const productId = searchParams.get('productId'); // Fetch single product by ID
    const deduplicate = searchParams.get('deduplicate') !== 'false'; // Default to true

    // Page & perPage with safe bounds
    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    const rawPerPage = parseInt(searchParams.get('perPage') || '20', 10);
    const page = Number.isFinite(rawPage) ? Math.max(1, Math.min(rawPage, 100)) : 1;
    const perPage = Number.isFinite(rawPerPage) ? Math.max(1, Math.min(rawPerPage, 100)) : 20;
    
    // Filter params with permissive parsing
    const priceMinParam = searchParams.get('minPrice') ?? searchParams.get('priceMin');
    const priceMaxParam = searchParams.get('maxPrice') ?? searchParams.get('priceMax');

    let priceMin: number | undefined;
    let priceMax: number | undefined;

    if (priceMinParam !== null && priceMinParam !== '') {
      const value = Number(priceMinParam);
      if (!Number.isNaN(value)) {
        priceMin = value;
      }
    }
    if (priceMaxParam !== null && priceMaxParam !== '') {
      const value = Number(priceMaxParam);
      if (!Number.isNaN(value)) {
        priceMax = value;
      }
    }

    // Support both ?sort=price_asc and legacy ?sortBy=price-asc
    const sortRaw = searchParams.get('sort') ?? searchParams.get('sortBy');
    let sortBy = sortRaw as ProductFilters['sortBy'] | undefined;
    if (sortRaw === 'price_asc') sortBy = 'price-asc';
    if (sortRaw === 'price_desc') sortBy = 'price-desc';

    const categoryRaw = searchParams.get('category');
    const category: string | undefined = categoryRaw || undefined;
    const inStock = searchParams.get('inStock') === 'true';

    const supabase = getSupabase();
    
    if (!supabase) {
      // Log env var status for debugging
      const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
      const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      console.error('Supabase not configured:', {
        hasUrl,
        hasKey,
        urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
        keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
      });
      
      return NextResponse.json({
        products: [],
        page,
        hasMore: false,
        error: 'Database not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local and restart the server.',
        source: 'database',
      }, { status: 200 }); // Changed to 200 to never crash
    }
    // MODE 1: Fetch all variants for a specific group_id (for product detail page)
    if (groupId) {
      console.log(`Fetching variants for group: ${groupId}`);
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('group_id', groupId)
        .order('price_numeric', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        return NextResponse.json({
          products: [],
          page: 1,
          hasMore: false,
          error: 'No products found for this group',
          source: 'database',
        });
      }

      // Calculate aggregate stats for the group
      const prices = data.map(d => d.price_numeric).filter(p => p != null) as number[];
      const minPrice = prices.length > 0 ? Math.min(...prices) : null;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
      const sizes = [...new Set(data.map(d => d.size).filter(Boolean))] as string[];
      const colors = [...new Set(data.map(d => d.color).filter(Boolean))] as string[];

      // Transform each variant to include group stats
      const products: DbProductGrouped[] = data.map(p => ({
        ...p,
        variant_count: data.length,
        min_price: minPrice,
        max_price: maxPrice,
        available_sizes: sizes,
        available_colors: colors,
      }));

      return NextResponse.json({
        products,
        page: 1,
        hasMore: false,
        total: products.length,
        source: 'database',
      });
    }

    // MODE 2: Fetch a single product by ID (and its group)
    if (productId) {
      console.log(`Fetching product: ${productId}`);
      
      // First get the product to find its group_id
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError || !product) {
        return NextResponse.json({
          products: [],
          page: 1,
          hasMore: false,
          error: 'Product not found',
          source: 'database',
        }, { status: 404 });
      }

      // If product has a group_id, fetch all variants
      if (product.group_id) {
        const { data: variants, error: variantsError } = await supabase
          .from('products')
          .select('*')
          .eq('group_id', product.group_id)
          .order('price_numeric', { ascending: true });

        if (!variantsError && variants && variants.length > 0) {
          const prices = variants.map(v => v.price_numeric).filter(p => p != null) as number[];
          const products: DbProductGrouped[] = variants.map(v => ({
            ...v,
            variant_count: variants.length,
            min_price: prices.length > 0 ? Math.min(...prices) : null,
            max_price: prices.length > 0 ? Math.max(...prices) : null,
            available_sizes: [...new Set(variants.map(vv => vv.size).filter(Boolean))] as string[],
            available_colors: [...new Set(variants.map(vv => vv.color).filter(Boolean))] as string[],
          }));

          return NextResponse.json({
            products,
            page: 1,
            hasMore: false,
            total: products.length,
            source: 'database',
          });
        }
      }

      // No group, return single product
      return NextResponse.json({
        products: [{
          ...product,
          variant_count: 1,
          min_price: product.price_numeric,
          max_price: product.price_numeric,
          available_sizes: product.size ? [product.size] : [],
          available_colors: product.color ? [product.color] : [],
        }],
        page: 1,
        hasMore: false,
        total: 1,
        source: 'database',
      });
    }

    // MODE 3: Search/list mode (strict deduplication via products_grouped VIEW)
    console.log(`[DB API] Fetching deduplicated products from products_grouped`, {
      query,
      category,
      inStock,
      priceMin,
      priceMax,
      sortBy,
      page,
      perPage,
    });

    let viewQuery = supabase
      .from('products_grouped')
      .select('*', { count: 'exact' });

    // Text search on title
    if (query) {
      viewQuery = viewQuery.ilike('title', `%${query}%`);
      console.log(`[DB API] Applied search filter: ilike('title', '%${query}%')`);
    } else {
      console.log(`[DB API] No search query provided, fetching all products`);
    }

    // NOTE: Cannot filter/sort by min_price in view because it's TEXT, not numeric
    // We'll filter and sort client-side after parsing

    // Category filter (this works because category is TEXT)
    if (category) {
      viewQuery = viewQuery.eq('category', category);
    }

    // In-stock only
    if (inStock) {
      viewQuery = viewQuery.eq('in_stock', true);
    }

    // Sort by title only (safe for TEXT field)
    viewQuery = viewQuery.order('title', { ascending: true });

    // Fetch more than needed so we can filter/sort client-side
    const fetchLimit = perPage * 3; // Fetch 3x to account for filtering
    viewQuery = viewQuery.range(0, fetchLimit - 1);

    const { data, error, count } = await viewQuery;

    console.log(`[DB API] Query result:`, {
      hasError: !!error,
      error: error?.message,
      dataCount: data?.length || 0,
      totalCount: count,
    });

    if (error) {
      console.error('[DB API] products_grouped VIEW error:', error);
      // Fall back to manual grouping on the base table if view fails
      try {
        console.log('[DB API] Attempting fallback query...');
        return await fallbackGroupedQuery(supabase, {
          query,
          priceMin,
          priceMax,
          category,
          inStock,
          sortBy,
          page,
          perPage,
        });
      } catch (fallbackError) {
        console.error('[DB API] Fallback query also failed:', fallbackError);
        throw fallbackError; // Will be caught by outer try/catch
      }
    }

    // Map view rows into DbProductGrouped shape and parse prices
    // Wrap mapping in try/catch to handle any parsing errors
    let products: DbProductGrouped[] = [];
    try {
      products = (data || []).map((row: any) => {
        // Parse textual min/max price (from view) into numeric values for UI
        const minNumeric = typeof row.min_price === 'string' ? parsePrice(row.min_price) : null;
        const maxNumeric = typeof row.max_price === 'string' ? parsePrice(row.max_price) : null;

        return {
          // Core DbProduct fields
          id: row.representative_id, // use representative_id as the product id for navigation
          title: row.title as string,
          price: (row.min_price as string) || '', // display price: use min_price string
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
          // Grouped stats
          variant_count: row.variant_count ?? 1,
          min_price: minNumeric,
          max_price: maxNumeric,
          available_sizes: row.available_sizes ?? [],
          available_colors: row.available_colors ?? [],
        };
      });

      // Apply price filters client-side (since view returns TEXT prices)
      if (priceMin !== undefined) {
        products = products.filter((p) => (p.min_price ?? 0) >= priceMin);
      }
      if (priceMax !== undefined) {
        products = products.filter((p) => (p.min_price ?? 0) <= priceMax);
      }

      // Apply sorting client-side
      switch (sortBy) {
        case 'price-asc':
          products.sort((a, b) => (a.min_price ?? 0) - (b.min_price ?? 0));
          break;
        case 'price-desc':
          products.sort((a, b) => (b.min_price ?? 0) - (a.min_price ?? 0));
          break;
        case 'name':
          products.sort((a, b) => a.title.localeCompare(b.title));
          break;
        default:
          // Already sorted by title from the query
          break;
      }

      // Apply pagination client-side
      const offset = (page - 1) * perPage;
      const paginatedProducts = products.slice(offset, offset + perPage);
      const hasMore = products.length > offset + perPage;

      // Build facets from the filtered result set (before pagination)
      const facetColors = new Set<string>();
      const facetSizes = new Set<string>();
      let maxFacetPrice = 0;

      for (const p of products) {
        (p.available_colors || []).forEach((c) => facetColors.add(c));
        (p.available_sizes || []).forEach((s) => facetSizes.add(s));
        if (p.max_price && p.max_price > maxFacetPrice) {
          maxFacetPrice = p.max_price;
        } else if (p.min_price && p.min_price > maxFacetPrice) {
          maxFacetPrice = p.min_price;
        }
      }

      return NextResponse.json({
        products: paginatedProducts,
        page,
        hasMore,
        total: products.length, // Use filtered count, not raw DB count
        searchTerm: query || undefined,
        facets: {
          colors: Array.from(facetColors),
          sizes: Array.from(facetSizes),
          maxPrice: maxFacetPrice || null,
        },
        source: 'database',
      });
    } catch (mappingError) {
      console.error('Error mapping/processing products:', mappingError);
      // If mapping fails, try fallback
      try {
        return await fallbackGroupedQuery(supabase, {
          query,
          priceMin,
          priceMax,
          category,
          inStock,
          sortBy,
          page,
          perPage,
        });
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        throw fallbackError; // Will be caught by outer try/catch
      }
    }

  } catch (error) {
    console.error('SEARCH API ERROR:', error);
    const message = error instanceof Error ? error.message : 'Query failed';
    // Never crash the client: return empty list with 200
    return NextResponse.json({
      products: [],
      page: safePage,
      hasMore: false,
      error: message,
      source: 'database',
    }, { status: 200 });
  }
}

// Fallback query with manual grouping when VIEW is not available
async function fallbackGroupedQuery(
  supabase: ReturnType<typeof getSupabase>,
  options: {
    query?: string;
    priceMin?: number;
    priceMax?: number;
    category?: string;
    inStock?: boolean;
    sortBy?: ProductFilters['sortBy'];
    page: number;
    perPage: number;
    deduplicate?: boolean;
  }
): Promise<NextResponse<DbProductsResponse>> {
  try {
    if (!supabase) {
      return NextResponse.json({
        products: [],
        page: options.page,
        hasMore: false,
        error: 'Database not configured',
        source: 'database',
      }, { status: 200 });
    }

    let queryBuilder = supabase
      .from('products')
      .select('*', { count: 'exact' });

    // Add search filter - use ilike for text search (not ID search)
    if (options.query) {
      queryBuilder = queryBuilder.or(`title.ilike.%${options.query}%,base_name.ilike.%${options.query}%`);
    }

    // Add price filters
    if (options.priceMin !== undefined) {
      queryBuilder = queryBuilder.gte('price_numeric', options.priceMin);
    }
    if (options.priceMax !== undefined) {
      queryBuilder = queryBuilder.lte('price_numeric', options.priceMax);
    }

    // Add category filter
    if (options.category) {
      queryBuilder = queryBuilder.eq('category', options.category);
    }

    // Add in_stock filter
    if (options.inStock) {
      queryBuilder = queryBuilder.eq('in_stock', true);
    }

    // Add sorting
    switch (options.sortBy) {
      case 'price-asc':
        queryBuilder = queryBuilder.order('price_numeric', { ascending: true, nullsFirst: false });
        break;
      case 'price-desc':
        queryBuilder = queryBuilder.order('price_numeric', { ascending: false, nullsFirst: false });
        break;
      case 'name':
        queryBuilder = queryBuilder.order('title', { ascending: true });
        break;
      default:
        queryBuilder = queryBuilder.order('created_at', { ascending: false });
    }

    // For deduplication, fetch more to ensure we have enough after grouping
    const fetchLimit = options.deduplicate !== false ? options.perPage * 3 : options.perPage;
    const offset = (options.page - 1) * options.perPage;
    
    queryBuilder = queryBuilder.range(0, offset + fetchLimit);

    const { data, error, count } = await queryBuilder;

    if (error) {
      console.error('Fallback query error:', error);
      return NextResponse.json({
        products: [],
        page: options.page,
        hasMore: false,
        error: error.message,
        source: 'database',
      }, { status: 200 });
    }

    // If not deduplicating, return raw results
    if (options.deduplicate === false) {
      const products: DbProductGrouped[] = (data || []).slice(offset, offset + options.perPage).map(p => ({
        ...p,
        variant_count: 1,
        min_price: p.price_numeric,
        max_price: p.price_numeric,
        available_sizes: p.size ? [p.size] : [],
        available_colors: p.color ? [p.color] : [],
      }));

      // Build facets from this page of results
      const facetColors = new Set<string>();
      const facetSizes = new Set<string>();
      let maxFacetPrice = 0;

      for (const p of products) {
        (p.available_colors || []).forEach((c) => facetColors.add(c));
        (p.available_sizes || []).forEach((s) => facetSizes.add(s));
        if (p.max_price && p.max_price > maxFacetPrice) {
          maxFacetPrice = p.max_price;
        } else if (p.min_price && p.min_price > maxFacetPrice) {
          maxFacetPrice = p.min_price;
        }
      }

      return NextResponse.json({
        products,
        page: options.page,
        hasMore: (count || 0) > offset + options.perPage,
        total: count || undefined,
        searchTerm: options.query || undefined,
        facets: {
          colors: Array.from(facetColors),
          sizes: Array.from(facetSizes),
          maxPrice: maxFacetPrice || null,
        },
        source: 'database',
      });
    }

    // Group products client-side by group_id
    const groupedMap = new Map<string, DbProduct[]>();
    
    for (const product of (data || [])) {
      const groupKey = product.group_id || product.id;
      if (!groupedMap.has(groupKey)) {
        groupedMap.set(groupKey, []);
      }
      groupedMap.get(groupKey)!.push(product);
    }

    // Get representative products with variant info
    const allGrouped: DbProductGrouped[] = [];
    
    for (const [, variants] of groupedMap) {
      // Sort by price and take lowest as representative
      variants.sort((a, b) => (a.price_numeric || 0) - (b.price_numeric || 0));
      const representative = variants[0];
      const prices = variants.map(v => v.price_numeric).filter(p => p != null) as number[];
      
      allGrouped.push({
        ...representative,
        variant_count: variants.length,
        min_price: prices.length > 0 ? Math.min(...prices) : null,
        max_price: prices.length > 0 ? Math.max(...prices) : null,
        available_sizes: [...new Set(variants.map(v => v.size).filter(Boolean))] as string[],
        available_colors: [...new Set(variants.map(v => v.color).filter(Boolean))] as string[],
      });
    }

    // Apply pagination to grouped results
    const paginatedProducts = allGrouped.slice(offset, offset + options.perPage);
    const hasMore = allGrouped.length > offset + options.perPage;

    // Build facets from grouped results
    const facetColors = new Set<string>();
    const facetSizes = new Set<string>();
    let maxFacetPrice = 0;

    for (const p of allGrouped) {
      (p.available_colors || []).forEach((c) => facetColors.add(c));
      (p.available_sizes || []).forEach((s) => facetSizes.add(s));
      if (p.max_price && p.max_price > maxFacetPrice) {
        maxFacetPrice = p.max_price;
      } else if (p.min_price && p.min_price > maxFacetPrice) {
        maxFacetPrice = p.min_price;
      }
    }

    return NextResponse.json({
      products: paginatedProducts,
      page: options.page,
      hasMore,
      total: allGrouped.length,
      searchTerm: options.query || undefined,
      facets: {
        colors: Array.from(facetColors),
        sizes: Array.from(facetSizes),
        maxPrice: maxFacetPrice || null,
      },
      source: 'database',
    });
  } catch (error) {
    console.error('Fallback query error:', error);
    const message = error instanceof Error ? error.message : 'Query failed';
    return NextResponse.json({
      products: [],
      page: options.page,
      hasMore: false,
      error: message,
      source: 'database',
    }, { status: 200 });
  }
}
