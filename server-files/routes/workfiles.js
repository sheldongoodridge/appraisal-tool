const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

const WORKFLOW_STATUSES = [
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
  'closed',
];

const BILLING_STATUSES = ['not_invoiced', 'invoiced', 'paid', 'write_off'];

// ─── File number helpers ──────────────────────────────────────────────────────

async function generateSpokeFileNumber() {
  const d = new Date();
  const yyyymmdd = d.toISOString().slice(0, 10).replace(/-/g, '');
  const { rows } = await pool.query(`SELECT nextval('spoke_file_number_seq') AS seq`);
  const seq = String(rows[0].seq).padStart(6, '0');
  return `SPK-${yyyymmdd}-${seq}`;
}

// Reads the user's sequence settings, builds their file number, increments the counter.
// Returns null if no sequence is configured yet.
async function generateAppraiserFileNumber(userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT * FROM file_number_sequences WHERE user_id = $1 FOR UPDATE`,
      [userId]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    const seq = rows[0];
    const num = String(seq.current_number).padStart(4, '0');
    const now = new Date();
    const year = seq.year_format === 'YYYY'
      ? String(now.getFullYear())
      : String(now.getFullYear()).slice(-2);
    const fileNum = `${seq.prefix}${num}${seq.separator}${year}${seq.suffix}`;

    await client.query(
      `UPDATE file_number_sequences
         SET current_number = current_number + 1,
             updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );
    await client.query('COMMIT');
    return fileNum;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── GET /api/workfiles/settings ─────────────────────────────────────────────
// Returns the user's file number sequence settings (or null if not yet configured).

router.get('/settings', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM file_number_sequences WHERE user_id = $1`,
      [req.user.userId]
    );
    res.json(rows[0] || null);
  } catch (err) {
    console.error('GET /api/workfiles/settings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/workfiles/settings ────────────────────────────────────────────
// Creates or updates the user's file number sequence settings.

router.post('/settings', auth, async (req, res) => {
  const { prefix = '', current_number, year_format = 'YY', separator = '-', suffix = '' } = req.body;

  if (current_number === undefined || current_number === null) {
    return res.status(400).json({ error: 'current_number is required' });
  }
  const num = parseInt(current_number, 10);
  if (isNaN(num) || num < 0) {
    return res.status(400).json({ error: 'current_number must be a non-negative integer' });
  }
  if (!['YY', 'YYYY'].includes(year_format)) {
    return res.status(400).json({ error: 'year_format must be YY or YYYY' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO file_number_sequences
         (user_id, prefix, current_number, year_format, separator, suffix)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE SET
         prefix         = EXCLUDED.prefix,
         current_number = EXCLUDED.current_number,
         year_format    = EXCLUDED.year_format,
         separator      = EXCLUDED.separator,
         suffix         = EXCLUDED.suffix,
         updated_at     = NOW()
       RETURNING *`,
      [req.user.userId, prefix, num, year_format, separator, suffix]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('POST /api/workfiles/settings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── PATCH /api/inspections/:id/status ───────────────────────────────────────
// Updates workflow_status. Only the owning user may update.

router.patch('/:id/status', auth, async (req, res) => {
  const { workflow_status } = req.body;
  if (!workflow_status) {
    return res.status(400).json({ error: 'workflow_status is required' });
  }
  if (!WORKFLOW_STATUSES.includes(workflow_status)) {
    return res.status(400).json({
      error: `Invalid workflow_status. Must be one of: ${WORKFLOW_STATUSES.join(', ')}`,
    });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE inspections
         SET workflow_status = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING id, workflow_status`,
      [workflow_status, req.params.id, req.user.userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Workfile not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PATCH /api/inspections/:id/status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── PATCH /api/inspections/:id/billing ──────────────────────────────────────

router.patch('/:id/billing', auth, async (req, res) => {
  const { billing_status } = req.body;
  if (!billing_status) {
    return res.status(400).json({ error: 'billing_status is required' });
  }
  if (!BILLING_STATUSES.includes(billing_status)) {
    return res.status(400).json({
      error: `Invalid billing_status. Must be one of: ${BILLING_STATUSES.join(', ')}`,
    });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE inspections
         SET billing_status = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING id, billing_status`,
      [billing_status, req.params.id, req.user.userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Workfile not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PATCH /api/inspections/:id/billing error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── PATCH /api/inspections/:id/file-numbers ─────────────────────────────────

router.patch('/:id/file-numbers', auth, async (req, res) => {
  const { appraiser_file_number, order_reference } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE inspections
         SET appraiser_file_number = COALESCE($1, appraiser_file_number),
             order_reference       = COALESCE($2, order_reference),
             updated_at            = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING id, spoke_file_number, appraiser_file_number, order_reference`,
      [
        appraiser_file_number ?? null,
        order_reference ?? null,
        req.params.id,
        req.user.userId,
      ]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Workfile not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PATCH /api/inspections/:id/file-numbers error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = { router, generateSpokeFileNumber, generateAppraiserFileNumber };
