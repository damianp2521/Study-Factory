-- Add columns to pending_registrations with correct types
-- selection_1, 2, 3 should be UUIDs to match beverage_options.id
ALTER TABLE pending_registrations 
ADD COLUMN IF NOT EXISTS seat_number INTEGER,
ADD COLUMN IF NOT EXISTS selection_1 UUID REFERENCES beverage_options(id),
ADD COLUMN IF NOT EXISTS selection_2 UUID REFERENCES beverage_options(id),
ADD COLUMN IF NOT EXISTS selection_3 UUID REFERENCES beverage_options(id),
ADD COLUMN IF NOT EXISTS memo TEXT;
