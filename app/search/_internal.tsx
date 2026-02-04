'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Grid2X2, Grid3X3, LayoutGrid, ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { useProductSearch } from '@/hooks/useProductSearch';
import { SearchSidebar, SearchSidebarFilters } from '@/components/search/SearchSidebar';
import AddToCartButton from '@/components/product/AddToCartButton';
import { Product } from '@/lib/types';

type SortOption = 'default' | 'price-asc' | 'price-desc' | 'name-asc';
type GridColumns = 2 | 3 | 4;

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'default', label: 'Featured' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc', label: 'Name: A-Z' },
];

export default function InternalSearchPage() {
  const searchParams = useSearchParams();
  const rawQuery = searchParams.get('search') || '';
  const categoryParam = searchParams.get('category') || undefined;

  // Use the search hook
  const { products, isLoading, error, search } = useProductSearch(rawQuery);

  // Grid and sorting state
  const [gridColumns, setGridColumns] = useState<GridColumns>(3);
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Mobile filter drawer state
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Local state for filters
  const [filters, setFilters] = useState<SearchSidebarFilters>({
    priceMin: undefined,
    priceMax: undefined,
    inStock: false,
    selectedColors: [],
    selectedSizes: [],
    selectedCategory: categoryParam,
    selectedBrands: [],
    selectedMaterials: [],
  });

  // Effect: When URL query changes, update search
  useEffect(() => {
    search(rawQuery, categoryParam);
  }, [rawQuery, categoryParam, search]);

  // Derive facets from actual products
  const facets = useMemo(() => {
    const colors = new Set<string>();
    const sizes = new Set<string>();
    let maxPrice = 0;
    const cats = new Set<string>();

    products.forEach((p) => {
      if (p.color) colors.add(p.color);
      if (p.size) sizes.add(p.size);
      if (p.category) cats.add(p.category);
      const priceVal = parseFloat(p.price?.replace(/[^0-9.]/g, '') || '0');
      if (priceVal > maxPrice) maxPrice = priceVal;
    });

    return {
      colors: Array.from(colors),
      sizes: Array.from(sizes),
      maxPrice: maxPrice || null,
      categories: Array.from(cats),
    };
  }, [products]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      // Category filter
      if (filters.selectedCategory && p.category) {
        const pCat = p.category.toLowerCase();
        const selectedCat = filters.selectedCategory.toLowerCase();

        if (!pCat.includes(selectedCat) && !selectedCat.includes(pCat)) {
          const matchWords = ['anchor', 'fitting', 'inflatable', 'life', 'cloth', 'maintenance', 'clean', 'tool', 'machine', 'electric', 'light'];
          const hasMatch = matchWords.some(word => selectedCat.includes(word) && pCat.includes(word));
          if (!hasMatch) return false;
        }
      }

      // Price filter
      const priceVal = parseFloat(p.price?.replace(/[^0-9.]/g, '') || '0');
      if (filters.priceMin !== undefined && priceVal < filters.priceMin) return false;
      if (filters.priceMax !== undefined && priceVal > filters.priceMax) return false;

      // Colors
      if (filters.selectedColors.length > 0 && p.color && !filters.selectedColors.includes(p.color)) {
        return false;
      }

      // Sizes
      if (filters.selectedSizes.length > 0 && p.size && !filters.selectedSizes.includes(p.size)) {
        return false;
      }

      return true;
    });

    // Sort
    if (sortBy !== 'default') {
      result = [...result].sort((a, b) => {
        const priceA = parseFloat(a.price?.replace(/[^0-9.]/g, '') || '0');
        const priceB = parseFloat(b.price?.replace(/[^0-9.]/g, '') || '0');

        switch (sortBy) {
          case 'price-asc':
            return priceA - priceB;
          case 'price-desc':
            return priceB - priceA;
          case 'name-asc':
            return a.title.localeCompare(b.title);
          default:
            return 0;
        }
      });
    }

    return result;
  }, [products, filters, sortBy]);

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      priceMin: undefined,
      priceMax: undefined,
      inStock: false,
      selectedColors: [],
      selectedSizes: [],
      selectedCategory: categoryParam,
      selectedBrands: [],
      selectedMaterials: [],
    });
    setSortBy('default');
  };

  // Grid class based on columns
  const gridClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  }[gridColumns];

  // Sidebar component (shared between mobile and desktop)
  const sidebarContent = (
    <SearchSidebar
      facets={{
        colors: facets.colors,
        sizes: facets.sizes,
        maxPrice: facets.maxPrice
      }}
      categories={facets.categories}
      {...filters}
      onChange={setFilters}
      onClear={clearFilters}
    />
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 -ml-2 hover:bg-zinc-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base font-semibold text-zinc-900 line-clamp-1">
                {categoryParam || rawQuery ? (categoryParam || `"${rawQuery}"`) : 'All Products'}
              </h1>
              <p className="text-xs text-zinc-500">
                {isLoading ? 'Searching...' : `${filteredProducts.length} items`}
              </p>
            </div>
          </div>

          {/* Mobile Filter Button */}
          <button
            onClick={() => setShowMobileFilters(true)}
            className="lg:hidden flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-700 border border-zinc-200 rounded-lg hover:border-zinc-300"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowMobileFilters(false)}
          />

          {/* Drawer */}
          <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-white shadow-xl flex flex-col">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-100">
              <h2 className="text-lg font-semibold">Filters</h2>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content (scrollable) */}
            <div className="flex-1 overflow-y-auto p-4">
              {sidebarContent}
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-zinc-100 p-4 space-y-2">
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-full py-3 bg-black text-white font-medium rounded-full hover:bg-zinc-800 transition-colors"
              >
                Show {filteredProducts.length} Results
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 lg:py-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 lg:mb-6 pb-4 border-b border-zinc-100">
          {/* Grid Toggle */}
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg">
            <button
              onClick={() => setGridColumns(2)}
              className={`p-1.5 lg:p-2 rounded-md transition-colors ${gridColumns === 2 ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
              title="2 columns"
            >
              <Grid2X2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setGridColumns(3)}
              className={`p-1.5 lg:p-2 rounded-md transition-colors ${gridColumns === 3 ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
              title="3 columns"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setGridColumns(4)}
              className={`p-1.5 lg:p-2 rounded-md transition-colors ${gridColumns === 4 ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
              title="4 columns"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-1 lg:gap-2 px-2 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm text-zinc-700 hover:text-zinc-900 border border-zinc-200 rounded-lg hover:border-zinc-300 transition-colors"
            >
              <span className="hidden sm:inline">Sort: </span>
              <span>{SORT_OPTIONS.find(o => o.value === sortBy)?.label}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
            </button>

            {showSortMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-zinc-200 rounded-lg shadow-lg z-20 py-1">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value);
                        setShowSortMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 transition-colors ${sortBy === option.value ? 'text-zinc-900 font-medium bg-zinc-50' : 'text-zinc-600'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-8">
          {/* Desktop Sidebar - hidden on mobile */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            {sidebarContent}
          </aside>

          {/* Results Grid */}
          <main className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-red-500">{error}</p>
                <button onClick={() => window.location.reload()} className="mt-4 underline">Try again</button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-zinc-500">No products found.</p>
                <button onClick={clearFilters} className="mt-4 text-sm text-zinc-900 underline">Clear filters</button>
              </div>
            ) : (
              <div className={`grid ${gridClass} gap-3 lg:gap-6`}>
                {filteredProducts.map((product) => (
                  <Link
                    key={product.id}
                    href={`/product/${encodeURIComponent(product.id)}`}
                    className="group relative flex flex-col gap-2 lg:gap-3"
                  >
                    {/* Image with hover button */}
                    <div className="aspect-square bg-zinc-100 rounded-lg lg:rounded-xl overflow-hidden relative">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-300">No Image</div>
                      )}

                      {/* Hover Add Button - bottom right corner */}
                      <div className="absolute bottom-2 right-2 lg:bottom-3 lg:right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <AddToCartButton product={product as Product} variant="circle" />
                      </div>
                    </div>

                    {/* Product Info */}
                    <div>
                      <h3 className="text-xs lg:text-sm font-medium text-zinc-900 line-clamp-2 leading-tight group-hover:underline">
                        {product.title}
                      </h3>
                      <p className="text-xs lg:text-sm font-semibold text-zinc-900 mt-0.5 lg:mt-1">{product.price}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
