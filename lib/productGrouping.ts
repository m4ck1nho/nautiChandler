import { Product, ProductGroup, ProductWithVariants } from './types';

// Common size patterns to extract from product titles
const SIZE_PATTERNS = [
  // Dimensions (e.g., 50mmx50m, 15x60cm, 8mm, 12mm)
  /\b(\d+(?:\.\d+)?(?:mm|cm|m|inch|in|ft|'|")(?:\s*x\s*\d+(?:\.\d+)?(?:mm|cm|m|inch|in|ft|'|")?)?)\b/gi,
  // Letter sizes (S, M, L, XL, XXL)
  /\b(XXS|XS|S|M|L|XL|XXL|XXXL|2XL|3XL)\b/gi,
  // Numeric sizes with units
  /\b(\d+(?:\.\d+)?(?:kg|g|L|ml|liter|litre|gal|gallon))\b/gi,
  // Just numbers that might be sizes (e.g., "Size 8", "No. 12")
  /\b(?:size|no\.?|#)\s*(\d+)\b/gi,
];

// Common color patterns
const COLOR_PATTERNS = [
  /\b(black|white|red|blue|green|yellow|orange|purple|pink|grey|gray|brown|navy|beige|silver|gold|chrome|stainless|brass)\b/gi,
];

// Material patterns
const MATERIAL_PATTERNS = [
  /\b(stainless\s*steel|steel|aluminum|aluminium|plastic|nylon|polyester|rubber|silicone|leather|canvas|wood|teak|brass|copper|zinc|chrome)\b/gi,
];

/**
 * Parse price string to number for comparison
 */
export function parsePrice(priceStr: string): number {
  // Remove currency symbols and thousands separators, normalize decimal
  const cleaned = priceStr
    .replace(/[€$£¥₹]/g, '')
    .replace(/\s/g, '')
    .replace(/,(\d{2})$/, '.$1') // Handle European format (1.234,56)
    .replace(/,/g, ''); // Remove other commas
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Extract variant info from product title
 */
export function extractVariantInfo(title: string): {
  baseName: string;
  size?: string;
  color?: string;
  material?: string;
} {
  let baseName = title;
  let size: string | undefined;
  let color: string | undefined;
  let material: string | undefined;

  // Extract size
  for (const pattern of SIZE_PATTERNS) {
    const match = title.match(pattern);
    if (match) {
      size = match[0];
      break;
    }
  }

  // Extract color
  for (const pattern of COLOR_PATTERNS) {
    const match = title.match(pattern);
    if (match) {
      color = match[0];
      break;
    }
  }

  // Extract material
  for (const pattern of MATERIAL_PATTERNS) {
    const match = title.match(pattern);
    if (match) {
      material = match[0];
      break;
    }
  }

  // Create base name by removing variant-specific parts
  // But keep the core product identifier
  baseName = title
    // Remove size patterns (be careful not to remove essential info)
    .replace(/\b\d+(?:\.\d+)?(?:mm|cm)(?:\s*x\s*\d+(?:\.\d+)?(?:mm|cm|m)?)?\b/gi, '')
    // Remove common color words at the end
    .replace(/\s+(black|white|red|blue|green|yellow|orange|purple|pink|grey|gray|brown|navy)\s*$/gi, '')
    // Remove letter sizes at the end
    .replace(/\s+(XXS|XS|S|M|L|XL|XXL|XXXL|2XL|3XL)\s*$/gi, '')
    // Remove weight/volume at the end
    .replace(/\s+\d+(?:\.\d+)?(?:kg|g|L|ml)\s*$/gi, '')
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim();

  return { baseName, size, color, material };
}

/**
 * Generate a group ID from base name
 */
function generateGroupId(baseName: string): string {
  return baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Group products by their base name (variants grouped together)
 */
export function groupProducts(products: Product[]): ProductGroup[] {
  const groups = new Map<string, ProductGroup>();

  for (const product of products) {
    const { baseName, size, color, material } = extractVariantInfo(product.title);
    const groupId = generateGroupId(baseName);

    // Add variant info to product
    const productWithVariants: Product = {
      ...product,
      size,
      color,
      material,
    };

    if (groups.has(groupId)) {
      const group = groups.get(groupId)!;
      group.variants.push(productWithVariants);
      group.variantCount++;

      // Update variant options
      if (size && !group.variantOptions.sizes?.includes(size)) {
        group.variantOptions.sizes = [...(group.variantOptions.sizes || []), size];
      }
      if (color && !group.variantOptions.colors?.includes(color)) {
        group.variantOptions.colors = [...(group.variantOptions.colors || []), color];
      }
      if (material && !group.variantOptions.materials?.includes(material)) {
        group.variantOptions.materials = [...(group.variantOptions.materials || []), material];
      }
    } else {
      groups.set(groupId, {
        groupId,
        baseName,
        representative: productWithVariants,
        variants: [productWithVariants],
        variantCount: 1,
        variantOptions: {
          sizes: size ? [size] : [],
          colors: color ? [color] : [],
          materials: material ? [material] : [],
        },
      });
    }
  }

  // Calculate price ranges and choose best representative
  const result: ProductGroup[] = [];
  
  for (const group of groups.values()) {
    if (group.variants.length > 1) {
      // Calculate price range
      const prices = group.variants.map(v => parsePrice(v.price)).filter(p => p > 0);
      if (prices.length > 0) {
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        
        group.priceRange = {
          min: group.variants.find(v => parsePrice(v.price) === minPrice)?.price || '',
          max: group.variants.find(v => parsePrice(v.price) === maxPrice)?.price || '',
          minNumeric: minPrice,
          maxNumeric: maxPrice,
        };

        // Choose representative as the lowest priced item
        group.representative = group.variants.find(v => parsePrice(v.price) === minPrice) || group.variants[0];
      }
    }
    
    // Clean up empty variant options
    if (group.variantOptions.sizes?.length === 0) delete group.variantOptions.sizes;
    if (group.variantOptions.colors?.length === 0) delete group.variantOptions.colors;
    if (group.variantOptions.materials?.length === 0) delete group.variantOptions.materials;
    
    result.push(group);
  }

  return result;
}

/**
 * Convert products to deduplicated list with variant info
 * Returns one representative product per group with variant count
 */
export function deduplicateProducts(products: Product[]): ProductWithVariants[] {
  const groups = groupProducts(products);
  
  return groups.map(group => ({
    ...group.representative,
    groupId: group.groupId,
    variantCount: group.variantCount,
    hasVariants: group.variantCount > 1,
    variantOptions: group.variantOptions,
  }));
}

/**
 * Get all variants for a specific product group
 */
export function getVariantsForProduct(products: Product[], productId: string): Product[] {
  // First find the product
  const product = products.find(p => p.id === productId);
  if (!product) return [];

  // Get its group
  const { baseName } = extractVariantInfo(product.title);
  const groupId = generateGroupId(baseName);

  // Return all products in that group
  return products.filter(p => {
    const { baseName: pBaseName } = extractVariantInfo(p.title);
    return generateGroupId(pBaseName) === groupId;
  });
}

/**
 * Find a product group by group ID
 */
export function findProductGroup(products: Product[], groupId: string): ProductGroup | undefined {
  const groups = groupProducts(products);
  return groups.find(g => g.groupId === groupId);
}
