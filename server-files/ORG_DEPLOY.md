# Organizations & Team Architecture — Deployment Guide

## 1. Run the database migration

```bash
psql -U your_db_user -d your_db_name -f migration_003_organizations.sql
```

## 2. Copy new files to your server

```
server-files/middleware/permissions.js  →  middleware/permissions.js
server-files/routes/organization.js     →  routes/organization.js
```

## 3. Add org routes to server.js

```javascript
const organizationRoutes = require('./routes/organization');
app.use('/api/organization', organizationRoutes);
// Public invite routes (no /api/organization prefix so token routes are clean)
app.use('/api', organizationRoutes); // handles /api/invite/:token routes
```

Wait — cleaner approach, register two prefixes:

```javascript
const organizationRoutes = require('./routes/organization');
app.use('/api/organization', organizationRoutes);   // org + invite management
app.use('/api', organizationRoutes);                // /api/invite/:token (public)
```

Actually the cleanest is to split. Use this instead:

```javascript
const organizationRoutes = require('./routes/organization');
app.use('/api/organization', organizationRoutes);
// The invite/:token routes are also in organizationRoutes,
// accessed via GET /api/invite/:token and POST /api/invite/:token/accept
app.use('/api', organizationRoutes);
```

## 4. Update routes/auth.js — login response

In your login handler, update the SELECT query and response to include role and org:

```javascript
// In the login query, join organizations:
const { rows } = await pool.query(
  `SELECT u.id, u.email, u.password_hash, u.full_name,
          u.role, u.organization_id, u.is_active,
          o.name as organization_name
   FROM users u
   LEFT JOIN organizations o ON o.id = u.organization_id
   WHERE u.email = $1`,
  [email]
);

// Update last_login:
await pool.query(
  `UPDATE users SET last_login = NOW() WHERE id = $1`,
  [user.id]
);

// In the response, include role and org:
res.json({
  token,
  user: {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    organization_id: user.organization_id,
    organization_name: user.organization_name,
  }
});
```

## 5. Update routes/auth.js — signup (auto-create solo org)

In your signup handler, after creating the user, auto-create an org:

```javascript
// After inserting new user, create a solo org and link them:
const orgName = `${full_name.split(' ')[0]} Appraisal`;
const orgResult = await pool.query(
  `INSERT INTO organizations (name, plan_type, max_appraisers, max_assistants, billing_email)
   VALUES ($1, 'solo', 1, 0, $2)
   RETURNING id`,
  [orgName, email]
);
await pool.query(
  `UPDATE users SET organization_id = $1, role = 'org_admin'
   WHERE id = $2`,
  [orgResult.rows[0].id, newUser.id]
);
```

Also update the signup response the same way as login (include role, organization_id, organization_name).

## 6. Restart the server

```bash
pm2 restart spoke
```
