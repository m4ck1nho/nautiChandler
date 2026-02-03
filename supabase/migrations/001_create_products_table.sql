-- ============================================================
-- Migration: Create products table with group_id for variants
-- Run this in Supabase SQL Editor or via CLI
-- ============================================================

-- Create the products table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,                    -- Product ID from source (e.g., scraped ID)
  title TEXT NOT NULL,                    -- Full product title
  price TEXT NOT NULL,                    -- Price as string (e.g., "€2.39")
  price_numeric DECIMAL(10, 2),           -- Numeric price for sorting/filtering
  image TEXT,                             -- Image URL
  link TEXT,                              -- Source URL
  description TEXT,                       -- Product description
  
  -- Variant grouping
  group_id TEXT,                          -- Shared ID for product variants
  base_name TEXT,                         -- Cleaned base product name (without size/color)
  
  -- Variant attributes (extracted from title)
  size TEXT,                              -- Size variant (e.g., "16/2awg", "50mm", "XL")
  color TEXT,                             -- Color variant
  material TEXT,                          -- Material variant
  
  -- Metadata
  category TEXT,                          -- Product category
  in_stock BOOLEAN DEFAULT true,          -- Stock status
  source TEXT DEFAULT 'nautichandler',    -- Data source
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_products_group_id ON products(group_id);
CREATE INDEX IF NOT EXISTS idx_products_base_name ON products(base_name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_price_numeric ON products(price_numeric);
CREATE INDEX IF NOT EXISTS idx_products_title_search ON products USING gin(to_tsvector('english', title));

-- Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access" ON products
  FOR SELECT
  USING (true);

-- Create policy to allow authenticated insert/update (for admin)
CREATE POLICY "Allow authenticated insert" ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update" ON products
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- View: Get one representative product per group with stats
-- ============================================================
CREATE OR REPLACE VIEW products_grouped AS
SELECT DISTINCT ON (COALESCE(group_id, id))
  id,
  title,
  price,
  price_numeric,
  image,
  link,
  description,
  group_id,
  base_name,
  category,
  in_stock,
  created_at,
  -- Aggregated stats for the group
  (
    SELECT COUNT(*) 
    FROM products p2 
    WHERE p2.group_id = products.group_id
  ) as variant_count,
  (
    SELECT MIN(p2.price_numeric) 
    FROM products p2 
    WHERE p2.group_id = products.group_id
  ) as min_price,
  (
    SELECT MAX(p2.price_numeric) 
    FROM products p2 
    WHERE p2.group_id = products.group_id
  ) as max_price,
  (
    SELECT array_agg(DISTINCT p2.size) 
    FROM products p2 
    WHERE p2.group_id = products.group_id AND p2.size IS NOT NULL
  ) as available_sizes,
  (
    SELECT array_agg(DISTINCT p2.color) 
    FROM products p2 
    WHERE p2.group_id = products.group_id AND p2.color IS NOT NULL
  ) as available_colors
FROM products
ORDER BY COALESCE(group_id, id), price_numeric ASC;

COMMENT ON VIEW products_grouped IS 'Returns one representative product per group with variant stats';
