/**
 * Robust grouping script to "force merge" product groups by normalized title.
 *
 * Usage:
 *   1. Put NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env
 *   2. Run with:  npx ts-node scripts/fix_groups.ts
 *
 * Strategy:
 *   - Fetch ALL products.
 *   - Build a canonical name by:
 *       - Lowercasing
 *       - Removing common color words (e.g. "black", "yellow", "grey", etc.)
 *       - Removing common size tokens (16mm, 20mm, S, M, L, XL, 3m, 10x50mm, AWG, etc.)
 *       - Stripping extra punctuation and collapsing spaces
 *   - Group products by canonical name.
 *   - For each canonical group:
 *       - If any product already has a group_id, use the first one as the master.
 *       - Otherwise, generate a stable group_id from the canonical name.
 *       - Update all products in the group to share the master group_id.
 */

import 'dotenv/config';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const COLOR_WORDS = [
  'black',
  'white',
  'grey',
  'gray',
  'red',
  'blue',
  'green',
  'yellow',
  'orange',
  'brown',
  'beige',
  'cream',
  'silver',
  'gold',
  'navy',
  'pink',
  'purple',
];

const SIZE_PATTERNS: RegExp[] = [
  /\b\d+(\.\d+)?\s*(mm|cm|m)\b/gi,             // 16mm, 20 mm, 1.5 m
  /\b\d+(\.\d+)?\s*(awg)\b/gi,                 // 16 awg, 2awg
  /\b(XXL|XL|L|M|S|XS|XXS)\b/gi,               // clothing-like sizes
  /\b\d+\/\d+\s*awg\b/gi,                      // 16/2 awg
  /\b\d+(\.\d+)?\s*(x|×)\s*\d+(\.\d+)?\s*mm\b/gi, // 10x50mm
  /\b\d+(\.\d+)?\s*(A|V|W)\b/gi,               // 10A, 12V, 50W
];

function buildCanonicalName(title: string): string {
  let name = title.toLowerCase();

  // Remove color words
  for (const color of COLOR_WORDS) {
    const regex = new RegExp(`\\b${color}\\b`, 'gi');
    name = name.replace(regex, ' ');
  }

  // Remove common size/measurement tokens
  for (const pattern of SIZE_PATTERNS) {
    name = name.replace(pattern, ' ');
  }

  // Remove standalone numbers that are likely sizes/lengths
  name = name.replace(/\b\d+(\.\d+)?\b/g, ' ');

  // Remove extra punctuation that doesn't affect identity
  name = name.replace(/[-_,()]/g, ' ');

  // Collapse multiple spaces and trim
  name = name.replace(/\s+/g, ' ').trim();

  return name;
}

function generateGroupIdFromCanonical(canonical: string): string {
  const hash = crypto.createHash('md5').update(canonical).digest('hex');
  return `grp_${hash.substring(0, 16)}`;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.',
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey);

  console.log('Fetching all products...');

  const { data: products, error } = await supabase
    .from('products')
    .select('id, title, group_id');

  if (error) {
    console.error('Error fetching products:', error.message);
    process.exit(1);
  }

  if (!products || products.length === 0) {
    console.log('No products found.');
    return;
  }

  console.log(`Fetched ${products.length} products. Building canonical groups...`);

  // Group by canonical name
  const groups = new Map<string, { id: string; title: string; group_id: string | null }[]>();

  for (const p of products as any[]) {
    const canonical = buildCanonicalName(p.title);
    if (!canonical) continue; // skip completely empty canonical names

    if (!groups.has(canonical)) {
      groups.set(canonical, []);
    }
    groups.get(canonical)!.push({ id: p.id, title: p.title, group_id: p.group_id || null });
  }

  let updatedCount = 0;

  for (const [canonical, variants] of groups) {
    if (variants.length < 2) continue; // nothing to merge

    // Determine master group_id
    const existingGroupIds = Array.from(
      new Set(variants.map((v) => v.group_id).filter((g): g is string => !!g)),
    );

    const masterGroupId =
      existingGroupIds.length > 0 ? existingGroupIds[0] : generateGroupIdFromCanonical(canonical);

    // Identify products that need updating
    const idsToUpdate = variants
      .filter((v) => v.group_id !== masterGroupId)
      .map((v) => v.id);

    if (idsToUpdate.length === 0) continue;

    console.log(
      `Canonical "${canonical}" → master group_id ${masterGroupId} (updating ${idsToUpdate.length} products)`,
    );

    const { error: updateError } = await supabase
      .from('products')
      .update({ group_id: masterGroupId })
      .in('id', idsToUpdate);

    if (updateError) {
      console.error('Failed to update group_ids for canonical', canonical, updateError.message);
    } else {
      updatedCount += idsToUpdate.length;
    }
  }

  console.log(`Done. Updated group_id for ${updatedCount} products.`);
}

main().catch((err) => {
  console.error('Unexpected error in fix_groups script:', err);
  process.exit(1);
});

