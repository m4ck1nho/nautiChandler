import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

// MVP Mode: Read from local JSON instead of Supabase
// This allows the scraper output to be immediately usable

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get('q') ||
    request.nextUrl.searchParams.get('search') || '';

  try {
    const jsonPath = path.join(process.cwd(), 'public', 'products.json');
    const fileContents = await fs.readFile(jsonPath, 'utf8');
    const allProducts = JSON.parse(fileContents);

    let filtered = allProducts;

    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = allProducts.filter((p: any) =>
        (p.title && p.title.toLowerCase().includes(lowerSearch)) ||
        (p.category && p.category.toLowerCase().includes(lowerSearch))
      );
    }

    // Limit to 50 results for performance
    const limited = filtered.slice(0, 50);

    console.log(`[API] Found ${limited.length} products for "${search || 'all'}" (Source: JSON)`);
    return NextResponse.json({ products: limited });

  } catch (err) {
    console.error('[API] Error reading products.json:', err);
    // Return empty array instead of erroring out
    return NextResponse.json({ products: [] });
  }
}
