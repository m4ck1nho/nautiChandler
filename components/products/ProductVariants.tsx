'use client';

import { motion } from 'framer-motion';
import { DbProductGrouped, Product } from '@/lib/types';

interface ProductVariantsProps {
  variants: (Product | DbProductGrouped)[];
  currentProductId: string;
  onSelectVariant: (variant: Product | DbProductGrouped) => void;
  availableSizes?: string[];
  availableColors?: string[];
  selectedSize?: string | null;
  selectedColor?: string | null;
  onSizeChange?: (size: string) => void;
  onColorChange?: (color: string) => void;
}

// Type guard for DbProductGrouped
function isDbProduct(product: Product | DbProductGrouped): product is DbProductGrouped {
  return 'group_id' in product;
}

// Get variant attribute value
function getVariantSize(variant: Product | DbProductGrouped): string | null {
  if (isDbProduct(variant)) {
    return variant.size;
  }
  return variant.size || null;
}

function getVariantColor(variant: Product | DbProductGrouped): string | null {
  if (isDbProduct(variant)) {
    return variant.color;
  }
  return variant.color || null;
}

export function ProductVariants({
  variants,
  currentProductId,
  onSelectVariant,
  availableSizes = [],
  availableColors = [],
  selectedSize,
  selectedColor,
  onSizeChange,
  onColorChange,
}: ProductVariantsProps) {
  // If we have explicit size/color options, use them
  const hasSizes = availableSizes.length > 1;
  const hasColors = availableColors.length > 1;

  // Find variant matching selections
  const findMatchingVariant = (size?: string | null, color?: string | null) => {
    return variants.find(v => {
      const vSize = getVariantSize(v);
      const vColor = getVariantColor(v);
      
      const sizeMatch = !size || vSize === size;
      const colorMatch = !color || vColor === color;
      
      return sizeMatch && colorMatch;
    });
  };

  // Handle size selection
  const handleSizeSelect = (size: string) => {
    if (onSizeChange) {
      onSizeChange(size);
    }
    
    const matchingVariant = findMatchingVariant(size, selectedColor);
    if (matchingVariant) {
      onSelectVariant(matchingVariant);
    }
  };

  // Handle color selection
  const handleColorSelect = (color: string) => {
    if (onColorChange) {
      onColorChange(color);
    }
    
    const matchingVariant = findMatchingVariant(selectedSize, color);
    if (matchingVariant) {
      onSelectVariant(matchingVariant);
    }
  };

  // If no explicit options, show variant buttons directly
  if (!hasSizes && !hasColors && variants.length > 1) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Select Option ({variants.length} available)
          </label>
          <div className="flex flex-wrap gap-2">
            {variants.map((variant, index) => {
              const isSelected = variant.id === currentProductId;
              const variantLabel = getVariantSize(variant) || getVariantColor(variant) || `Option ${index + 1}`;
              
              return (
                <motion.button
                  key={variant.id}
                  onClick={() => onSelectVariant(variant)}
                  whileTap={{ scale: 0.97 }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    isSelected
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-zinc-200 hover:border-zinc-400'
                  }`}
                >
                  {variantLabel}
                  <span className="ml-2 text-xs opacity-70">
                    {isDbProduct(variant) ? `€${variant.price_numeric?.toFixed(2)}` : variant.price}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Size Selector */}
      {hasSizes && (
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Size / Type
          </label>
          <div className="flex flex-wrap gap-2">
            {availableSizes.map((size) => {
              const isSelected = selectedSize === size;
              
              return (
                <motion.button
                  key={size}
                  onClick={() => handleSizeSelect(size)}
                  whileTap={{ scale: 0.97 }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    isSelected
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-zinc-200 hover:border-zinc-400'
                  }`}
                >
                  {size}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Color Selector */}
      {hasColors && (
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Color
          </label>
          <div className="flex flex-wrap gap-2">
            {availableColors.map((color) => {
              const isSelected = selectedColor === color;
              
              return (
                <motion.button
                  key={color}
                  onClick={() => handleColorSelect(color)}
                  whileTap={{ scale: 0.97 }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all capitalize ${
                    isSelected
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-zinc-200 hover:border-zinc-400'
                  }`}
                >
                  {color}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Show variant count info */}
      {variants.length > 1 && (
        <p className="text-sm text-zinc-500 pt-2">
          {variants.length} variants in this product family
        </p>
      )}
    </div>
  );
}
