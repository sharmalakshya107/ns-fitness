-- Add freeze tracking columns to members table
-- Run this SQL in your Neon DB SQL Editor

ALTER TABLE members 
ADD COLUMN IF NOT EXISTS freeze_start_date DATE,
ADD COLUMN IF NOT EXISTS freeze_end_date DATE,
ADD COLUMN IF NOT EXISTS freeze_reason TEXT;

-- Create index for faster queries on frozen members
CREATE INDEX IF NOT EXISTS idx_members_freeze_dates ON members(freeze_start_date, freeze_end_date);

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'members' 
  AND column_name IN ('freeze_start_date', 'freeze_end_date', 'freeze_reason')
ORDER BY column_name;


