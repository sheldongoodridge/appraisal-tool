# Directory Feature — Server Deployment

## 1. Copy lenders route file

Copy `routes/lenders.js` from this folder to your backend's `routes/` directory.

## 2. Register routes in server.js

Add these lines to `server.js` alongside the other route registrations:

```javascript
const lenderRoutes = require('./routes/lenders');
app.use('/api/lenders', lenderRoutes);
```

## 3. Add client POST and PUT routes to server.js

Find where your existing `GET /api/clients` route lives and add these two routes
in the same place (same auth middleware pattern — `authenticate` or `auth`):

```javascript
// DELETE /api/clients/:id
app.delete('/api/clients/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM clients WHERE id=$1 AND user_id=$2 RETURNING id`,
      [req.params.id, req.user.userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clients — create a new client
app.post('/api/clients', authenticate, async (req, res) => {
  const { company_name, client_code, contact_name, email, phone } = req.body;
  if (!company_name) return res.status(400).json({ error: 'company_name is required' });
  const n = v => (v === '' || v === undefined) ? null : v;
  try {
    const { rows } = await pool.query(
      `INSERT INTO clients (user_id, company_name, client_code, contact_name, email, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.userId, company_name, n(client_code), n(contact_name), n(email), n(phone)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/clients error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/clients/:id — update a client
app.put('/api/clients/:id', authenticate, async (req, res) => {
  const { company_name, client_code, contact_name, email, phone } = req.body;
  if (!company_name) return res.status(400).json({ error: 'company_name is required' });
  const n = v => (v === '' || v === undefined) ? null : v;
  try {
    const { rows } = await pool.query(
      `UPDATE clients
       SET company_name = $1, client_code = $2, contact_name = $3, email = $4, phone = $5
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [company_name, n(client_code), n(contact_name), n(email), n(phone), req.params.id, req.user.userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Client not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /api/clients/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});
```

Note: replace `authenticate` with whatever your auth middleware is called in server.js
(could be `auth`, `authenticate`, `verifyToken`, etc.).

## 4. Restart and deploy

```bash
# SSH into droplet
pm2 restart spoke

# Deploy frontend from local machine
npm run deploy
```
