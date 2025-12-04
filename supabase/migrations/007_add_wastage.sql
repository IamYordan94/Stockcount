-- Migration 007: Add wastage tracking table
-- Tracks product wastage with date, shop, item, quantity, and notes

CREATE TABLE IF NOT EXISTS wastage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wastage_shop_id ON wastage(shop_id);
CREATE INDEX IF NOT EXISTS idx_wastage_item_id ON wastage(item_id);
CREATE INDEX IF NOT EXISTS idx_wastage_date ON wastage(date);
CREATE INDEX IF NOT EXISTS idx_wastage_created_by ON wastage(created_by);

-- Enable Row Level Security
ALTER TABLE wastage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wastage
-- Admins can view all wastage
DROP POLICY IF EXISTS "Admins can view all wastage" ON wastage;
CREATE POLICY "Admins can view all wastage" ON wastage
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin'
    )
  );

-- Users can view wastage for their assigned shops
DROP POLICY IF EXISTS "Users can view their shop wastage" ON wastage;
CREATE POLICY "Users can view their shop wastage" ON wastage
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shop_assignments
      WHERE shop_assignments.user_id = auth.uid()
        AND shop_assignments.shop_id = wastage.shop_id
        AND shop_assignments.active = true
    )
  );

-- Admins can insert wastage
DROP POLICY IF EXISTS "Admins can insert wastage" ON wastage;
CREATE POLICY "Admins can insert wastage" ON wastage
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin'
    )
  );

-- Admins can update wastage
DROP POLICY IF EXISTS "Admins can update wastage" ON wastage;
CREATE POLICY "Admins can update wastage" ON wastage
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin'
    )
  );

-- Admins can delete wastage
DROP POLICY IF EXISTS "Admins can delete wastage" ON wastage;
CREATE POLICY "Admins can delete wastage" ON wastage
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin'
    )
  );

