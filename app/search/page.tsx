 'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal } from 'lucide-react';
import { DbProductGrouped } from '@/lib/types';
import { parsePrice } from '@/lib/productGrouping';
import { Navbar } from '@/components/layout/Navbar';
import { SearchSidebar, SearchSidebarFilters } from '@/components/search/SearchSidebar';
import { ProductGrid, ViewMode } from '@/components/search/ProductGrid';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

interface Facets {
  colors: string[];
  sizes: string[];
  maxPrice: number | null;
}

interface UnifiedSearchResponse {
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

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const searchTerm = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10) || 1;

  // Raw products from API (full list, never filtered)
  const [rawProducts, setRawProducts] = useState<DbProductGrouped[]>([]);
  const [apiFacets, setApiFacets] = useState<Facets | null>(null);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [hasMore, setHasMore] = useState(false);
  
  // Filter state (client-side only, no API calls)
  const [priceMin, setPriceMin] = useState<number | undefined>();
  const [priceMax, setPriceMax] = useState<number | undefined>();
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState<'price_asc' | 'price_desc' | 'newest'>('price_asc');
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Compute facets from rawProducts (colors, sizes, maxPrice)
  const facets = useMemo<Facets>(() => {
    // If API returned facets, use them
    if (apiFacets) {
      return apiFacets;
    }

    // Otherwise compute from products
    const colors = new Set<string>();
    const sizes = new Set<string>();
    let maxPrice = 0;

    rawProducts.forEach((p) => {
      // Extract colors from available_colors (DbProductGrouped format)
      if (p.available_colors) {
        p.available_colors.forEach((c) => colors.add(c));
      }
      // Extract sizes from available_sizes
      if (p.available_sizes) {
        p.available_sizes.forEach((s) => sizes.add(s));
      }
      // Track max price
      const price = p.min_price || parsePrice(p.price);
      if (price > maxPrice) maxPrice = price;
    });

    return {
      colors: Array.from(colors).sort(),
      sizes: Array.from(sizes).sort(),
      maxPrice: maxPrice > 0 ? maxPrice : null,
    };
  }, [rawProducts]);

  // Compute categories from rawProducts
  const categoryFacet = useMemo(() => {
    // ProductWithVariants doesn't have category, so we'll leave this empty for now
    // If needed, we can extract from product title or add category extraction logic
    return [];
  }, [rawProducts]);

  // Fetch products when search term or page changes
  useEffect(() => {
    if (!searchTerm) {
      setRawProducts([]);
      setApiFacets(null);
      setError(null);
      setTotalProducts(0);
      setHasMore(false);
      return;
    }

    async function fetchResults() {
      setIsLoading(true);
      setError(null);

      try {
        const url = `/api/products/unified?q=${encodeURIComponent(searchTerm)}&page=${currentPage}`;
        console.log('[SEARCH PAGE] Fetching from unified API:', url);
        
        const res = await fetch(url);
        const data: UnifiedSearchResponse = await res.json();

        console.log('[SEARCH PAGE] API response:', {
          ok: res.ok,
          status: res.status,
          productCount: data.products?.length || 0,
          total: data.total,
          page: data.page,
          hasMore: data.hasMore,
          source: data.source,
          hasError: !!data.error,
        });

        if (data.error) {
          setError(data.error);
          setRawProducts([]);
          setApiFacets(null);
          setTotalProducts(0);
          setHasMore(false);
        } else {
          setRawProducts(data.products || []);
          setTotalProducts(data.total || 0);
          setHasMore(data.hasMore || false);
          if (data.facets) {
            setApiFacets(data.facets);
          }
          console.log('[SEARCH PAGE] Loaded', data.products?.length || 0, 'products from', data.source);
          
          // Scroll to top when page changes
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } catch (err) {
        console.error('[SEARCH PAGE] Fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load products');
        setRawProducts([]);
        setApiFacets(null);
        setTotalProducts(0);
        setHasMore(false);
      } finally {
        setIsLoading(false);
      }
    }

    fetchResults();
  }, [searchTerm, currentPage]); // Depend on both searchTerm and currentPage

  // Client-side filtering: filter rawProducts based on all filter states
  const filteredProducts = useMemo(() => {
    let filtered = [...rawProducts];

    // Price filter
    if (priceMin !== undefined || priceMax !== undefined) {
      filtered = filtered.filter((p) => {
        const price = parsePrice(p.price);
        if (priceMin !== undefined && price < priceMin) return false;
        if (priceMax !== undefined && price > priceMax) return false;
        return true;
      });
    }

    // Color filter (check available_colors - DbProductGrouped format)
    if (selectedColors.length > 0) {
      filtered = filtered.filter((p) => {
        const colors = p.available_colors || [];
        return colors.some((c) => selectedColors.includes(c));
      });
    }

    // Size filter (check available_sizes - DbProductGrouped format)
    if (selectedSizes.length > 0) {
      filtered = filtered.filter((p) => {
        const sizes = p.available_sizes || [];
        return sizes.some((s) => selectedSizes.includes(s));
      });
    }

    // Category filter (not available in ProductWithVariants, skip for now)
    // if (selectedCategory) {
    //   filtered = filtered.filter((p) => p.category === selectedCategory);
    // }

    // In-stock filter (all products from live API are assumed in stock)
    // if (inStock) {
    //   filtered = filtered.filter((p) => p.in_stock);
    // }

    // Client-side sorting (use min_price for DbProductGrouped)
    switch (sort) {
      case 'price_asc':
        filtered.sort((a, b) => (a.min_price ?? parsePrice(a.price)) - (b.min_price ?? parsePrice(b.price)));
        break;
      case 'price_desc':
        filtered.sort((a, b) => (b.min_price ?? parsePrice(b.price)) - (a.min_price ?? parsePrice(a.price)));
        break;
      case 'newest':
        // No timestamp in DbProductGrouped, keep original order
        break;
      default:
        break;
    }

    return filtered;
  }, [rawProducts, priceMin, priceMax, selectedColors, selectedSizes, sort]);


  // Handle filter changes - update state only (no API call, no URL update)
  const handleFiltersChange = (next: SearchSidebarFilters) => {
    setPriceMin(next.priceMin);
    setPriceMax(next.priceMax);
    setInStock(next.inStock);
    setSelectedColors(next.selectedColors);
    setSelectedSizes(next.selectedSizes);
    setSelectedCategory(next.selectedCategory);
    // Filters are applied client-side via filteredProducts useMemo
    // No router.push - instant filtering without page reload
  };

  // Handle sort changes - update state only (no API call, no URL update)
  const handleSortChange = (nextSort: 'price_asc' | 'price_desc' | 'newest') => {
    setSort(nextSort);
    // Sorting is applied client-side via filteredProducts useMemo
    // No router.push - instant sorting without page reload
  };

  // Handle pagination - update URL which triggers fetch
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`/search?${params.toString()}`);
  };

  // Calculate pagination info
  const PAGE_SIZE = 24;
  const totalPages = Math.ceil(totalProducts / PAGE_SIZE) || 1;

  // Initial "hero" state: only search bar, no products
  if (!searchTerm) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="min-h-screen bg-white pt-20 px-4 md:px-6 relative z-0">
          <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
            <div className="w-full max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-bold text-black mb-4">
              Search for anything on board
            </h1>
            <p className="text-sm text-zinc-500 mb-6">
              Type a product name (e.g. &quot;cable&quot;, &quot;Wurth tape&quot;, &quot;rope&quot;) to see grouped
              results with filters.
            </p>
            <p className="text-xs text-zinc-400 mb-4">
              Products are fetched from database with automatic fallback to live scraping.
            </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="min-h-screen bg-white pt-20 px-4 md:px-6 relative z-0">
        <div className="max-w-7xl mx-auto">
          {/* Mobile filter summary + button */}
        <div className="flex items-center justify-between mb-4 lg:hidden">
          <p className="text-xs text-zinc-500">
            {filteredProducts.length} results for &quot;{searchTerm}&quot;
          </p>
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-zinc-200 text-xs font-medium text-zinc-700 bg-white"
          >
            <SlidersHorizontal className="w-3 h-3" />
            Filters
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Sidebar filters (desktop) */}
          <aside className="hidden lg:block w-64 flex-shrink-0 pt-2">
            <SearchSidebar
              facets={facets}
              categories={categoryFacet}
              priceMin={priceMin}
              priceMax={priceMax}
              inStock={inStock}
              selectedColors={selectedColors}
              selectedSizes={selectedSizes}
              selectedCategory={selectedCategory}
              onChange={handleFiltersChange}
            />
          </aside>

          {/* Main results area */}
          <div className="flex-1">
            <ProductGrid
              searchTerm={searchTerm}
              products={rawProducts}
              filteredProducts={filteredProducts}
              sort={sort}
              viewMode={viewMode}
              isLoading={isLoading}
              error={error}
              onChangeSort={handleSortChange}
              onChangeViewMode={setViewMode}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-4">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isLoading}
                  className="px-4 py-2 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-700 bg-white hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-zinc-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!hasMore || isLoading || currentPage >= totalPages}
                  className="px-4 py-2 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-700 bg-white hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Filter Drawer */}
        <Drawer open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Filters</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4">
              <SearchSidebar
                facets={facets}
                categories={categoryFacet}
                priceMin={priceMin}
                priceMax={priceMax}
                inStock={inStock}
                selectedColors={selectedColors}
                selectedSizes={selectedSizes}
                selectedCategory={selectedCategory}
                onChange={handleFiltersChange}
              />
            </div>
          </DrawerContent>
        </Drawer>
        </div>
      </main>
    </div>
  );
}

