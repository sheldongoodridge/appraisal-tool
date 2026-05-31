-- Migration 004: Workfile model
-- Adds workflow_status, billing_status, file numbers, report_data to inspections.
-- Keeps existing 'status' column intact for backwards compatibility.
-- Creates file_number_sequences table for per-user appraiser file numbering.

-- ─── 1. Add new columns to inspections ───────────────────────────────────────

ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS workflow_status TEXT DEFAULT 'ordered',
  ADD COLUMN IF NOT EXISTS billing_status  TEXT DEFAULT 'not_invoiced',
  ADD COLUMN IF NOT EXISTS spoke_file_number      TEXT,
  ADD COLUMN IF NOT EXISTS appraiser_file_number  TEXT,
  ADD COLUMN IF NOT EXISTS order_reference        TEXT,
  ADD COLUMN IF NOT EXISTS report_data JSONB DEFAULT '{}';

-- ─── 2. CHECK constraints for workflow_status ─────────────────────────────────

ALTER TABLE inspections
  DROP CONSTRAINT IF EXISTS chk_workflow_status;

ALTER TABLE inspections
  ADD CONSTRAINT chk_workflow_status CHECK (
    workflow_status IN (
      'ordered',
      'attempting_contact',
      'left_message',
      'awaiting_appointment',
      'appointment_scheduled',
      'inspection_complete',
      'additional_info_required',
      'reinspection_required',
      'drafting',
      'in_review',
      'revision_required',
      'revision_complete',
      'complete',
      'delivered',
      'awaiting_payment',
      'closed'
    )
  );

-- ─── 3. CHECK constraint for billing_status ──────────────────────────────────

ALTER TABLE inspections
  DROP CONSTRAINT IF EXISTS chk_billing_status;

ALTER TABLE inspections
  ADD CONSTRAINT chk_billing_status CHECK (
    billing_status IN (
      'not_invoiced',
      'invoiced',
      'paid',
      'write_off'
    )
  );

-- ─── 4. Migrate existing rows: copy 'draft' status → workflow_status ─────────
-- Existing rows that have status='draft' become workflow_status='ordered'.
-- All other existing rows also get 'ordered' as the safe default.
-- (The status column is left untouched for backwards compatibility.)

UPDATE inspections
SET workflow_status = 'ordered'
WHERE workflow_status IS NULL OR workflow_status = '';

-- ─── 5. File number sequences table ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS file_number_sequences (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER REFERENCES users(id) ON DELETE CASCADE,
  prefix         TEXT    NOT NULL DEFAULT '',
  current_number INTEGER NOT NULL DEFAULT 1000,
  year_format    TEXT    NOT NULL DEFAULT 'YY',
  separator      TEXT    NOT NULL DEFAULT '-',
  suffix         TEXT    NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

-- ─── 6. Platform-wide spoke file number sequence ─────────────────────────────
-- nextval() gives each new workfile a unique 6-digit sequential number.
-- Starting at 100000 so spoke file numbers always show 6 digits (SPK-20260601-100001).

CREATE SEQUENCE IF NOT EXISTS spoke_file_number_seq
  START WITH 100000
  INCREMENT BY 1
  NO CYCLE;

-- ─── 7. Indexes ──────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_inspections_workflow_status
  ON inspections(workflow_status);

CREATE INDEX IF NOT EXISTS idx_inspections_billing_status
  ON inspections(billing_status);

CREATE INDEX IF NOT EXISTS idx_inspections_spoke_file_number
  ON inspections(spoke_file_number);

CREATE INDEX IF NOT EXISTS idx_file_number_sequences_user_id
  ON file_number_sequences(user_id);
