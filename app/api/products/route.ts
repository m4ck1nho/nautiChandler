import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import { Product, ProductWithVariants, ProductFilters } from '@/lib/types';
import { deduplicateProducts, parsePrice } from '@/lib/productGrouping';

// Extended response interface with pagination
interface ProductsResponse {
  products: Product[];
  grouped?: ProductWithVariants[]; // Deduplicated products with variant info
  page: number;
  hasMore: boolean;
  total?: number;
  error?: string;
  source?: string;
}

// Create an HTTPS agent that doesn't reject unauthorized certificates
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

// Create axios instance
const axiosInstance = axios.create({
  httpsAgent,
  timeout: 25000,
  maxRedirects: 5,
});

// Common headers for requests
const browserHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
};

// Sample products data for demo/fallback
const sampleProducts: Product[] = [
  {
    id: '1001',
    title: '3M Yellow Masking Paper Tape 50mmx50m',
    price: '€15.82',
    image: 'https://nautichandler.com/2817-home_default/3m-yellow-masking-paper-tape-50mmx50m.jpg',
    link: 'https://nautichandler.com/en/3m-yellow-masking-paper-tape-50mmx50m',
    description: 'Professional grade masking tape for marine applications',
  },
  {
    id: '1002',
    title: 'WEST SYSTEM 105/205a Pack Resin 1.2kg',
    price: '€51.85',
    image: 'https://nautichandler.com/2819-home_default/west-system-105-205a-pack-resin-12kg.jpg',
    link: 'https://nautichandler.com/en/west-system-105-205a-pack-resin-12kg',
    description: 'High-quality epoxy resin system for boat repairs',
  },
  {
    id: '1003',
    title: 'Gamazyme 700FN Marine Degreaser 12kg',
    price: '€89.99',
    image: 'https://nautichandler.com/2820-home_default/gamazyme-700fn-12kg.jpg',
    link: 'https://nautichandler.com/en/gamazyme-700fn-12kg',
    description: 'Industrial degreaser for marine engines',
  },
  {
    id: '1004',
    title: 'Stainless Steel Anchor Chain 8mm',
    price: '€45.00',
    image: 'https://nautichandler.com/2821-home_default/anchor-chain-8mm.jpg',
    link: 'https://nautichandler.com/en/anchor-chain-8mm',
    description: 'Heavy-duty stainless steel anchor chain per meter',
  },
  {
    id: '1005',
    title: 'Marine Safety Rope 12mm Orange',
    price: '€32.50',
    image: 'https://nautichandler.com/2822-home_default/safety-rope-12mm.jpg',
    link: 'https://nautichandler.com/en/safety-rope-12mm-orange',
    description: 'High-visibility floating safety rope for rescue operations',
  },
  {
    id: '1006',
    title: 'LED Navigation Light Set',
    price: '€78.90',
    image: 'https://nautichandler.com/2823-home_default/led-navigation-light-set.jpg',
    link: 'https://nautichandler.com/en/led-navigation-light-set',
    description: 'Complete port and starboard navigation lights',
  },
  {
    id: '1007',
    title: 'Boat Fender 15x60cm White',
    price: '€24.99',
    image: 'https://nautichandler.com/2824-home_default/boat-fender-white.jpg',
    link: 'https://nautichandler.com/en/boat-fender-15x60-white',
    description: 'UV-resistant inflatable boat fender',
  },
  {
    id: '1008',
    title: 'Marine VHF Radio Handheld Waterproof',
    price: '€129.00',
    image: 'https://nautichandler.com/2825-home_default/vhf-radio-handheld.jpg',
    link: 'https://nautichandler.com/en/marine-vhf-radio-handheld',
    description: 'Waterproof handheld VHF radio with GPS',
  },
  {
    id: '1009',
    title: 'Automatic Bilge Pump 1100 GPH',
    price: '€56.00',
    image: 'https://nautichandler.com/2826-home_default/bilge-pump-1100gph.jpg',
    link: 'https://nautichandler.com/en/bilge-pump-1100-gph',
    description: 'Automatic bilge pump with float switch',
  },
  {
    id: '1010',
    title: 'Mooring Line 14mm x 10m Pre-Spliced',
    price: '€38.50',
    image: 'https://nautichandler.com/2827-home_default/mooring-line-14mm.jpg',
    link: 'https://nautichandler.com/en/mooring-line-14mm-10m',
    description: 'Pre-spliced mooring line with eye loop',
  },
  {
    id: '1011',
    title: 'Antifouling Paint Blue 2.5L',
    price: '€89.99',
    image: 'https://nautichandler.com/2828-home_default/antifouling-blue.jpg',
    link: 'https://nautichandler.com/en/antifouling-paint-blue-2-5l',
    description: 'Self-polishing antifouling hull paint',
  },
  {
    id: '1012',
    title: 'Automatic Life Jacket 150N Adult',
    price: '€95.00',
    image: 'https://nautichandler.com/2829-home_default/life-jacket-auto-150n.jpg',
    link: 'https://nautichandler.com/en/life-jacket-automatic-150n',
    description: 'SOLAS approved automatic inflatable life jacket',
  },
  {
    id: '1013',
    title: 'Deck Brush with Telescopic Handle',
    price: '€18.50',
    image: 'https://nautichandler.com/2830-home_default/deck-brush.jpg',
    link: 'https://nautichandler.com/en/deck-brush-with-handle',
    description: 'Stiff bristle deck brush with telescopic handle',
  },
  {
    id: '1014',
    title: 'Marine Battery 12V 100Ah Deep Cycle',
    price: '€185.00',
    image: 'https://nautichandler.com/2831-home_default/marine-battery-100ah.jpg',
    link: 'https://nautichandler.com/en/marine-battery-12v-100ah',
    description: 'Deep cycle marine battery with dual terminals',
  },
  {
    id: '1015',
    title: 'Premium Teak Oil 1L',
    price: '€28.00',
    image: 'https://nautichandler.com/2832-home_default/teak-oil-1l.jpg',
    link: 'https://nautichandler.com/en/teak-oil-1l',
    description: 'Premium teak wood protection and restoration oil',
  },
  {
    id: '1016',
    title: 'Marine Compass Flush Mount',
    price: '€67.50',
    image: 'https://nautichandler.com/2833-home_default/marine-compass.jpg',
    link: 'https://nautichandler.com/en/marine-compass-flush-mount',
    description: 'Precision marine compass with LED illumination',
  },
  {
    id: '1017',
    title: 'Anchor Swivel Stainless Steel',
    price: '€35.00',
    image: 'https://nautichandler.com/2834-home_default/anchor-swivel.jpg',
    link: 'https://nautichandler.com/en/anchor-swivel-stainless',
    description: 'Heavy duty anchor chain swivel connector',
  },
  {
    id: '1018',
    title: 'Marine First Aid Kit Offshore',
    price: '€75.00',
    image: 'https://nautichandler.com/2835-home_default/first-aid-kit.jpg',
    link: 'https://nautichandler.com/en/marine-first-aid-kit',
    description: 'Complete offshore first aid kit waterproof case',
  },
  {
    id: '1019',
    title: 'Boat Cover 5m Blue Heavy Duty',
    price: '€145.00',
    image: 'https://nautichandler.com/2836-home_default/boat-cover-5m.jpg',
    link: 'https://nautichandler.com/en/boat-cover-5m-blue',
    description: 'UV resistant heavy duty boat cover',
  },
  {
    id: '1020',
    title: 'Signal Horn Air Canister',
    price: '€22.00',
    image: 'https://nautichandler.com/2837-home_default/signal-horn.jpg',
    link: 'https://nautichandler.com/en/signal-horn-air',
    description: 'Emergency signal air horn with spare canister',
  },
];

