'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { X, SlidersHorizontal, Check } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
  DrawerFooter,
} from '@/components/ui/drawer';

export interface FilterValues {
  priceMin?: number;
  priceMax?: number;
  category?: string;
  inStock?: boolean;
  sortBy?: 'price-asc' | 'price-desc' | 'name' | 'newest';
}

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  onApply: (filters: FilterValues) => void;
  initialFilters?: FilterValues;
  categories?: { id: string; name: string }[];
}

// Predefined price ranges
const PRICE_RANGES = [
  { label: 'Under €25', min: 0, max: 25 },
  { label: '€25 - €50', min: 25, max: 50 },
  { label: '€50 - €100', min: 50, max: 100 },
  { label: '€100 - €200', min: 100, max: 200 },
  { label: 'Over €200', min: 200, max: undefined },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name', label: 'Name: A to Z' },
] as const;

export function FilterSheet({ 
  open, 
  onClose, 
  onApply, 
  initialFilters = {},
  categories = []
}: FilterSheetProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Local state for filter values
  const [priceMin, setPriceMin] = useState<number | undefined>(initialFilters.priceMin);
  const [priceMax, setPriceMax] = useState<number | undefined>(initialFilters.priceMax);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(initialFilters.category);
  const [inStock, setInStock] = useState(initialFilters.inStock ?? false);
  const [sortBy, setSortBy] = useState<FilterValues['sortBy']>(initialFilters.sortBy);
  const [customPriceMin, setCustomPriceMin] = useState('');
  const [customPriceMax, setCustomPriceMax] = useState('');

  // Sync with URL params on mount
  useEffect(() => {
    const urlPriceMin = searchParams.get('priceMin');
    const urlPriceMax = searchParams.get('priceMax');
    const urlCategory = searchParams.get('category');
    const urlInStock = searchParams.get('inStock');
    const urlSortBy = searchParams.get('sortBy') as FilterValues['sortBy'];

    if (urlPriceMin) setPriceMin(parseFloat(urlPriceMin));
    if (urlPriceMax) setPriceMax(parseFloat(urlPriceMax));
    if (urlCategory) setSelectedCategory(urlCategory);
    if (urlInStock) setInStock(urlInStock === 'true');
    if (urlSortBy) setSortBy(urlSortBy);
  }, [searchParams]);

  // Check if a price range is selected
  const isPriceRangeSelected = (min: number, max: number | undefined) => {
    return priceMin === min && priceMax === max;
  };

  // Handle predefined price range selection
  const handlePriceRangeSelect = (min: number, max: number | undefined) => {
    if (isPriceRangeSelected(min, max)) {
      // Deselect
      setPriceMin(undefined);
      setPriceMax(undefined);
    } else {
      setPriceMin(min);
      setPriceMax(max);
    }
    setCustomPriceMin('');
    setCustomPriceMax('');
  };

  // Handle custom price input
  const handleCustomPriceChange = () => {
    const min = customPriceMin ? parseFloat(customPriceMin) : undefined;
    const max = customPriceMax ? parseFloat(customPriceMax) : undefined;
    setPriceMin(min);
    setPriceMax(max);
  };

  // Apply filters and update URL
  const handleApply = useCallback(() => {
    const filters: FilterValues = {};
    
    if (priceMin !== undefined) filters.priceMin = priceMin;
    if (priceMax !== undefined) filters.priceMax = priceMax;
    if (selectedCategory) filters.category = selectedCategory;
    if (inStock) filters.inStock = inStock;
    if (sortBy) filters.sortBy = sortBy;

    // Update URL params
    const params = new URLSearchParams(searchParams.toString());
    
    // Set or remove each filter param
    if (priceMin !== undefined) {
      params.set('priceMin', priceMin.toString());
    } else {
      params.delete('priceMin');
    }
    
    if (priceMax !== undefined) {
      params.set('priceMax', priceMax.toString());
    } else {
      params.delete('priceMax');
    }
    
    if (selectedCategory) {
      params.set('category', selectedCategory);
    } else {
      params.delete('category');
    }
    
    if (inStock) {
      params.set('inStock', 'true');
    } else {
      params.delete('inStock');
    }
    
    if (sortBy) {
      params.set('sortBy', sortBy);
    } else {
      params.delete('sortBy');
    }

    // Update URL without full reload
    const newUrl = params.toString() ? `?${params.toString()}` : '/';
    router.push(newUrl, { scroll: false });

    onApply(filters);
    onClose();
  }, [priceMin, priceMax, selectedCategory, inStock, sortBy, searchParams, router, onApply, onClose]);

  // Clear all filters
  const handleClearAll = () => {
    setPriceMin(undefined);
    setPriceMax(undefined);
    setSelectedCategory(undefined);
    setInStock(false);
    setSortBy(undefined);
    setCustomPriceMin('');
    setCustomPriceMax('');
  };

  // Count active filters
  const activeFilterCount = [
    priceMin !== undefined || priceMax !== undefined,
    selectedCategory,
    inStock,
    sortBy,
  ].filter(Boolean).length;

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()} direction="bottom">
      <DrawerContent className="max-h-[85vh]">
        {/* Header */}
        <DrawerHeader className="border-b border-zinc-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5" />
              <DrawerTitle className="text-lg font-bold text-black">
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-black text-white rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </DrawerTitle>
            </div>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-sm text-zinc-500 hover:text-black transition-colors"
                >
                  Clear all
                </button>
              )}
              <DrawerClose asChild>
                <button className="p-2 rounded-md hover:bg-zinc-100 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </DrawerClose>
            </div>
          </div>
        </DrawerHeader>

        {/* Filter Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Sort By */}
          <div>
            <h3 className="text-sm font-semibold text-black mb-3">Sort by</h3>
            <div className="grid grid-cols-2 gap-2">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSortBy(sortBy === option.value ? undefined : option.value)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium border transition-all text-left ${
                    sortBy === option.value
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-zinc-200 hover:border-zinc-400'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <h3 className="text-sm font-semibold text-black mb-3">Price range</h3>
            <div className="space-y-3">
              {/* Predefined ranges */}
              <div className="flex flex-wrap gap-2">
                {PRICE_RANGES.map((range) => (
                  <button
                    key={range.label}
                    onClick={() => handlePriceRangeSelect(range.min, range.max)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      isPriceRangeSelected(range.min, range.max)
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-black border-zinc-200 hover:border-zinc-400'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>

              {/* Custom range */}
              <div className="flex items-center gap-2 mt-3">
                <div className="flex-1">
                  <label className="text-xs text-zinc-500 mb-1 block">Min (€)</label>
                  <input
                    type="number"
                    value={customPriceMin}
                    onChange={(e) => setCustomPriceMin(e.target.value)}
                    onBlur={handleCustomPriceChange}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <span className="text-zinc-400 mt-5">—</span>
                <div className="flex-1">
                  <label className="text-xs text-zinc-500 mb-1 block">Max (€)</label>
                  <input
                    type="number"
                    value={customPriceMax}
                    onChange={(e) => setCustomPriceMax(e.target.value)}
                    onBlur={handleCustomPriceChange}
                    placeholder="Any"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-black mb-3">Category</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(
                      selectedCategory === category.id ? undefined : category.id
                    )}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      selectedCategory === category.id
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-black border-zinc-200 hover:border-zinc-400'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* In Stock Toggle */}
          <div>
            <button
              onClick={() => setInStock(!inStock)}
              className="flex items-center justify-between w-full p-4 rounded-lg border border-zinc-200 hover:border-zinc-400 transition-all"
            >
              <span className="text-sm font-medium text-black">In stock only</span>
              <div className={`w-10 h-6 rounded-full transition-colors relative ${
                inStock ? 'bg-black' : 'bg-zinc-200'
              }`}>
                <motion.div
                  animate={{ x: inStock ? 16 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow"
                />
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <DrawerFooter className="border-t border-zinc-200 bg-white">
          <motion.button
            onClick={handleApply}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 bg-black text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            Apply filters
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-white/20 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </motion.button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// Export a button component to trigger the filter sheet
export function FilterButton({ onClick, activeCount }: { onClick: () => void; activeCount?: number }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-200 text-sm font-medium text-black hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
    >
      <SlidersHorizontal className="w-4 h-4" />
      Filter
      {activeCount && activeCount > 0 && (
        <span className="px-1.5 py-0.5 text-xs bg-black text-white rounded-full">
          {activeCount}
        </span>
      )}
    </button>
  );
}
