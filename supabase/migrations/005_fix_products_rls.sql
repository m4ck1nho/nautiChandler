-- ============================================================
-- Migration 005: Fix products RLS for public read (Detail Page)
-- Ensures anon/public users can read from products table.
-- ============================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Drop existing read policy if present (avoid duplicate)
DROP POLICY IF EXISTS "Allow public read access" ON products;
DROP POLICY IF EXISTS "Public Read Products" ON products;

-- Allow public read access to the raw table (needed for Detail Page)
CREATE POLICY "Public Read Products" ON products FOR SELECT USING (true);
