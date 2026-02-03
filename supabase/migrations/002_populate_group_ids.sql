-- ============================================================
-- Migration: Populate group_id for existing products
-- This script groups products with similar names together
-- Run this AFTER inserting products into the table
-- ============================================================

-- Step 1: Create a function to extract base name from title
-- This removes common variant suffixes (sizes, colors, dimensions)
CREATE OR REPLACE FUNCTION extract_base_name(title TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  result := title;
  
  -- Remove common size patterns
  result := regexp_replace(result, '\s+\d+(/\d+)?awg\b', '', 'gi');  -- Wire gauges: 16/2awg
  result := regexp_replace(result, '\s+\d+(\.\d+)?(mm|cm|m|inch|in|ft)\b', '', 'gi');  -- Dimensions
  result := regexp_replace(result, '\s+\d+(\.\d+)?(kg|g|L|ml|liter)\b', '', 'gi');  -- Weight/Volume
  result := regexp_replace(result, '\s+(XXS|XS|S|M|L|XL|XXL|XXXL|2XL|3XL)\b', '', 'gi');  -- Letter sizes
  result := regexp_replace(result, '\s+\d+x\d+\s*(cm|mm|m)?\b', '', 'gi');  -- Dimensions like 50x100
  
  -- Remove common color words at the end
  result := regexp_replace(result, '\s+(black|white|red|blue|green|yellow|orange|purple|pink|grey|gray|brown|navy|silver|gold|chrome)\s*$', '', 'gi');
  
  -- Remove trailing numbers that might be model variants
  result := regexp_replace(result, '\s+\d+\s*$', '', 'g');
  
  -- Clean up extra whitespace
  result := regexp_replace(result, '\s+', ' ', 'g');
  result := trim(result);
  
  -- If result is too short, use first 4 words of original
  IF length(result) < 10 THEN
    result := (
      SELECT string_agg(word, ' ')
      FROM (
        SELECT unnest(string_to_array(trim(title), ' ')) as word
        LIMIT 4
      ) words
    );
  END IF;
  
  RETURN lower(result);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 2: Create a function to generate group_id from base name
CREATE OR REPLACE FUNCTION generate_group_id(base_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN 'grp_' || encode(digest(lower(trim(base_name)), 'md5'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 3: Create a function to extract size from title
CREATE OR REPLACE FUNCTION extract_size(title TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  -- Try to match wire gauge (e.g., 16/2awg)
  result := (regexp_match(title, '(\d+/\d+awg)', 'i'))[1];
  IF result IS NOT NULL THEN RETURN result; END IF;
  
  -- Try to match dimensions (e.g., 50mm, 10x20cm)
  result := (regexp_match(title, '(\d+(\.\d+)?x?\d*(\.\d+)?(mm|cm|m|inch|in|ft))', 'i'))[1];
  IF result IS NOT NULL THEN RETURN result; END IF;
  
  -- Try to match weight/volume
  result := (regexp_match(title, '(\d+(\.\d+)?(kg|g|L|ml|liter))', 'i'))[1];
  IF result IS NOT NULL THEN RETURN result; END IF;
  
  -- Try to match letter sizes
  result := (regexp_match(title, '\b(XXS|XS|S|M|L|XL|XXL|XXXL|2XL|3XL)\b', 'i'))[1];
  IF result IS NOT NULL THEN RETURN upper(result); END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 4: Create a function to extract color from title
CREATE OR REPLACE FUNCTION extract_color(title TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  result := (regexp_match(title, '\b(black|white|red|blue|green|yellow|orange|purple|pink|grey|gray|brown|navy|beige|silver|gold|chrome|stainless|brass)\b', 'i'))[1];
  IF result IS NOT NULL THEN 
    RETURN initcap(result); 
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 5: Create a function to parse price to numeric
CREATE OR REPLACE FUNCTION parse_price(price_str TEXT)
RETURNS DECIMAL AS $$
DECLARE
  result DECIMAL;
  cleaned TEXT;
BEGIN
  -- Remove currency symbols and clean up
  cleaned := regexp_replace(price_str, '[€$£¥₹\s]', '', 'g');
  -- Handle European format (1.234,56 -> 1234.56)
  IF cleaned ~ ',\d{2}$' THEN
    cleaned := regexp_replace(cleaned, '\.', '', 'g');
    cleaned := regexp_replace(cleaned, ',', '.', 'g');
  ELSE
    cleaned := regexp_replace(cleaned, ',', '', 'g');
  END IF;
  
  result := cleaned::DECIMAL;
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- Step 6: UPDATE all products with group_id and extracted data
-- Run this to populate the grouping columns
-- ============================================================
UPDATE products SET
  base_name = extract_base_name(title),
  group_id = generate_group_id(extract_base_name(title)),
  size = COALESCE(size, extract_size(title)),
  color = COALESCE(color, extract_color(title)),
  price_numeric = COALESCE(price_numeric, parse_price(price))
WHERE group_id IS NULL OR base_name IS NULL;

-- ============================================================
-- Verify the grouping results
-- ============================================================
-- Run this query to see groups with multiple variants:
-- SELECT 
--   group_id,
--   base_name,
--   COUNT(*) as variant_count,
--   array_agg(title) as titles,
--   MIN(price_numeric) as min_price,
--   MAX(price_numeric) as max_price
-- FROM products
-- WHERE group_id IS NOT NULL
-- GROUP BY group_id, base_name
-- HAVING COUNT(*) > 1
-- ORDER BY variant_count DESC;
