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

    const category = request.nextUrl.searchParams.get('category') || '';

    let filtered = allProducts;

    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter((p: any) =>
        (p.title && p.title.toLowerCase().includes(lowerSearch)) ||
        (p.category && p.category.toLowerCase().includes(lowerSearch))
      );
    }

    // Unified target categories mapping
    const TARGET_CATEGORIES = [
      { name: 'electronics', url: '/en/190-electronics' },
      { name: 'motor', url: '/en/100393-motor' },
      { name: 'ropes', url: '/en/100395-ropes' },
      { name: 'rope', url: '/en/100395-ropes' },
      { name: 'safety', url: '/en/100389-safety' },
      { name: 'anchors', url: '/en/100810-anchors' },
      { name: 'anchor', url: '/en/100810-anchors' },
      { name: 'anchoring', url: '/en/100810-anchors' },
      { name: 'fitting', url: '/en/100396-fitting' },
      { name: 'fittings', url: '/en/100396-fitting' },
      { name: 'plumbing', url: '/en/100713-plumbing' },
      { name: 'painting', url: '/en/100390-painting' },
      { name: 'paint', url: '/en/100390-painting' },
      { name: 'screws', url: '/en/100394-screws' },
      { name: 'tools', url: '/en/100391-tools-machines' },
      { name: 'electrics', url: '/en/100392-electricslighting' },
      { name: 'maintenance', url: '/en/100669-maintenance-cleaning-products' },
      { name: 'navigation', url: '/en/100329-navigation' },
      { name: 'clothing', url: '/en/43-personal-equipment' },
      { name: 'life-on-board', url: '/en/197-life-on-board' },
      { name: 'inflatables', url: '/en/100911-inflatablewater-toys' }
    ];

    let targetCategory = category;
    if (category) {
      const lowerCat = category.toLowerCase();
      // Logic match from route.ts
      let cleanCat = lowerCat;
      if (cleanCat.match(/^\d+-/)) {
        cleanCat = cleanCat.replace(/^\d+-/, '');
      }

      const mapped = TARGET_CATEGORIES.find(c => cleanCat.includes(c.name) || c.name.includes(cleanCat));
      if (mapped) {
        console.log(`[Unified] Mapped "${category}" -> "${mapped.name}"`);
        targetCategory = mapped.name;
      }

      // FORCE CANONICAL NAMES for known issues
      if (targetCategory.toLowerCase().includes('anchor')) targetCategory = 'anchors';
      if (targetCategory.toLowerCase().includes('fitting')) targetCategory = 'fitting';
      if (targetCategory.toLowerCase().includes('inflatable')) targetCategory = 'inflatables';
      if (targetCategory.toLowerCase().includes('life')) targetCategory = 'life-on-board';

      const targetSlug = targetCategory.toLowerCase();

      filtered = filtered.filter((p: any) => {
        if (!p.category) return false;
        const pCat = p.category.toLowerCase();

        // Robust partial matching
        return pCat === targetSlug || pCat.includes(targetSlug) || targetSlug.includes(pCat);
      });
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
