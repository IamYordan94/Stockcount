-- Migration 006: Add main_category column to items table
-- Main category distinguishes between floor items and catering items

ALTER TABLE items 
ADD COLUMN IF NOT EXISTS main_category TEXT DEFAULT 'floor' 
CHECK (main_category IN ('floor', 'catering'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_items_main_category ON items(main_category);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);

-- Update existing items to have default main_category
UPDATE items SET main_category = 'floor' WHERE main_category IS NULL;

