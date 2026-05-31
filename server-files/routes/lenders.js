const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

const n = v => (v === '' || v === undefined) ? null : v;

// GET /api/lenders — list all lenders for authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM lenders WHERE user_id = $1 ORDER BY company_name ASC`,
      [req.user.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/lenders error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/lenders — create a new lender
router.post('/', auth, async (req, res) => {
  const { company_name, address, city, province, postal_code, contact_name, email, phone } = req.body;
  if (!company_name) return res.status(400).json({ error: 'company_name is required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO lenders
         (user_id, company_name, address, city, province, postal_code, contact_name, email, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [req.user.userId, company_name, n(address), n(city), n(province), n(postal_code), n(contact_name), n(email), n(phone)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/lenders error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/lenders/:id — update a lender
router.put('/:id', auth, async (req, res) => {
  const { company_name, address, city, province, postal_code, contact_name, email, phone } = req.body;
  if (!company_name) return res.status(400).json({ error: 'company_name is required' });
  try {
    const { rows } = await pool.query(
      `UPDATE lenders
       SET company_name = $1, address = $2, city = $3, province = $4,
           postal_code = $5, contact_name = $6, email = $7, phone = $8
       WHERE id = $9 AND user_id = $10
       RETURNING *`,
      [company_name, n(address), n(city), n(province), n(postal_code), n(contact_name), n(email), n(phone), req.params.id, req.user.userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Lender not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /api/lenders/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/lenders/:id — remove a lender
router.delete('/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM lenders WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Lender not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE /api/lenders/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
