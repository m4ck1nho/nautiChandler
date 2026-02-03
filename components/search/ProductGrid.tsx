'use client';

import { Grid3X3, Rows4 } from 'lucide-react';
import { DbProductGrouped } from '@/lib/types';
import { ProductCard } from '@/components/products/ProductCard';

export type ViewMode = 'grid' | 'list';

interface ProductGridProps {
  searchTerm: string;
  products: DbProductGrouped[];
  filteredProducts: DbProductGrouped[];
  sort: 'price_asc' | 'price_desc' | 'newest';
  viewMode: ViewMode;
  isLoading: boolean;
  error: string | null;
  onChangeSort: (sort: 'price_asc' | 'price_desc' | 'newest') => void;
  onChangeViewMode: (mode: ViewMode) => void;
}

export function ProductGrid({
  searchTerm,
  products,
  filteredProducts,
  sort,
  viewMode,
  isLoading,
  error,
  onChangeSort,
  onChangeViewMode,
}: ProductGridProps) {
  return (
    <section className="flex flex-col gap-4">
      {/* Header with sort & view toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500 mb-0.5">Results for</p>
          <h1 className="text-lg font-semibold text-black">
            &quot;{searchTerm}&quot;{' '}
            <span className="text-xs font-normal text-zinc-500">
              ({filteredProducts.length} of {products.length} results)
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-3 justify-between sm:justify-end">
          {/* Sort dropdown */}
          <select
            value={sort}
            onChange={(e) => onChangeSort(e.target.value as 'price_asc' | 'price_desc' | 'newest')}
            className="h-9 px-3 rounded-md border border-zinc-200 bg-white text-xs text-zinc-700"
          >
            <option value="price_asc">Lowest price</option>
            <option value="price_desc">Highest price</option>
            <option value="newest">Newest</option>
          </select>

          {/* View toggle */}
          <div className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 p-0.5">
            <button
              type="button"
              onClick={() => onChangeViewMode('grid')}
              className={`p-1.5 rounded ${
                viewMode === 'grid'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-zinc-500 hover:text-black'
              }`}
              aria-label="Grid view"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onChangeViewMode('list')}
              className={`p-1.5 rounded ${
                viewMode === 'list'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-zinc-500 hover:text-black'
              }`}
              aria-label="List view"
            >
              <Rows4 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Results grid/list */}
      {isLoading ? (
        <p className="text-sm text-zinc-500">Loading products...</p>
      ) : error ? (
        <p className="text-sm text-red-500">Error: {error}</p>
      ) : filteredProducts.length === 0 ? (
        <p className="text-sm text-zinc-500">No products found for this search.</p>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredProducts.map((product, index) => (
            <div
              key={product.id}
              className="border border-zinc-100 rounded-lg hover:shadow-sm transition-shadow bg-white"
            >
              <ProductCard product={product} index={index} showVariants />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-zinc-100 border border-zinc-100 rounded-lg bg-white">
          {filteredProducts.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} showVariants />
          ))}
        </div>
      )}
    </section>
  );
}

