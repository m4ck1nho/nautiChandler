'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Minus, ShoppingCart, Check, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Product, DbProduct, DbProductGrouped } from '@/lib/types';
import { useCartStore } from '@/store/cartStore';
import { extractVariantInfo } from '@/lib/productGrouping';
import { ProductVariants } from '@/components/products/ProductVariants';
import { Navbar } from '@/components/layout/Navbar';

// Grayscale placeholder
const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23f4f4f5' width='100' height='100'/%3E%3Crect fill='%23e4e4e7' x='25' y='25' width='50' height='50' rx='4'/%3E%3C/svg%3E";

// Union type for any product
type AnyProduct = Product | DbProductGrouped;

// Proxy external images
function getProxiedImageUrl(url: string | undefined | null): string {
  if (!url) return PLACEHOLDER_IMAGE;
  if (url.startsWith('data:') || url.startsWith('/')) return url;
  if (url.includes('nautichandler.com')) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

// Type guard for database product
function isDbProduct(product: AnyProduct): product is DbProductGrouped {
  return 'group_id' in product;
}

// Get product properties uniformly
function getProductImage(product: AnyProduct): string {
  return isDbProduct(product) ? (product.image || '') : product.image;
}

function getProductLink(product: AnyProduct): string {
  return isDbProduct(product) ? (product.link || '') : product.link;
}

function getProductPrice(product: AnyProduct): string {
  return product.price;
}

interface VariantGroup {
  sizes: string[];
  colors: string[];
  materials: string[];
}

export default function ProductDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const productId = params.id as string;
  const groupId = searchParams.get('group');

  const [product, setProduct] = useState<AnyProduct | null>(null);
  const [variants, setVariants] = useState<AnyProduct[]>([]);
  const [variantOptions, setVariantOptions] = useState<VariantGroup>({ sizes: [], colors: [], materials: [] });
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(groupId);

  const { addItem } = useCartStore();

  // Fetch product and variants
  useEffect(() => {
    async function fetchProduct() {
      setIsLoading(true);
      setError(null);

      try {
        // Try database first - fetch by group_id or product_id
        let dbResponse;
        
        if (groupId) {
          // Fetch all variants for this group
          dbResponse = await fetch(`/api/products/db?groupId=${encodeURIComponent(groupId)}`);
        } else {
          // Fetch product by ID (will also return its group variants)
          dbResponse = await fetch(`/api/products/db?productId=${encodeURIComponent(productId)}`);
        }
        
        const dbData = await dbResponse.json();
        
        if (dbData.products && dbData.products.length > 0) {
          const dbProducts = dbData.products as DbProductGrouped[];
          const mainProduct = dbProducts.find(p => p.id === productId) || dbProducts[0];
          
          setProduct(mainProduct);
          setVariants(dbProducts);
          
          // Get group_id from the product
          const productGroupId = mainProduct.group_id;
          setCurrentGroupId(productGroupId);
          
          // Extract variant options from the first product's aggregate data
          const firstProduct = dbProducts[0];
          const sizes = firstProduct.available_sizes || [];
          const colors = firstProduct.available_colors || [];
          
          setVariantOptions({ 
            sizes, 
            colors, 
            materials: [] // Materials not commonly used
          });
          
          // Pre-select current product's options
          if (mainProduct.size) setSelectedSize(mainProduct.size);
          if (mainProduct.color) setSelectedColor(mainProduct.color);
          
          setIsLoading(false);
          return;
        }

        // Fallback: Fetch from scraper and do client-side grouping
        console.log('Database fetch returned no results, trying scraper...');
        const response = await fetch(`/api/products?featured=true&page=1`);
        const data = await response.json();

        if (data.products && data.products.length > 0) {
          // Find the main product
          const mainProduct = data.products.find((p: Product) => p.id === productId);
          
          if (mainProduct) {
            setProduct(mainProduct);
            
            // Get variant info from the main product
            const { baseName, size, color } = extractVariantInfo(mainProduct.title);
            
            // Find all variants (products with similar base name)
            const allVariants = data.products.filter((p: Product) => {
              const { baseName: pBaseName } = extractVariantInfo(p.title);
              return pBaseName.toLowerCase().includes(baseName.toLowerCase().substring(0, 20)) ||
                     baseName.toLowerCase().includes(pBaseName.toLowerCase().substring(0, 20));
            });

            setVariants(allVariants);

            // Extract unique variant options
            const sizes = new Set<string>();
            const colors = new Set<string>();

            allVariants.forEach((v: Product) => {
              const info = extractVariantInfo(v.title);
              if (info.size) sizes.add(info.size);
              if (info.color) colors.add(info.color);
            });

            setVariantOptions({
              sizes: Array.from(sizes),
              colors: Array.from(colors),
              materials: [],
            });

            // Pre-select current product's options
            if (size) setSelectedSize(size);
            if (color) setSelectedColor(color);
          } else {
            setError('Product not found');
          }
        } else {
          setError('No products available');
        }
      } catch (err) {
        console.error('Failed to fetch product:', err);
        setError('Failed to load product');
      } finally {
        setIsLoading(false);
      }
    }

    fetchProduct();
  }, [productId, groupId]);

  // Handle variant selection from ProductVariants component
  const handleSelectVariant = (variant: AnyProduct) => {
    setProduct(variant);
    setImageLoaded(false);
    
    // Update selected options
    if (isDbProduct(variant)) {
      if (variant.size) setSelectedSize(variant.size);
      if (variant.color) setSelectedColor(variant.color);
    } else {
      const info = extractVariantInfo(variant.title);
      if (info.size) setSelectedSize(info.size);
      if (info.color) setSelectedColor(info.color);
    }
    
    // Soft navigate to update URL
    const groupParam = currentGroupId ? `?group=${currentGroupId}` : '';
    router.replace(`/product/${variant.id}${groupParam}`, { scroll: false });
  };

  const handleAddToCart = () => {
    if (!product || isAdding) return;

    setIsAdding(true);
    
    for (let i = 0; i < quantity; i++) {
      addItem({
        title: product.title,
        price: getProductPrice(product),
        image: getProductImage(product),
        link: getProductLink(product),
      });
    }

    setTimeout(() => {
      setShowCheck(true);
      setTimeout(() => {
        setShowCheck(false);
        setIsAdding(false);
      }, 1000);
    }, 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="pt-16 max-w-4xl mx-auto px-4 py-8">
          {/* Back button skeleton */}
          <div className="h-10 w-24 bg-zinc-100 rounded-lg animate-pulse mb-8" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Image skeleton */}
            <div className="aspect-square bg-zinc-100 rounded-xl animate-pulse" />
            
            {/* Info skeleton */}
            <div className="space-y-4">
              <div className="h-8 bg-zinc-100 rounded animate-pulse w-3/4" />
              <div className="h-6 bg-zinc-100 rounded animate-pulse w-1/4" />
              <div className="h-24 bg-zinc-100 rounded animate-pulse" />
              <div className="h-12 bg-zinc-100 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="pt-16 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-xl font-bold text-black mb-2">Product not found</h1>
            <p className="text-zinc-500 mb-4">{error || 'The product you&apos;re looking for doesn&apos;t exist.'}</p>
            <Link 
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Logic Section: Define all variables after early returns (product is guaranteed non-null here)
  const hasVariants = variants.length > 1;
  const proxiedImage = getProxiedImageUrl(getProductImage(product));
  const productLink = getProductLink(product);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-16 max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8"
        >
          <Link 
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-black hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to products
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Product Image */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative aspect-square bg-zinc-50 rounded-xl overflow-hidden border border-zinc-200"
          >
            {!imageLoaded && (
              <div className="absolute inset-0 bg-zinc-100 animate-pulse" />
            )}
            <img
              src={proxiedImage}
              alt={product.title}
              referrerPolicy="no-referrer"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(true)}
              className={`w-full h-full object-contain p-4 ${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
            />
          </motion.div>

          {/* Product Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            {/* Title */}
            <h1 className="text-2xl font-bold text-black leading-tight">
              {product.title}
            </h1>

            {/* Price */}
            <p className="text-3xl font-bold text-black">
              {getProductPrice(product)}
            </p>

            {/* Variant Selectors - Using ProductVariants component */}
            {hasVariants && (
              <ProductVariants
                variants={variants}
                currentProductId={product.id}
                onSelectVariant={handleSelectVariant}
                availableSizes={variantOptions.sizes}
                availableColors={variantOptions.colors}
                selectedSize={selectedSize}
                selectedColor={selectedColor}
                onSizeChange={setSelectedSize}
                onColorChange={setSelectedColor}
              />
            )}

            {/* Quantity Selector */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Quantity
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-lg border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-lg font-medium w-12 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-lg border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Add to Cart Button */}
            <motion.button
              onClick={handleAddToCart}
              disabled={isAdding}
              whileTap={{ scale: 0.98 }}
              className={`w-full py-4 rounded-xl font-medium text-white flex items-center justify-center gap-2 transition-all ${
                showCheck 
                  ? 'bg-green-600' 
                  : 'bg-black hover:bg-zinc-800'
              }`}
            >
              {showCheck ? (
                <>
                  <Check className="w-5 h-5" />
                  Added to cart
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  Add to cart
                </>
              )}
            </motion.button>

            {/* External Link */}
            {productLink && (
              <a
                href={productLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-black transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View on nautichandler.com
              </a>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
