import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { extractVariantInfo, parsePrice } from '@/lib/productGrouping';
import crypto from 'crypto';

interface SyncResponse {
  success: boolean;
  message: string;
  stats?: {
    total: number;
    inserted: number;
    updated: number;
    grouped: number;
    errors: number;
  };
  error?: string;
}

interface ScrapedProduct {
  id: string;
  title: string;
  price: string;
  image?: string;
  link?: string;
  description?: string;
}

// Generate a stable group_id from base name (MD5 hash)
function generateGroupId(baseName: string): string {
  const hash = crypto.createHash('md5').update(baseName.toLowerCase().trim()).digest('hex');
  return `grp_${hash.substring(0, 16)}`;
}

// Process a product and add grouping info
function processProduct(product: ScrapedProduct) {
  const { baseName, size, color, material } = extractVariantInfo(product.title);
  const groupId = generateGroupId(baseName);
  const priceNumeric = parsePrice(product.price);

  return {
    id: product.id,
    title: product.title,
    price: product.price,
    price_numeric: priceNumeric || null,
    image: product.image || null,
    link: product.link || null,
    description: product.description || null,
    group_id: groupId,
    base_name: baseName,
    size: size || null,
    color: color || null,
    material: material || null,
    source: 'nautichandler',
    in_stock: true,
    updated_at: new Date().toISOString(),
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<SyncResponse>> {
  try {
    const supabase = getSupabase();
    
    if (!supabase) {
      return NextResponse.json({
        success: false,
        message: 'Supabase not configured',
        error: 'Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables',
      }, { status: 500 });
    }

    // Get products from request body or fetch from scraper
    const body = await request.json().catch(() => ({}));
    let products: ScrapedProduct[] = body.products || [];
    const useDbGrouping = body.useDbGrouping === true; // Option to use SQL functions

    // If no products provided, fetch from the main products API (scraper)
    if (products.length === 0) {
      const baseUrl = request.nextUrl.origin;
      console.log('Fetching products from scraper...');
      
      // Fetch multiple pages for a fuller sync
      const maxPages = body.maxPages || 3;
      for (let page = 1; page <= maxPages; page++) {
        const response = await fetch(`${baseUrl}/api/products?featured=true&page=${page}`);
        const data = await response.json();
        
        if (data.products && data.products.length > 0) {
          products = [...products, ...data.products];
          console.log(`Fetched page ${page}: ${data.products.length} products`);
          
          if (!data.hasMore) break;
        } else {
          break;
        }
      }
    }

    if (products.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No products to sync',
      }, { status: 400 });
    }

    console.log(`Processing ${products.length} products...`);

    // Process all products with grouping info (JavaScript-side)
    const processedProducts = products.map(processProduct);

    // Upsert products into Supabase in batches
    const batchSize = 100;
    let totalInserted = 0;
    let totalErrors = 0;

    for (let i = 0; i < processedProducts.length; i += batchSize) {
      const batch = processedProducts.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('products')
        .upsert(batch, {
          onConflict: 'id',
          ignoreDuplicates: false,
        })
        .select('id');

      if (error) {
        console.error(`Batch ${i / batchSize + 1} error:`, error);
        totalErrors += batch.length;
      } else {
        totalInserted += data?.length || batch.length;
      }
    }

    // Optionally trigger SQL-based grouping for any products missing group_id
    if (useDbGrouping) {
      console.log('Running SQL-based grouping...');
      const { error: groupError } = await supabase.rpc('populate_group_ids').catch(() => ({
        error: null // Function might not exist, that's OK
      }));
      
      if (groupError) {
        console.log('SQL grouping function not available, using JS grouping');
      }
    }

    // Calculate stats
    const uniqueGroups = new Set(processedProducts.map(p => p.group_id));
    
    return NextResponse.json({
      success: true,
      message: `Successfully synced ${products.length} products into ${uniqueGroups.size} groups`,
      stats: {
        total: products.length,
        inserted: totalInserted,
        updated: 0,
        grouped: uniqueGroups.size,
        errors: totalErrors,
      },
    });

  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({
      success: false,
      message: 'Sync failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// GET endpoint to run grouping on existing products
export async function GET(request: NextRequest): Promise<NextResponse<SyncResponse>> {
  try {
    const supabase = getSupabase();
    
    if (!supabase) {
      return NextResponse.json({
        success: false,
        message: 'Supabase not configured',
        error: 'Missing environment variables',
      }, { status: 500 });
    }

    // Fetch all products that need grouping
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .or('group_id.is.null,base_name.is.null');

    if (fetchError) {
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch products',
        error: fetchError.message,
      }, { status: 500 });
    }

    if (!products || products.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All products already have group_id assigned',
        stats: { total: 0, inserted: 0, updated: 0, grouped: 0, errors: 0 },
      });
    }

    // Process and update each product
    let updated = 0;
    let errors = 0;

    for (const product of products) {
      const { baseName, size, color, material } = extractVariantInfo(product.title);
      const groupId = generateGroupId(baseName);
      const priceNumeric = parsePrice(product.price);

      const { error: updateError } = await supabase
        .from('products')
        .update({
          group_id: groupId,
          base_name: baseName,
          size: size || product.size,
          color: color || product.color,
          material: material || product.material,
          price_numeric: priceNumeric || product.price_numeric,
        })
        .eq('id', product.id);

      if (updateError) {
        console.error(`Failed to update product ${product.id}:`, updateError);
        errors++;
      } else {
        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updated} products with group_id`,
      stats: {
        total: products.length,
        inserted: 0,
        updated,
        grouped: updated,
        errors,
      },
    });

  } catch (error) {
    console.error('Grouping error:', error);
    return NextResponse.json({
      success: false,
      message: 'Grouping failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
