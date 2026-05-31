-- Migration: Property-Inspection Linking
-- Run on your DigitalOcean PostgreSQL database
-- Written for existing properties table with id SERIAL INTEGER
-- All operations are idempotent — safe to run more than once

-- 1. normalize_address helper function (used by upsert in server.js)
CREATE OR REPLACE FUNCTION normalize_address(addr TEXT)
RETURNS TEXT AS $$
  SELECT LOWER(TRIM(REGEXP_REPLACE(addr, '\s+', ' ', 'g')));
$$ LANGUAGE SQL IMMUTABLE STRICT;

-- 2. Add only the columns that are truly missing from the existing properties table
--    Existing columns are left untouched: sqft, bathrooms, normalized_address, etc.
ALTER TABLE properties ADD COLUMN IF NOT EXISTS design_style TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS construction TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS foundation   TEXT;

-- Per-floor sqft in addition to the existing single sqft column.
-- CRAL-imported data stays in sqft; Spoke inspections populate the floor breakdown.
ALTER TABLE properties ADD COLUMN IF NOT EXISTS sqft_main     INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS sqft_second   INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS sqft_third    INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS sqft_basement INTEGER;

-- Full/partial split in addition to the existing single bathrooms column.
ALTER TABLE properties ADD COLUMN IF NOT EXISTS full_bathrooms    INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS partial_bathrooms INTEGER;

-- 3. Add property_id to inspections as INTEGER FK (matches SERIAL id on properties)
ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS property_id INTEGER REFERENCES properties(id);

CREATE INDEX IF NOT EXISTS idx_inspections_property_id
  ON inspections(property_id);

-- 4. Trigger to auto-update updated_at on properties
--    (updated_at column already exists; this just ensures the trigger is wired up)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS properties_updated_at ON properties;
CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
