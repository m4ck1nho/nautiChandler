'use client';

import { SlidersHorizontal } from 'lucide-react';

interface Facets {
  colors: string[];
  sizes: string[];
  maxPrice: number | null;
}

export interface SearchSidebarFilters {
  priceMin?: number;
  priceMax?: number;
  inStock: boolean;
  selectedColors: string[];
  selectedSizes: string[];
  selectedCategory?: string;
}

interface SearchSidebarProps extends SearchSidebarFilters {
  facets: Facets;
  categories: string[];
  onChange: (next: SearchSidebarFilters) => void;
}

export function SearchSidebar({
  facets,
  categories,
  priceMin,
  priceMax,
  inStock,
  selectedColors,
  selectedSizes,
  selectedCategory,
  onChange,
}: SearchSidebarProps) {
  const handlePriceMinChange = (value: string) => {
    const num = value ? Number(value) : undefined;
    onChange({
      priceMin: num,
      priceMax,
      inStock,
      selectedColors,
      selectedSizes,
      selectedCategory,
    });
  };

  const handlePriceMaxChange = (value: string) => {
    const num = value ? Number(value) : undefined;
    onChange({
      priceMin,
      priceMax: num,
      inStock,
      selectedColors,
      selectedSizes,
      selectedCategory,
    });
  };

  const handleInStockChange = (checked: boolean) => {
    onChange({
      priceMin,
      priceMax,
      inStock: checked,
      selectedColors,
      selectedSizes,
      selectedCategory,
    });
  };

  const toggleColor = (color: string) => {
    const nextColors = selectedColors.includes(color)
      ? selectedColors.filter((c) => c !== color)
      : [...selectedColors, color];
    onChange({
      priceMin,
      priceMax,
      inStock,
      selectedColors: nextColors,
      selectedSizes,
      selectedCategory,
    });
  };

  const toggleSize = (size: string) => {
    const nextSizes = selectedSizes.includes(size)
      ? selectedSizes.filter((s) => s !== size)
      : [...selectedSizes, size];
    onChange({
      priceMin,
      priceMax,
      inStock,
      selectedColors,
      selectedSizes: nextSizes,
      selectedCategory,
    });
  };

  const toggleCategory = (category: string) => {
    const nextCategory = selectedCategory === category ? undefined : category;
    onChange({
      priceMin,
      priceMax,
      inStock,
      selectedColors,
      selectedSizes,
      selectedCategory: nextCategory,
    });
  };

  return (
    <div className="space-y-6 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <SlidersHorizontal className="w-4 h-4 text-zinc-500" />
        <span className="text-sm font-semibold text-black">Filters</span>
      </div>

      {/* Category */}
      {categories.length > 0 && (
        <div>
          <h3 className="font-semibold text-black mb-2">Category</h3>
          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
            {categories.map((cat) => (
              <label
                key={cat}
                className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedCategory === cat}
                  onChange={() => toggleCategory(cat)}
                  className="rounded border-zinc-300 text-black focus:ring-black"
                />
                <span>{cat}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Price range */}
      <div>
        <h3 className="font-semibold text-black mb-2">Price range</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={priceMin ?? ''}
            onChange={(e) => handlePriceMinChange(e.target.value)}
            placeholder="Min"
            className="w-1/2 h-9 px-2 rounded border border-zinc-200 text-xs"
          />
          <input
            type="number"
            min={0}
            value={priceMax ?? ''}
            onChange={(e) => handlePriceMaxChange(e.target.value)}
            placeholder="Max"
            className="w-1/2 h-9 px-2 rounded border border-zinc-200 text-xs"
          />
        </div>
        {facets.maxPrice && (
          <p className="mt-1 text-[11px] text-zinc-500">
            Max in results: €{facets.maxPrice.toFixed(2)}
          </p>
        )}
      </div>

      {/* Availability */}
      <div>
        <h3 className="font-semibold text-black mb-2">Availability</h3>
        <label className="inline-flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => handleInStockChange(e.target.checked)}
            className="rounded border-zinc-300 text-black focus:ring-black"
          />
          In stock only
        </label>
      </div>

      {/* Colors */}
      {facets.colors.length > 0 && (
        <div>
          <h3 className="font-semibold text-black mb-2">Color</h3>
          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
            {facets.colors.map((color) => (
              <label
                key={color}
                className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedColors.includes(color)}
                  onChange={() => toggleColor(color)}
                  className="rounded border-zinc-300 text-black focus:ring-black"
                />
                <span className="capitalize">{color.toLowerCase()}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Sizes */}
      {facets.sizes.length > 0 && (
        <div>
          <h3 className="font-semibold text-black mb-2">Size</h3>
          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
            {facets.sizes.map((size) => (
              <label
                key={size}
                className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedSizes.includes(size)}
                  onChange={() => toggleSize(size)}
                  className="rounded border-zinc-300 text-black focus:ring-black"
                />
                <span>{size}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

