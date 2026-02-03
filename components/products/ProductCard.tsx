'use client';

import { motion } from 'framer-motion';
import { Plus, Check, ChevronRight } from 'lucide-react';
import { useState, useCallback } from 'react';
import { Product, ProductWithVariants, DbProductGrouped } from '@/lib/types';
import { useCartStore } from '@/store/cartStore';
import Link from 'next/link';

interface ProductCardProps {
  product: Product | ProductWithVariants | DbProductGrouped;
  index: number;
  showVariants?: boolean; // Whether to show variant badge
}

// Type guard for DbProductGrouped
function isDbProductGrouped(product: Product | ProductWithVariants | DbProductGrouped): product is DbProductGrouped {
  return 'variant_count' in product && 'min_price' in product;
}

// Format price range for display
function formatPriceRange(minPrice: number | null, maxPrice: number | null, currentPrice: string): string {
  if (!minPrice || !maxPrice || minPrice === maxPrice) {
    return currentPrice;
  }
  // Format as "From €X.XX" for lowest price
  return `From €${minPrice.toFixed(2)}`;
}

// Grayscale placeholder
const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23f4f4f5' width='100' height='100'/%3E%3Crect fill='%23e4e4e7' x='25' y='25' width='50' height='50' rx='4'/%3E%3C/svg%3E";

// Proxy external images
function getProxiedImageUrl(url: string | undefined | null): string {
  if (!url) return PLACEHOLDER_IMAGE;
  if (url.startsWith('data:') || url.startsWith('/')) return url;
  if (url.includes('nautichandler.com')) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

// Type guard to check if product has variant info
function hasVariantInfo(product: Product | ProductWithVariants): product is ProductWithVariants {
  return 'hasVariants' in product && product.hasVariants === true;
}

// Format variant badge text
function getVariantBadgeText(product: ProductWithVariants): string | null {
  if (!product.hasVariants || !product.variantCount || product.variantCount <= 1) {
    return null;
  }
  
  const options = product.variantOptions;
  const parts: string[] = [];
  
  if (options?.colors && options.colors.length > 1) {
    parts.push(`${options.colors.length} colors`);
  }
  if (options?.sizes && options.sizes.length > 1) {
    parts.push(`${options.sizes.length} sizes`);
  }
  if (options?.materials && options.materials.length > 1) {
    parts.push(`${options.materials.length} materials`);
  }
  
  if (parts.length > 0) {
    return parts.join(', ');
  }
  
  return `${product.variantCount} options`;
}

export function ProductCard({ product, index, showVariants = true }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const proxiedImage = getProxiedImageUrl(product.image);
  const [imageSrc, setImageSrc] = useState(proxiedImage);
  const [isAdding, setIsAdding] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  const { addItem } = useCartStore();

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageSrc(PLACEHOLDER_IMAGE);
  }, []);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isAdding) return;
    
    setIsAdding(true);
    addItem({
      title: product.title,
      price: product.price,
      image: product.image ?? '',
      link: product.link || undefined,
    });
    
    setTimeout(() => {
      setShowCheck(true);
      setTimeout(() => {
        setShowCheck(false);
        setIsAdding(false);
      }, 600);
    }, 100);
  };

  // Check for variant info - support both ProductWithVariants and DbProductGrouped
  let variantBadge: string | null = null;
  let displayPrice = product.price;
  let groupIdParam = '';
  let colorsLine: string | null = null;
  let sizesLine: string | null = null;

  if (isDbProductGrouped(product)) {
    // Database product with group info
    if (product.variant_count > 1) {
      // Explicit option lists for Samsung-style UI
      if (product.available_colors && product.available_colors.length > 0) {
        colorsLine = `Colors: ${product.available_colors.join(' / ')}`;
      }
      if (product.available_sizes && product.available_sizes.length > 0) {
        sizesLine = `Sizes: ${product.available_sizes.join(' / ')}`;
      }
      // Price as "From €X.XX" based on min_price
      displayPrice = formatPriceRange(product.min_price, product.max_price, product.price);
    }
    if (product.group_id) {
      groupIdParam = `?group=${product.group_id}`;
    }
  } else if (showVariants && hasVariantInfo(product)) {
    // Client-side grouped product
    variantBadge = getVariantBadgeText(product);
    if (product.groupId) {
      groupIdParam = `?group=${product.groupId}`;
    }
  }

  const productUrl = `/product/${product.id}${groupIdParam}`;

  const cardContent = (
    <>
      {/* Square Product Image */}
      <div className="relative flex-shrink-0 w-16 h-16">
        <div 
          className={`
            absolute inset-0 bg-zinc-100 rounded-md
            ${!imageLoaded && !imageError ? 'animate-pulse' : ''}
          `}
        />
        <img
          src={imageSrc}
          alt={product.title}
          referrerPolicy="no-referrer"
          onError={handleImageError}
          onLoad={() => setImageLoaded(true)}
          loading="lazy"
          className={`
            relative w-16 h-16 rounded-md object-cover border border-zinc-200
            ${imageLoaded ? 'opacity-100' : 'opacity-0'}
            transition-opacity duration-200
          `}
        />
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm text-black line-clamp-2 leading-tight">
          {isDbProductGrouped(product) && product.base_name ? product.base_name : product.title}
        </h3>
        <div className="mt-1.5 space-y-0.5">
          <div className="flex items-center gap-2">
            <p className="font-bold text-sm text-black">
              {displayPrice}
            </p>
          </div>
          {colorsLine && (
            <p className="text-[11px] text-zinc-500 truncate">
              {colorsLine}
            </p>
          )}
          {sizesLine && (
            <p className="text-[11px] text-zinc-500 truncate">
              {sizesLine}
            </p>
          )}
          {variantBadge && !colorsLine && !sizesLine && (
            <p className="text-[11px] text-zinc-500 truncate flex items-center gap-1">
              {variantBadge}
              <ChevronRight className="w-3 h-3" />
            </p>
          )}
        </div>
      </div>

      {/* Add Button - Black Circle */}
      <motion.button
        onClick={handleAddToCart}
        whileTap={{ scale: 0.95 }}
        disabled={isAdding}
        className={`
          flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center
          transition-all duration-200
          ${showCheck 
            ? 'bg-black text-white' 
            : 'bg-black text-white hover:bg-zinc-800'
          }
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2
        `}
        aria-label={`Add ${product.title} to cart`}
      >
        {showCheck ? (
          <Check className="w-4 h-4" strokeWidth={2.5} />
        ) : (
          <Plus className="w-4 h-4" strokeWidth={2.5} />
        )}
      </motion.button>
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.15) }}
    >
      <Link 
        href={productUrl}
        className="flex items-center gap-4 p-4 bg-white border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors"
      >
        {cardContent}
      </Link>
    </motion.div>
  );
}
