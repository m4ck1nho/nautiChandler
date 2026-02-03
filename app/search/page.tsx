'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Plus, Loader2, Filter } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { FilterSidebar } from '@/components/search/FilterSidebar';
import { useCartStore } from '@/store/cartStore';

// Product interface matching database schema
interface Product {
  id: string;
  title: string;
  price: string;
  image: string | null;
  category: string | null;
  link: string | null;
}

// Helper to parse "€123.45" -> 123.45
const parsePrice = (priceStr: string) => {
  if (!priceStr) return 0;
  return parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
};
// Helper for brand
const getBrandFromTitle = (title: string) => {
  return title.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
};

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addItem } = useCartStore();

  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('category') || '';

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // -- FILTERS STATE --
  const [filters, setFilters] = useState({
    priceRange: [0, 10000] as [number, number],
    selectedBrands: [] as string[],
    selectedCategories: initialCategory ? [initialCategory] : [] as string[],
    selectedColors: [] as string[]
  });

  // Reset filters if URL param changes (e.g. navigation from drawer)
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) {
      setFilters(prev => ({ ...prev, selectedCategories: [cat] }));
    }
  }, [searchParams]);

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Debounce search input (300ms)
  const debouncedSearch = useDebounce(searchInput, 300);

  // Fetch products
  const fetchProducts = useCallback(async (search: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Just fetch ALL products if no search or wide search; we rely on Client Side Filtering for exact refinement
      // (The user asked for frontend filtering)
      const url = search
        ? `/api/products/unified?search=${encodeURIComponent(search)}`
        : `/api/products/unified`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.products) {
        setProducts(data.products);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load products');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on debounced search change
  useEffect(() => {
    fetchProducts(debouncedSearch);

    // Update URL
    if (debouncedSearch) {
      router.replace(`/search?search=${encodeURIComponent(debouncedSearch)}`, { scroll: false });
    } else {
      router.replace('/search', { scroll: false });
    }
  }, [debouncedSearch, fetchProducts, router]);

  // -- FILTERING LOGIC --
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // 1. By Price
      const price = parsePrice(product.price);
      if (filters.priceRange[0] > 0 && price < filters.priceRange[0]) return false;
      if (filters.priceRange[1] > 0 && filters.priceRange[1] < 10000 && price > filters.priceRange[1]) return false;

      // 2. By Brand
      if (filters.selectedBrands.length > 0) {
        const brand = getBrandFromTitle(product.title);
        // Loose matching
        const matchesBrand = filters.selectedBrands.some(b =>
          brand.toLowerCase() === b.toLowerCase()
        );
        if (!matchesBrand) return false;
      }

      // 3. By Category
      if (filters.selectedCategories.length > 0) {
        if (!product.category || !filters.selectedCategories.includes(product.category)) {
          return false;
        }
      }

      return true;
    });
  }, [products, filters]);

  // Handle add to cart
  const handleAddToCart = (product: Product) => {
    addItem({
      title: product.title,
      price: product.price,
      image: product.image || '',
      link: product.link || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <Navbar />

      {/* Main Container */}
      <div className="max-w-[1600px] mx-auto pt-20"> {/* pt-20 accounts for fixed navbar */}

        <div className="flex flex-col lg:flex-row bg-white min-h-[calc(100vh-80px)]">

          {/* Sidebar (Desktop) */}
          <div className="hidden lg:block border-r border-zinc-200 bg-white w-64 flex-shrink-0 sticky top-20 h-[calc(100vh-80px)] overflow-hidden">
            <FilterSidebar
              products={products}
              filters={filters}
              setFilters={setFilters}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 bg-white">

            {/* Search Header & Mobile Filter Toggle */}
            <div className="sticky top-16 lg:top-0 z-30 bg-white border-b border-zinc-200 px-4 py-4">
              <div className="flex items-center gap-4">

                {/* Search Bar */}
                <div className="relative flex-1 max-w-2xl">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search yatch supplies..."
                    className="w-full pl-12 pr-4 py-2.5 bg-zinc-100 rounded-lg text-base placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white transition-all border border-transparent focus:border-black"
                  />
                  {isLoading && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 animate-spin" />
                  )}
                </div>

                {/* Mobile Filter Button */}
                <button
                  onClick={() => setIsMobileFiltersOpen(true)}
                  className="lg:hidden p-2.5 bg-zinc-100 rounded-lg text-zinc-700 hover:bg-zinc-200 transition-colors"
                >
                  <Filter className="w-5 h-5" />
                </button>
              </div>

              {/* Stats Bar */}
              <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
                <span>{filteredProducts.length} items found</span>
                {/* Sort dropdown could go here */}
                {/* <span>Sort By: Recommended</span> */}
              </div>
            </div>

            {/* Product Grid */}
            <div className="p-4 lg:p-6">
              {isLoading && products.length === 0 ? (
                // Skeleton Grid
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-xl overflow-hidden border border-zinc-100 animate-pulse">
                      <div className="aspect-[4/5] bg-zinc-100" />
                      <div className="p-4 space-y-3">
                        <div className="h-4 bg-zinc-100 rounded w-3/4" />
                        <div className="h-4 bg-zinc-100 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-20">
                  <p className="text-red-500 font-medium">{error}</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-24 px-4">
                  <div className="text-6xl mb-6 opacity-20">⚓</div>
                  <h3 className="text-xl font-semibold text-zinc-900 mb-2">No products found</h3>
                  <p className="text-zinc-500 max-w-sm mx-auto">
                    We couldn't find any products matching your filters. Try adjusting your search or clearing the filters.
                  </p>
                  <button
                    onClick={() => {
                      setSearchInput('');
                      setFilters({
                        priceRange: [0, 10000],
                        selectedBrands: [],
                        selectedCategories: [],
                        selectedColors: []
                      });
                    }}
                    className="mt-6 px-6 py-2.5 bg-black text-white rounded-full font-medium hover:bg-zinc-800 transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="bg-white rounded-xl overflow-hidden border border-zinc-200 hover:border-black hover:shadow-lg transition-all duration-300 group flex flex-col relative"
                    >
                      {/* WRAPPER LINK */}
                      <Link href={`/product/${product.id}`} className="flex flex-col h-full">

                        {/* Product Image */}
                        <div className="relative aspect-square p-4 bg-white flex items-center justify-center">
                          {product.image ? (
                            <Image
                              src={product.image}
                              alt={product.title}
                              fill
                              className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-200">
                              <span className="text-4xl">⚓</span>
                            </div>
                          )}

                        </div>

                        {/* Product Info */}
                        <div className="p-4 flex-1 flex flex-col">
                          <div className="mb-1">
                            {product.category && (
                              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                                {product.category}
                              </span>
                            )}
                          </div>
                          <h3 className="font-medium text-sm text-zinc-900 line-clamp-2 mb-2 min-h-[2.5rem]" title={product.title}>
                            {product.title}
                          </h3>
                          <div className="mt-auto">
                            <p className="text-lg font-bold text-black">
                              {product.price}
                            </p>
                          </div>
                        </div>
                      </Link>

                      {/* Quick Add Button - Positioned absolutely on top of the link, needs z-index and click stopPropagation */}
                      <div className="absolute top-4 right-4 z-10">
                        {/* Original design had bottom-right, keeping consistent but ensure it's clickable */}
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault(); // Prevent navigation
                          e.stopPropagation();
                          handleAddToCart(product);
                        }}
                        className="absolute bottom-[4.5rem] right-4 w-10 h-10 bg-orange-500 text-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 hover:bg-orange-600 active:scale-95 z-20"
                      >
                        <Plus className="w-6 h-6" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Mobile Sidebar (Drawer-like overlay) */}
      {isMobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileFiltersOpen(false)} />
          <div className="relative w-[300px] bg-white h-full shadow-xl animate-in slide-in-from-left">
            <FilterSidebar
              products={products}
              filters={filters}
              setFilters={setFilters}
              onClose={() => setIsMobileFiltersOpen(false)}
            />
          </div>
        </div>
      )}

    </div>
  );
}

