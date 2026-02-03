import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

export interface Category {
  id: string;
  name: string;
  link: string;
}

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const axiosInstance = axios.create({
  httpsAgent,
  timeout: 15000,
});

const browserHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'max-age=0',
  'Connection': 'keep-alive',
};

// Extract category ID from URL
function extractCategoryId(url: string): string {
  const match = url.match(/\/(\d+)-/);
  if (match) {
    return match[1];
  }
  const slugMatch = url.match(/\/en\/(.+?)(?:\?|$)/);
  return slugMatch ? slugMatch[1] : url;
}

// Clean category name
function cleanCategoryName(name: string): string {
  return name
    .replace(/\s+/g, ' ')
    .trim();
}

// Fallback categories
const fallbackCategories: Category[] = [
  { id: 'featured', name: 'All Products', link: '/en/' },
  { id: 'anchoring', name: 'Anchoring', link: '/en/100800-anchorage' },
  { id: 'safety', name: 'Safety', link: '/en/101050-safety' },
  { id: 'maintenance', name: 'Maintenance', link: '/en/101000-maintenance' },
  { id: 'electrics', name: 'Electrics', link: '/en/100950-electrics' },
  { id: 'ropes', name: 'Ropes', link: '/en/101100-ropes' },
  { id: 'paints', name: 'Paints', link: '/en/101200-paints' },
];

export async function GET(): Promise<NextResponse> {
  try {
    console.log('Fetching categories from nautichandler.com...');
    
    const response = await axiosInstance.get('https://nautichandler.com/en/', {
      headers: browserHeaders,
    });

    const html = response.data;
    const $ = cheerio.load(html);
    
    const categories: Category[] = [
      { id: 'featured', name: 'All Products', link: '/en/' },
    ];

    // Primary target: .sf-menu > li > a (SuperFish menu)
    const primarySelectors = [
      '.sf-menu > li > a',
      '#_desktop_top_menu .sf-menu > li > a',
      'ul.sf-menu > li > a',
    ];

    let found = false;

    for (const selector of primarySelectors) {
      const navItems = $(selector);
      
      if (navItems.length > 0) {
        console.log(`Found ${navItems.length} items with selector: ${selector}`);
        
        navItems.each((_, element) => {
          const $el = $(element);
          const name = $el.text().trim();
          const link = $el.attr('href') || '';
          
          // Filter valid category links
          if (
            name &&
            link &&
            name.length > 1 &&
            name.length < 50 &&
            !name.toLowerCase().includes('home') &&
            !name.toLowerCase().includes('contact') &&
            !name.toLowerCase().includes('login') &&
            link.includes('/en/')
          ) {
            const id = extractCategoryId(link) || name.toLowerCase().replace(/\s+/g, '-');
            
            if (!categories.find(c => c.id === id)) {
              categories.push({
                id,
                name: cleanCategoryName(name),
                link: link.startsWith('http') ? link : `https://nautichandler.com${link}`,
              });
              found = true;
            }
          }
        });

        if (found) break;
      }
    }

    // Fallback: category blocks
    if (!found || categories.length < 5) {
      console.log('Trying category blocks...');
      
      const fallbackSelectors = [
        '#left-column .category-top-menu a',
        '.block-categories a',
        '[data-depth="0"] > a',
      ];

      for (const selector of fallbackSelectors) {
        $(selector).each((_, element) => {
          const $el = $(element);
          const name = $el.text().trim();
          const link = $el.attr('href') || '';
          
          if (
            name &&
            link &&
            link.match(/\/en\/\d+-/) &&
            name.length > 1 &&
            name.length < 50 &&
            !categories.find(c => c.name.toLowerCase() === name.toLowerCase())
          ) {
            const id = extractCategoryId(link);
            
            categories.push({
              id,
              name: cleanCategoryName(name),
              link: link.startsWith('http') ? link : `https://nautichandler.com${link}`,
            });
          }
        });

        if (categories.length > 6) break;
      }
    }

    console.log(`Found ${categories.length} categories`);

    if (categories.length < 3) {
      return NextResponse.json({ 
        categories: fallbackCategories,
        source: 'fallback'
      });
    }

    // Sort alphabetically (keep "All Products" first)
    const [allProducts, ...rest] = categories;
    const sorted = rest.slice(0, 15).sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ 
      categories: [allProducts, ...sorted],
      source: 'live',
      count: categories.length
    });

  } catch (error) {
    console.error('Category scraping error:', error instanceof Error ? error.message : error);
    
    return NextResponse.json({ 
      categories: fallbackCategories,
      source: 'fallback',
      error: 'Failed to scrape categories'
    });
  }
}
