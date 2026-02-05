'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Product, DbProductGrouped } from '@/lib/types';

// Union type for products from either API
type AnyProduct = Product | DbProductGrouped;

interface UseProductSearchResult {
  products: AnyProduct[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
  searchTerm: string; // The actual search text (for display)
  source: 'database' | 'scraper' | null;
  search: (query: string, category?: string) => void;
  loadMore: () => void;
  reset: () => void;
}

interface UseProductSearchOptions {
  useDatabase?: boolean; // Whether to try database first (default: true)
  deduplicate?: boolean; // Whether to group variants (default: true)
}

export function useProductSearch(
  initialQuery: string = '',
  options: UseProductSearchOptions = {}
): UseProductSearchResult {
  const { useDatabase = true, deduplicate = true } = options;

  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<string | undefined>();
  const [products, setProducts] = useState<AnyProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [source, setSource] = useState<'database' | 'scraper' | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch products from database API
  const fetchFromDatabase = useCallback(async (
    searchQuery: string,
    pageNum: number,
    signal: AbortSignal
  ): Promise<{ products: AnyProduct[]; hasMore: boolean; searchTerm?: string } | null> => {
    try {
      const params = new URLSearchParams();

      if (searchQuery && searchQuery !== 'featured') {
        params.set('q', searchQuery);
      }
      if (category) {
        params.set('category', category);
      }

      params.set('page', pageNum.toString());
      params.set('deduplicate', deduplicate ? 'true' : 'false');

      const response = await fetch(`/api/products/db?${params.toString()}`, { signal });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      if (data.error || !data.products || data.products.length === 0) {
        return null;
      }

      return {
        products: data.products,
        hasMore: data.hasMore ?? false,
        searchTerm: data.searchTerm || searchQuery,
      };
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.log('Database fetch failed, will try scraper:', err.message);
      }
      return null;
    }
  }, [deduplicate, category]); // Added category dependency

  // Fetch products from scraper API (fallback)
  const fetchFromScraper = useCallback(async (
    searchQuery: string,
    pageNum: number,
    cat: string | undefined, // Changed from catUrl
    signal: AbortSignal
  ): Promise<{ products: AnyProduct[]; hasMore: boolean } | null> => {
    try {
      const params = new URLSearchParams();

      if (searchQuery) {
        if (searchQuery === 'featured' || !searchQuery) {
          params.set('featured', 'true');
        } else {
          params.set('q', searchQuery);
        }
      } else {
        params.set('featured', 'true');
      }

      if (cat) {
        params.set('category', cat);
      }

      params.set('page', pageNum.toString());
      params.set('deduplicate', deduplicate ? 'true' : 'false');

      const response = await fetch(`/api/products/live?${params.toString()}`, { signal });

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`);
      }

      const data = await response.json();

      // Use grouped data if available, otherwise raw products
      const productsData = data.grouped || data.products || [];

      return {
        products: productsData,
        hasMore: data.hasMore ?? false,
      };
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        throw err;
      }
      return null;
    }
  }, [deduplicate]);

  // Main fetch function
  const fetchProducts = useCallback(async (
    searchQuery: string,
    pageNum: number = 1,
    cat?: string,
    append: boolean = false
  ) => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    if (pageNum === 1) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      let result: { products: AnyProduct[]; hasMore: boolean; searchTerm?: string } | null = null;
      let dataSource: 'database' | 'scraper' = 'scraper';

      // Try database first if enabled
      if (useDatabase) {
        result = await fetchFromDatabase(searchQuery, pageNum, signal);
        if (result) {
          dataSource = 'database';
        }
      }

      // Fall back to scraper if database didn't work
      if (!result) {
        result = await fetchFromScraper(searchQuery, pageNum, cat, signal);
        dataSource = 'scraper';
      }

      if (!result) {
        setError('Failed to fetch products');
        if (!append) setProducts([]);
        return;
      }

      const newProducts = result.products;
      setSource(dataSource);
      setSearchTerm(result.searchTerm || searchQuery);

      if (append) {
        // Append products, avoiding duplicates by ID
        setProducts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueNew = newProducts.filter(p => !existingIds.has(p.id));
          return [...prev, ...uniqueNew];
        });
      } else {
        setProducts(newProducts);
      }

      // Hybrid Pagination Logic:
      // If we are serving from 'database' (static cache), ALWAYS assume there might be more on the live site.
      // This ensures the "Load More" button remains visible even if the DB returns a partial page (e.g. 3 items).
      // When the user clicks it, the next fetch will fail DB and fallback to Scraper.
      let finalHasMore = result.hasMore;
      if (dataSource === 'database') {
        finalHasMore = true;
      }
      setHasMore(finalHasMore);
      setPage(pageNum);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [useDatabase, fetchFromDatabase, fetchFromScraper]);

  // Debounced search effect - auto-fetch on mount and query changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchProducts(query, 1, category);
    }, query ? 300 : 0); // No debounce for initial load

    return () => {
      clearTimeout(debounceTimer);
    };
  }, [query, category, fetchProducts]);

  // Search function to trigger new search
  const search = useCallback((newQuery: string, newCategory?: string) => {
    setQuery(newQuery);
    setCategory(newCategory);
    setPage(1);
    setProducts([]);
  }, []);

  // Load more products (next page)
  const loadMore = useCallback(() => {
    if (!isLoading && !isLoadingMore && hasMore) {
      fetchProducts(query, page + 1, category, true);
    }
  }, [isLoading, isLoadingMore, hasMore, query, page, category, fetchProducts]);

  // Reset to initial state
  const reset = useCallback(() => {
    setQuery('');
    setCategory(undefined);
    setPage(1);
    setProducts([]);
    setHasMore(false);
    fetchProducts('', 1);
  }, [fetchProducts]);

  return {
    products,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    page,
    searchTerm,
    source,
    search,
    loadMore,
    reset,
  };
}

// Hook to initialize cart on app load
export function useInitializeApp() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setIsInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return isInitialized;
}
