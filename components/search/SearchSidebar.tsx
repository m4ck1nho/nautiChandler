'use client';

import { useMemo } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

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
  selectedBrands?: string[];
  selectedMaterials?: string[];
}

interface SearchSidebarProps extends SearchSidebarFilters {
  facets: Facets;
  categories: string[];
  onChange: (next: SearchSidebarFilters) => void;
  onClear?: () => void;
}

// Sample data for filters that may not come from products
const COMMON_COLORS = ['Black', 'White', 'Blue', 'Red', 'Silver', 'Orange', 'Yellow', 'Green'];
const COMMON_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const COMMON_BRANDS = ['Lofrans', 'Plastimo', 'Hella Marine', 'Lewmar', 'Muir', 'Quick', 'Harken'];
const COMMON_MATERIALS = ['Stainless Steel', 'Aluminum', 'Nylon', 'Polyester', 'Rubber', 'PVC'];

export function SearchSidebar({
  facets,
  categories,
  priceMin,
  priceMax,
  inStock,
  selectedColors,
  selectedSizes,
  selectedCategory,
  selectedBrands = [],
  selectedMaterials = [],
  onChange,
  onClear,
}: SearchSidebarProps) {
  // Calculate if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      priceMin !== undefined ||
      priceMax !== undefined ||
      inStock ||
      selectedColors.length > 0 ||
      selectedSizes.length > 0 ||
      selectedBrands.length > 0 ||
      selectedMaterials.length > 0
    );
  }, [priceMin, priceMax, inStock, selectedColors, selectedSizes, selectedBrands, selectedMaterials]);

  // Price range for slider
  const maxPriceValue = facets.maxPrice || 1000;
  const currentMin = priceMin ?? 0;
  const currentMax = priceMax ?? maxPriceValue;

  // Combine product facets with common options
  const availableColors = useMemo(() => {
    const combined = new Set([...facets.colors, ...COMMON_COLORS]);
    return Array.from(combined).slice(0, 8);
  }, [facets.colors]);

  const availableSizes = useMemo(() => {
    const combined = new Set([...facets.sizes, ...COMMON_SIZES]);
    return Array.from(combined).slice(0, 8);
  }, [facets.sizes]);

  const handlePriceRangeChange = (values: number[]) => {
    const [min, max] = values;
    onChange({
      priceMin: min > 0 ? min : undefined,
      priceMax: max < maxPriceValue ? max : undefined,
      inStock,
      selectedColors,
      selectedSizes,
      selectedCategory,
      selectedBrands,
      selectedMaterials,
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
      selectedBrands,
      selectedMaterials,
    });
  };

  const toggleColor = (color: string) => {
    const next = selectedColors.includes(color)
      ? selectedColors.filter((c) => c !== color)
      : [...selectedColors, color];
    onChange({
      priceMin,
      priceMax,
      inStock,
      selectedColors: next,
      selectedSizes,
      selectedCategory,
      selectedBrands,
      selectedMaterials,
    });
  };

  const toggleSize = (size: string) => {
    const next = selectedSizes.includes(size)
      ? selectedSizes.filter((s) => s !== size)
      : [...selectedSizes, size];
    onChange({
      priceMin,
      priceMax,
      inStock,
      selectedColors,
      selectedSizes: next,
      selectedCategory,
      selectedBrands,
      selectedMaterials,
    });
  };

  const toggleBrand = (brand: string) => {
    const next = selectedBrands.includes(brand)
      ? selectedBrands.filter((b) => b !== brand)
      : [...selectedBrands, brand];
    onChange({
      priceMin,
      priceMax,
      inStock,
      selectedColors,
      selectedSizes,
      selectedCategory,
      selectedBrands: next,
      selectedMaterials,
    });
  };

  const toggleMaterial = (material: string) => {
    const next = selectedMaterials.includes(material)
      ? selectedMaterials.filter((m) => m !== material)
      : [...selectedMaterials, material];
    onChange({
      priceMin,
      priceMax,
      inStock,
      selectedColors,
      selectedSizes,
      selectedCategory,
      selectedBrands,
      selectedMaterials: next,
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
      selectedBrands,
      selectedMaterials,
    });
  };

  return (
    <div className="space-y-6 text-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-zinc-500" />
          <span className="text-sm font-semibold text-black">Filters</span>
        </div>
        {hasActiveFilters && onClear && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <X className="w-3 h-3" />
            Clear all
          </button>
        )}
      </div>

      {/* Category */}
      {categories.length > 0 && (
        <div>
          <h3 className="font-semibold text-black mb-3">Category</h3>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${selectedCategory === cat
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Price Range Slider */}
      <div>
        <h3 className="font-semibold text-black mb-3">Price Range</h3>
        <div className="px-1">
          <Slider
            value={[currentMin, currentMax]}
            min={0}
            max={maxPriceValue}
            step={1}
            onValueChange={handlePriceRangeChange}
          />
          <div className="flex items-center justify-between mt-3 text-xs text-zinc-600">
            <span className="px-2 py-1 bg-zinc-100 rounded">€{currentMin.toFixed(0)}</span>
            <span className="text-zinc-400">—</span>
            <span className="px-2 py-1 bg-zinc-100 rounded">€{currentMax.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Color */}
      <div>
        <h3 className="font-semibold text-black mb-3">Color</h3>
        <div className="flex flex-wrap gap-2">
          {availableColors.map((color) => (
            <button
              key={color}
              onClick={() => toggleColor(color)}
              className={`px-3 py-1.5 text-xs rounded-full border capitalize transition-colors ${selectedColors.includes(color)
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
                }`}
            >
              {color.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Size */}
      <div>
        <h3 className="font-semibold text-black mb-3">Size</h3>
        <div className="flex flex-wrap gap-2">
          {availableSizes.map((size) => (
            <button
              key={size}
              onClick={() => toggleSize(size)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${selectedSizes.includes(size)
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
                }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Brand */}
      <div>
        <h3 className="font-semibold text-black mb-3">Brand</h3>
        <div className="flex flex-wrap gap-2">
          {COMMON_BRANDS.map((brand) => (
            <button
              key={brand}
              onClick={() => toggleBrand(brand)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${selectedBrands.includes(brand)
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
                }`}
            >
              {brand}
            </button>
          ))}
        </div>
      </div>

      {/* Material */}
      <div>
        <h3 className="font-semibold text-black mb-3">Material</h3>
        <div className="flex flex-wrap gap-2">
          {COMMON_MATERIALS.map((material) => (
            <button
              key={material}
              onClick={() => toggleMaterial(material)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${selectedMaterials.includes(material)
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
                }`}
            >
              {material}
            </button>
          ))}
        </div>
      </div>

      {/* Availability */}
      <div>
        <h3 className="font-semibold text-black mb-3">Availability</h3>
        <label className="inline-flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => handleInStockChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-zinc-200 rounded-full peer peer-checked:bg-zinc-900 transition-colors"></div>
            <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm peer-checked:translate-x-4 transition-transform"></div>
          </div>
          <span className="text-xs text-zinc-700 group-hover:text-zinc-900">In stock only</span>
        </label>
      </div>
    </div>
  );
}
