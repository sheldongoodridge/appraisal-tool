const express = require('express');
const pool = require('../config/database');

const router = express.Router();

// GET /api/invite/:token — public: fetch invitation details
router.get('/:token', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.id, i.email, i.role, i.accepted, i.expires_at,
              o.name as organization_name,
              u.full_name as invited_by_name
       FROM invitations i
       JOIN organizations o ON o.id = i.organization_id
       JOIN users u ON u.id = i.invited_by
       WHERE i.token = $1`,
      [req.params.token]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Invitation not found' });
    const invite = rows[0];

    if (invite.accepted) return res.status(400).json({ error: 'Invitation already accepted' });
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    res.json(invite);
  } catch (err) {
    console.error('GET /api/invite/:token error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/invite/:token/accept — create account from invitation
router.post('/:token/accept', async (req, res) => {
  const { full_name, password } = req.body;
  if (!full_name || !password) {
    return res.status(400).json({ error: 'full_name and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const inviteResult = await pool.query(
      `SELECT * FROM invitations WHERE token = $1`,
      [req.params.token]
    );
    if (inviteResult.rows.length === 0) return res.status(404).json({ error: 'Invitation not found' });
    const invite = inviteResult.rows[0];

    if (invite.accepted) return res.status(400).json({ error: 'Invitation already accepted' });
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    const existingUser = await pool.query(`SELECT id FROM users WHERE email = $1`, [invite.email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const bcrypt = require('bcryptjs');
    const password_hash = await bcrypt.hash(password, 12);

    const userResult = await pool.query(
      `INSERT INTO users
         (email, password_hash, full_name, role, organization_id, invited_by, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id, email, full_name, role, organization_id`,
      [invite.email, password_hash, full_name, invite.role, invite.organization_id, invite.invited_by]
    );
    const newUser = userResult.rows[0];

    await pool.query(`UPDATE invitations SET accepted = true WHERE id = $1`, [invite.id]);

    const orgResult = await pool.query(
      `SELECT name FROM organizations WHERE id = $1`,
      [invite.organization_id]
    );
    const organization_name = orgResult.rows[0]?.name;

    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: { ...newUser, organization_name },
    });
  } catch (err) {
    console.error('POST /api/invite/:token/accept error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
