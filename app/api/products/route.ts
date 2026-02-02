import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import { Product, ProductsResponse } from '@/lib/types';

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

// Sample products data for demo/fallback (based on real nautichandler.com products)
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
    title: 'Gamazyme 700FN 12kg',
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
    title: 'Marine VHF Radio Handheld',
    price: '€129.00',
    image: 'https://nautichandler.com/2825-home_default/vhf-radio-handheld.jpg',
    link: 'https://nautichandler.com/en/marine-vhf-radio-handheld',
    description: 'Waterproof handheld VHF radio with GPS',
  },
  {
    id: '1009',
    title: 'Bilge Pump 1100 GPH',
    price: '€56.00',
    image: 'https://nautichandler.com/2826-home_default/bilge-pump-1100gph.jpg',
    link: 'https://nautichandler.com/en/bilge-pump-1100-gph',
    description: 'Automatic bilge pump with float switch',
  },
  {
    id: '1010',
    title: 'Mooring Line 14mm x 10m',
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
    title: 'Life Jacket Automatic 150N',
    price: '€95.00',
    image: 'https://nautichandler.com/2829-home_default/life-jacket-auto-150n.jpg',
    link: 'https://nautichandler.com/en/life-jacket-automatic-150n',
    description: 'SOLAS approved automatic inflatable life jacket',
  },
  {
    id: '1013',
    title: 'Deck Brush with Handle',
    price: '€18.50',
    image: 'https://nautichandler.com/2830-home_default/deck-brush.jpg',
    link: 'https://nautichandler.com/en/deck-brush-with-handle',
    description: 'Stiff bristle deck brush with telescopic handle',
  },
  {
    id: '1014',
    title: 'Marine Battery 12V 100Ah',
    price: '€185.00',
    image: 'https://nautichandler.com/2831-home_default/marine-battery-100ah.jpg',
    link: 'https://nautichandler.com/en/marine-battery-12v-100ah',
    description: 'Deep cycle marine battery with dual terminals',
  },
  {
    id: '1015',
    title: 'Teak Oil 1L',
    price: '€28.00',
    image: 'https://nautichandler.com/2832-home_default/teak-oil-1l.jpg',
    link: 'https://nautichandler.com/en/teak-oil-1l',
    description: 'Premium teak wood protection and restoration oil',
  },
];

// Generate a unique ID from the product link
function generateProductId(link: string, index: number): string {
  const match = link.match(/\/(\d+)-/);
  if (match) {
    return match[1];
  }
  return `product-${index}`;
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

        // Try multiple image selectors
        let image = '';
        const imgSelectors = ['.thumbnail-container img', '.product-image img', '.product-thumbnail img', 'img'];
        for (const is of imgSelectors) {
          const el = $product.find(is).first();
          if (el.length) {
            image = el.attr('data-src') || el.attr('data-lazy-src') || el.attr('src') || '';
            break;
          }
        }

        // Ensure absolute URL
        if (image && !image.startsWith('http')) {
          image = `https://nautichandler.com${image.startsWith('/') ? '' : '/'}${image}`;
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

// Search/filter products by query
function filterProducts(products: Product[], query: string): Product[] {
  if (!query) return products;
  
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);
  
  return products.filter(p => {
    const titleLower = p.title.toLowerCase();
    const descLower = (p.description || '').toLowerCase();
    
    // Check if any query word matches title or description
    return queryWords.some(word => 
      titleLower.includes(word) || descLower.includes(word)
    );
  });
}

export async function GET(request: NextRequest): Promise<NextResponse<ProductsResponse>> {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || searchParams.get('category') || '';
  const featured = searchParams.get('featured') === 'true';
  const useMock = searchParams.get('mock') !== 'false'; // Default to using mock data

  // If no query and not requesting featured, return error
  if (!query && !featured) {
    return NextResponse.json(
      { products: [], error: 'Query parameter "q" or "featured=true" is required' },
      { status: 400 }
    );
  }

  // First try to scrape real data
  try {
    let targetUrl: string;

    if (featured || !query) {
      targetUrl = 'https://nautichandler.com/en/';
    } else {
      targetUrl = `https://nautichandler.com/en/search?controller=search&s=${encodeURIComponent(query)}`;
    }

    console.log(`Attempting to fetch: ${targetUrl}`);

    const response = await axiosInstance.get(targetUrl, {
      headers: browserHeaders,
    });

    const html = response.data;
    const $ = cheerio.load(html);

    let products = parseProducts($);

    // Filter by query if searching
    if (query && products.length > 0) {
      products = filterProducts(products, query);
    }

    console.log(`Scraped ${products.length} products`);

    // If we found real products, return them
    if (products.length > 0) {
      return NextResponse.json({ products });
    }

    // Fall through to mock data if scraping returned no results
    console.log('No products scraped, falling back to sample data');

  } catch (error) {
    console.error('Scraping error:', error instanceof Error ? error.message : error);
    // Continue to mock data fallback
  }

  // Use mock/sample data as fallback
  if (useMock) {
    let products = [...sampleProducts];

    // Filter by query if searching
    if (query) {
      products = filterProducts(products, query);
    }

    // Limit to reasonable number
    products = products.slice(0, 20);

    console.log(`Returning ${products.length} sample products for query: "${query || 'featured'}"`);

    return NextResponse.json({ 
      products,
      // Note: remove this in production
      _source: 'sample_data'
    });
  }

  // If mock is disabled and scraping failed
  return NextResponse.json({ 
    products: [], 
    error: 'No products found and mock data disabled' 
  });
}
