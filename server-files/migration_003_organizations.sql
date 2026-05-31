-- Migration 003: Organizations & Team Architecture

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  plan_type       TEXT NOT NULL
                  CHECK (plan_type IN
                    ('solo', 'solo_plus', 'team')),
  status          TEXT DEFAULT 'active'
                  CHECK (status IN
                    ('active', 'suspended', 'cancelled')),
  max_appraisers  INTEGER DEFAULT 1,
  max_assistants  INTEGER DEFAULT 0,
  billing_email   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Update users table: alter existing role column to add CHECK constraint
ALTER TABLE users
  ALTER COLUMN role TYPE TEXT,
  ADD CONSTRAINT users_role_check
    CHECK (role IN (
      'platform_admin', 'org_admin',
      'appraiser', 'assistant'
    ));

-- Add missing columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS organization_id
    INTEGER REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS is_active
    BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS invited_by
    INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS last_login
    TIMESTAMPTZ;

-- Invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id              SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id),
  invited_by      INTEGER REFERENCES users(id),
  email           TEXT NOT NULL,
  role            TEXT NOT NULL
                  CHECK (role IN ('appraiser', 'assistant')),
  token           TEXT UNIQUE NOT NULL,
  accepted        BOOLEAN DEFAULT false,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Sheldon's organization
INSERT INTO organizations
  (name, plan_type, max_appraisers, max_assistants,
   billing_email)
VALUES
  ('Independent Appraisal Corp.', 'solo_plus', 1, 1,
   'sgoodridge@independentappraisal.net')
ON CONFLICT DO NOTHING;

-- Link Sheldon to his organization and set as org_admin
UPDATE users
SET organization_id = (
  SELECT id FROM organizations
  WHERE name = 'Independent Appraisal Corp.'
),
role = 'org_admin'
WHERE email = 'sheldon@spokeappraisal.com';
