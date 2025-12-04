-- Migration 008: Add Stock Count Periods System
-- This allows admins to create periods, assign users, and assign shops per period

-- Create stock_count_periods table
CREATE TABLE IF NOT EXISTS stock_count_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create period_participants table (users assigned to a period)
CREATE TABLE IF NOT EXISTS period_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES stock_count_periods(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES auth.users(id),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(period_id, user_id)
);

-- Modify shop_assignments to include period_id
ALTER TABLE shop_assignments 
ADD COLUMN IF NOT EXISTS period_id UUID REFERENCES stock_count_periods(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_periods_status ON stock_count_periods(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_period_participants_period ON period_participants(period_id);
CREATE INDEX IF NOT EXISTS idx_period_participants_user ON period_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_assignments_period ON shop_assignments(period_id);

-- Enable Row Level Security
ALTER TABLE stock_count_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stock_count_periods
DROP POLICY IF EXISTS "Admins can manage all periods" ON stock_count_periods;
CREATE POLICY "Admins can manage all periods" ON stock_count_periods
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin'
    )
  );

-- Users can view periods they're assigned to
DROP POLICY IF EXISTS "Users can view their periods" ON stock_count_periods;
CREATE POLICY "Users can view their periods" ON stock_count_periods
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM period_participants
      WHERE period_participants.period_id = stock_count_periods.id
        AND period_participants.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for period_participants
DROP POLICY IF EXISTS "Admins can manage all participants" ON period_participants;
CREATE POLICY "Admins can manage all participants" ON period_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin'
    )
  );

-- Users can view their own participant records
DROP POLICY IF EXISTS "Users can view their own participants" ON period_participants;
CREATE POLICY "Users can view their own participants" ON period_participants
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin'
    )
  );

-- Update shop_assignments to work with periods
-- Keep existing RLS policies, but add period filtering logic in application code

