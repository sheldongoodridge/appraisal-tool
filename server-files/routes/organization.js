const express = require('express');
const crypto = require('crypto');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const { requireOrgAdmin } = require('../middleware/permissions');

const router = express.Router();

// GET /api/organization — current user's org + all members
router.get('/', auth, async (req, res) => {
  try {
    const userResult = await pool.query(
      `SELECT organization_id, role FROM users WHERE id = $1`,
      [req.user.userId]
    );
    const { organization_id, role } = userResult.rows[0];

    if (!organization_id) {
      return res.status(404).json({ error: 'No organization found' });
    }

    const [orgResult, membersResult, invitesResult] = await Promise.all([
      pool.query(`SELECT * FROM organizations WHERE id = $1`, [organization_id]),
      pool.query(
        `SELECT id, full_name, email, role, is_active, last_login
         FROM users WHERE organization_id = $1 ORDER BY full_name ASC`,
        [organization_id]
      ),
      pool.query(
        `SELECT id, email, role, accepted, expires_at, created_at,
                token
         FROM invitations
         WHERE organization_id = $1 AND accepted = false
           AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY created_at DESC`,
        [organization_id]
      ),
    ]);

    res.json({
      organization: orgResult.rows[0],
      members: membersResult.rows,
      pending_invitations: invitesResult.rows,
      current_user_role: role,
    });
  } catch (err) {
    console.error('GET /api/organization error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/organization/update — update org name / billing email
router.post('/update', auth, requireOrgAdmin, async (req, res) => {
  const { name, billing_email } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  try {
    const userResult = await pool.query(
      `SELECT organization_id FROM users WHERE id = $1`,
      [req.user.userId]
    );
    const { organization_id } = userResult.rows[0];

    const { rows } = await pool.query(
      `UPDATE organizations
       SET name = $1, billing_email = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [name, billing_email || null, organization_id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('POST /api/organization/update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/organization/invite — create invitation
router.post('/invite', auth, requireOrgAdmin, async (req, res) => {
  const { email, role } = req.body;
  if (!email || !role) return res.status(400).json({ error: 'email and role are required' });
  if (!['appraiser', 'assistant'].includes(role)) {
    return res.status(400).json({ error: 'role must be appraiser or assistant' });
  }

  try {
    const userResult = await pool.query(
      `SELECT organization_id FROM users WHERE id = $1`,
      [req.user.userId]
    );
    const { organization_id } = userResult.rows[0];

    const orgResult = await pool.query(
      `SELECT plan_type, max_appraisers, max_assistants FROM organizations WHERE id = $1`,
      [organization_id]
    );
    const org = orgResult.rows[0];

    const countsResult = await pool.query(
      `SELECT role, COUNT(*) as count FROM users
       WHERE organization_id = $1 AND is_active = true
       GROUP BY role`,
      [organization_id]
    );
    const counts = {};
    countsResult.rows.forEach(r => { counts[r.role] = parseInt(r.count); });

    if (role === 'appraiser' && (counts['appraiser'] || 0) >= org.max_appraisers) {
      return res.status(400).json({ error: 'Appraiser limit reached for your plan' });
    }
    if (role === 'assistant' && (counts['assistant'] || 0) >= org.max_assistants) {
      return res.status(400).json({ error: 'Assistant limit reached for your plan' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const { rows } = await pool.query(
      `INSERT INTO invitations
         (organization_id, invited_by, email, role, token, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [organization_id, req.user.userId, email, role, token, expires_at]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/organization/invite error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