// Generate a unique ID from the product link
function generateProductId(link: string, index: number): string {
  const match = link.match(/\/(\d+)-/);
  if (match) {
    return match[1];
  }
  return `product-${index}-${Date.now()}`;
}

// Clean price string
function cleanPrice(price: string): string {
  return price.replace(/\s+/g, ' ').trim();
}

// Clean title string
function cleanTitle(title: string): string {
  return title.replace(/\s+/g, ' ').trim();
}

// Parse products from HTML
function parseProducts($: cheerio.CheerioAPI): Product[] {
  const products: Product[] = [];

  // Try multiple selector patterns used by PrestaShop themes
  const selectors = [
    '.product-miniature',
    '.product-container',
    '.product-item',
    '[data-id-product]',
    '.js-product-miniature',
  ];

  for (const selector of selectors) {
    $(selector).each((index, element) => {
      try {
        const $product = $(element);

        // Try multiple title selectors
        let title = '';
        let link = '';
        const titleSelectors = ['.product-title a', '.product-name a', 'h3 a', 'h2 a', '.name a'];
        for (const ts of titleSelectors) {
          const el = $product.find(ts).first();
          if (el.length) {
            title = cleanTitle(el.text());
            link = el.attr('href') || '';
            break;
          }
        }

        // Try multiple price selectors
        let price = '';
        const priceSelectors = ['.price', '.product-price', '[itemprop="price"]', '.current-price'];
        for (const ps of priceSelectors) {
          const el = $product.find(ps).first();
          if (el.length) {
            price = cleanPrice(el.text());
            break;
          }
        }

        // ROBUST IMAGE EXTRACTION - Handle lazy loading and relative URLs
        let image = '';
        const imgSelectors = [
          '.thumbnail-container img',
          '.product-image img', 
          '.product-thumbnail img',
          '.product-cover img',
          'a.thumbnail img',
          'img.product-thumbnail-first',
          'img'
        ];
        
        for (const is of imgSelectors) {
          const imgElement = $product.find(is).first();
          if (imgElement.length) {
            // Try multiple attributes (lazy loading often uses data-src or data-cover)
            image = imgElement.attr('data-src') 
              || imgElement.attr('data-full-size-image-url')
              || imgElement.attr('data-cover')
              || imgElement.attr('data-lazy-src')
              || imgElement.attr('data-original')
              || imgElement.attr('src') 
              || '';
            
            if (image) break;
          }
        }

        // CLEANUP: Fix relative URLs and protocol-relative URLs
        if (image) {
          image = image.trim();
          
          // Handle protocol-relative URLs (//example.com/image.jpg)
          if (image.startsWith('//')) {
            image = 'https:' + image;
          }
          // Handle root-relative URLs (/path/to/image.jpg)
          else if (image.startsWith('/')) {
            image = 'https://nautichandler.com' + image;
          }
          // Handle relative URLs (path/to/image.jpg)
          else if (!image.startsWith('http')) {
            image = 'https://nautichandler.com/' + image;
          }
          
          // Clean up any double slashes (except after https:)
          image = image.replace(/([^:])\/\//g, '$1/');
        }

        if (title && price && link) {
          products.push({
            id: generateProductId(link, products.length),
            title,
            price,
            image,
            link,
          });
        }
      } catch (err) {
        console.error('Error parsing product:', err);
      }
    });

    if (products.length > 0) break;
  }

  return products;
}

// Check if there's a next page
function hasNextPage($: cheerio.CheerioAPI, currentPage: number): boolean {
  // Look for pagination elements
  const paginationSelectors = [
    '.pagination .next:not(.disabled)',
    '.pagination-nav .next',
    'a[rel="next"]',
    `.pagination li:contains("${currentPage + 1}")`,
  ];

  for (const selector of paginationSelectors) {
    if ($(selector).length > 0) {
      return true;
    }
  }

  // Also check if current page link exists and there's more
  const pageLinks = $('.pagination a, .pagination li').length;
  return pageLinks > currentPage;
}

// Build the URL for a search/category with pagination
function buildUrl(query: string, categoryId: string, categoryUrl: string, page: number): string {
  const baseUrl = 'https://nautichandler.com';
  
  // If we have a full category URL, use it
  if (categoryUrl && categoryUrl.includes('/en/')) {
    const url = categoryUrl.startsWith('http') ? categoryUrl : `${baseUrl}${categoryUrl}`;
    return page > 1 ? `${url}?page=${page}` : url;
  }
  
  // If we have a category ID, build the category URL
  if (categoryId && categoryId !== 'featured') {
    return page > 1 
      ? `${baseUrl}/en/${categoryId}?page=${page}`
      : `${baseUrl}/en/${categoryId}`;
  }
  
  // If we have a search query
  if (query) {
    const searchUrl = `${baseUrl}/en/search?controller=search&s=${encodeURIComponent(query)}`;
    return page > 1 ? `${searchUrl}&page=${page}` : searchUrl;
  }
  
  // Default: homepage (featured products)
  return `${baseUrl}/en/`;
}

// Filter products by query (for mock data)
function filterProducts(products: Product[], query: string): Product[] {
  if (!query) return products;
  
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);
  
  return products.filter(p => {
    const titleLower = p.title.toLowerCase();
    const descLower = (p.description || '').toLowerCase();
    
    return queryWords.some(word => 
      titleLower.includes(word) || descLower.includes(word)
    );
  });
}

