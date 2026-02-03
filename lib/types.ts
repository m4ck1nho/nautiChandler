// Product type from scraping nautichandler.com
export interface Product {
  id: string;
  title: string;
  price: string;
  image: string | null;
  link: string;
  description?: string;
  // Optional variant info - extracted from title or product data
  size?: string;
  color?: string;
  material?: string;
  category?: string;
}

// Database product (supports both flat and grouped schemas)
export interface DbProduct {
  id: string;
  title: string;
  price: string;
  image: string | null;
  link: string | null;
  // Optional fields - may not exist in flat schema
  price_numeric?: number | null;
  description?: string | null;
  group_id?: string | null;
  base_name?: string | null;
  size?: string | null;
  color?: string | null;
  material?: string | null;
  category?: string | null;
  in_stock?: boolean;
  source?: string;
  created_at?: string;
  updated_at?: string;
}

// Grouped product from database view (fields optional for flat architecture)
export interface DbProductGrouped extends DbProduct {
  variant_count?: number;
  min_price?: number | null;
  max_price?: number | null;
  available_sizes?: string[] | null;
  available_colors?: string[] | null;
}

// Variant option for a product
export interface VariantOption {
  type: 'size' | 'color' | 'material' | 'other';
  value: string;
  productId: string;
}

// Product with variants grouped
export interface ProductGroup {
  groupId: string;       // Unique group identifier (from base name)
  baseName: string;      // The common product name without variant suffixes
  representative: Product; // The "main" product to display (usually first or lowest price)
  variants: Product[];   // All products in this group
  variantCount: number;  // Total number of variants
  variantOptions: {      // Available options for each variant type
    sizes?: string[];
    colors?: string[];
    materials?: string[];
  };
  priceRange?: {
    min: string;
    max: string;
    minNumeric: number;
    maxNumeric: number;
  };
}

// Extended product with group info for UI display
export interface ProductWithVariants extends Product {
  groupId?: string;
  variantCount?: number;
  hasVariants?: boolean;
  variantOptions?: {
    sizes?: string[];
    colors?: string[];
    materials?: string[];
  };
}

// Cart item stored in Supabase
export interface CartItem {
  id: string;
  session_id: string;
  product_title: string;
  product_price: string;
  product_image: string;
  product_link?: string;
  quantity: number;
  created_at?: string;
}

// API response types
export interface ProductsResponse {
  products: Product[];
  grouped?: ProductWithVariants[]; // Deduplicated products with variant info
  error?: string;
}

// Filter options for search
export interface ProductFilters {
  priceMin?: number;
  priceMax?: number;
  category?: string;
  inStock?: boolean;
  sortBy?: 'price-asc' | 'price-desc' | 'name' | 'newest';
}

// Order type for delivery toggle
export type OrderType = 'delivery' | 'pickup';
