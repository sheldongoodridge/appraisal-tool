# Server Change: User Profile Fields + API Endpoints

## 1. Database Migration

Run on the DigitalOcean droplet (psql):

```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS company          VARCHAR(255),
  ADD COLUMN IF NOT EXISTS address          TEXT,
  ADD COLUMN IF NOT EXISTS phone            VARCHAR(50),
  ADD COLUMN IF NOT EXISTS fax              VARCHAR(50),
  ADD COLUMN IF NOT EXISTS aic_designation  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS membership_number VARCHAR(100);
```

---

## 2. Update Login Response

In your auth route (routes/auth.js), wherever you build the user
object returned on login, add the new fields:

```javascript
// In the login handler, update the user object returned to client:
const user = {
  id:                row.id,
  email:             row.email,
  full_name:         row.full_name,
  role:              row.role,
  // --- ADD THESE ---
  company:           row.company           || '',
  address:           row.address           || '',
  phone:             row.phone             || '',
  fax:               row.fax               || '',
  aic_designation:   row.aic_designation   || '',
  membership_number: row.membership_number || '',
};
```

Do the same in the signup handler and the AcceptInvite handler
if they also return a user object.

---

## 3. Add Profile Endpoints

In routes/auth.js (or a new routes/profile.js if you prefer),
add two endpoints. Both require the auth middleware.

```javascript
const { authenticateToken } = require('../middleware/auth');
// (adjust import path to match your project)

// GET /api/auth/profile
// Returns the current user's full profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, full_name, role,
              company, address, phone, fax,
              aic_designation, membership_number
       FROM users WHERE id = $1`,
      [req.user.userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/auth/profile
// Updates editable profile fields; returns updated user
router.patch('/profile', authenticateToken, async (req, res) => {
  const { full_name, company, address, phone, fax, aic_designation, membership_number } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users
       SET full_name         = COALESCE($1, full_name),
           company           = COALESCE($2, company),
           address           = COALESCE($3, address),
           phone             = COALESCE($4, phone),
           fax               = COALESCE($5, fax),
           aic_designation   = COALESCE($6, aic_designation),
           membership_number = COALESCE($7, membership_number)
       WHERE id = $8
       RETURNING id, email, full_name, role,
                 company, address, phone, fax,
                 aic_designation, membership_number`,
      [full_name, company, address, phone, fax, aic_designation, membership_number, req.user.userId]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
```

If you put these in routes/auth.js, they are already mounted at /api/auth/
so the full paths become:
  GET  /api/auth/profile
  PATCH /api/auth/profile

---

## 4. Restart Server

```
pm2 restart spoke
```