// Apply filters to products
function applyFilters(products: Product[], filters: ProductFilters): Product[] {
  let filtered = [...products];

  // Price filter
  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    filtered = filtered.filter(p => {
      const price = parsePrice(p.price);
      if (filters.priceMin !== undefined && price < filters.priceMin) return false;
      if (filters.priceMax !== undefined && price > filters.priceMax) return false;
      return true;
    });
  }

  // Sort
  if (filters.sortBy) {
    switch (filters.sortBy) {
      case 'price-asc':
        filtered.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
        break;
      case 'price-desc':
        filtered.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
        break;
      case 'name':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }
  }

  return filtered;
}

export async function GET(request: NextRequest): Promise<NextResponse<ProductsResponse>> {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const categoryId = searchParams.get('category') || searchParams.get('categoryId') || '';
  const categoryUrl = searchParams.get('categoryUrl') || '';
  const featured = searchParams.get('featured') === 'true';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const perPage = 20;
  
  // New params for filtering and grouping
  const deduplicate = searchParams.get('deduplicate') === 'true';
  const priceMin = searchParams.get('priceMin') ? parseFloat(searchParams.get('priceMin')!) : undefined;
  const priceMax = searchParams.get('priceMax') ? parseFloat(searchParams.get('priceMax')!) : undefined;
  const sortBy = searchParams.get('sortBy') as ProductFilters['sortBy'] | undefined;

  const filters: ProductFilters = { priceMin, priceMax, sortBy };

  // If no query and not featured/category, return featured
  const isFeaturedRequest = featured || (!query && !categoryId);

  try {
    const targetUrl = buildUrl(query, categoryId, categoryUrl, page);
    console.log(`Fetching products: ${targetUrl} (page ${page})`);

    const response = await axiosInstance.get(targetUrl, {
      headers: browserHeaders,
    });

    const html = response.data;
    const $ = cheerio.load(html);

    let products = parseProducts($);
    const hasMore = hasNextPage($, page);

    console.log(`Scraped ${products.length} products (page ${page}, hasMore: ${hasMore})`);

    if (products.length > 0) {
      // Apply filters
      products = applyFilters(products, filters);
      
      // Optionally deduplicate (group variants)
      const grouped = deduplicate ? deduplicateProducts(products) : undefined;
      
      return NextResponse.json({ 
        products,
        grouped,
        page, 
        hasMore,
        source: 'live'
      });
    }

    // Fall through to mock data
    console.log('No products scraped, using sample data');

  } catch (error) {
    console.error('Scraping error:', error instanceof Error ? error.message : error);
  }

  // Mock data fallback with pagination simulation
  let products = [...sampleProducts];
  
  // Filter by query if searching
  if (query) {
    products = filterProducts(products, query);
  } else if (categoryId && categoryId !== 'featured') {
    // Simulate category filtering
    products = filterProducts(products, categoryId);
  }

  // Apply additional filters
  products = applyFilters(products, filters);

  // Simulate pagination
  const startIndex = (page - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedProducts = products.slice(startIndex, endIndex);
  const hasMore = endIndex < products.length;

  // Optionally deduplicate (group variants)
  const grouped = deduplicate ? deduplicateProducts(paginatedProducts) : undefined;

  console.log(`Returning ${paginatedProducts.length} sample products (page ${page}/${Math.ceil(products.length / perPage)})`);

  return NextResponse.json({ 
    products: paginatedProducts,
    grouped,
    page,
    hasMore,
    total: products.length,
    source: 'sample'
  });
}
