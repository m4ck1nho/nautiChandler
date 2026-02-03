-- Migration 003: Update products_grouped view with explicit variant options
-- This matches the view that is live in Supabase.

DROP VIEW IF EXISTS products_grouped;

CREATE OR REPLACE VIEW products_grouped AS
SELECT
    group_id,
    MIN(id) as representative_id,
    MIN(title) as title,
    MIN(price) as min_price,
    MAX(price) as max_price,
    MIN(image) as image,
    MIN(category) as category,
    BOOL_OR(in_stock) as in_stock,
    ARRAY_AGG(DISTINCT color) FILTER (WHERE color IS NOT NULL AND color != '') as available_colors,
    ARRAY_AGG(DISTINCT size) FILTER (WHERE size IS NOT NULL AND size != '') as available_sizes,
    COUNT(*) as variant_count
FROM
    products
WHERE
    group_id IS NOT NULL
GROUP BY
    group_id;

COMMENT ON VIEW products_grouped IS
  'One row per group_id with representative_id, min/max price and available_colors/available_sizes arrays';

