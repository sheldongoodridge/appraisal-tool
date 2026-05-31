# Workfile Model — Deployment Guide (Migration 004)

## 1. Run the database migration

```bash
psql -U your_db_user -d your_db_name -f migration_004_workfiles.sql
```

This adds 6 columns to `inspections`, the CHECK constraints, the
`file_number_sequences` table, and the `spoke_file_number_seq` postgres sequence.

---

## 2. Copy the route file to your server

Copy `routes/workfiles.js` to your backend's `routes/` directory.

---

## 3. Update server.js

### 3a. Import the workfile router near the top with your other requires:

```javascript
const { router: workfileRoutes, generateSpokeFileNumber, generateAppraiserFileNumber } = require('./routes/workfiles');
```

### 3b. Register the routes (add alongside your other app.use calls):

```javascript
// Settings endpoint: GET/POST /api/workfiles/settings
app.use('/api/workfiles', workfileRoutes);

// Inspection PATCH endpoints: /api/inspections/:id/status|billing|file-numbers
app.use('/api/inspections', workfileRoutes);
```

> Note: the second mount adds PATCH sub-routes on top of your existing
> inspection routes. Express matches by method+path so there's no conflict
> with the existing GET/PUT/DELETE inspection routes.

### 3c. Auto-generate file numbers on workfile creation

In the existing `POST /api/inspections` handler, after the INSERT, add the
file number generation and a follow-up UPDATE. The pattern looks like this:

```javascript
// Inside POST /api/inspections, after INSERT returns the new row:
const newId = created.id;

// Generate both file numbers
const spokeNum = await generateSpokeFileNumber();
const appraiserNum = await generateAppraiserFileNumber(req.user.userId);
// appraiserNum is null if the user hasn't configured a sequence yet — that's fine.

await pool.query(
  `UPDATE inspections
     SET spoke_file_number     = $1,
         appraiser_file_number = COALESCE($2, appraiser_file_number)
   WHERE id = $3`,
  [spokeNum, appraiserNum, newId]
);

// Return the full row (re-fetch or merge into your existing response)
```

---

## 4. Restart the server

```bash
pm2 restart spoke
```

---

## New API endpoints

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/api/workfiles/settings` | — | Get user's file number sequence |
| POST | `/api/workfiles/settings` | `{ prefix, current_number, year_format, separator, suffix }` | Save sequence settings |
| PATCH | `/api/inspections/:id/status` | `{ workflow_status }` | Update workflow status |
| PATCH | `/api/inspections/:id/billing` | `{ billing_status }` | Update billing status |
| PATCH | `/api/inspections/:id/file-numbers` | `{ appraiser_file_number, order_reference }` | Edit file numbers |

### File number sequence settings fields

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `prefix` | string | `""` | Optional leading text |
| `current_number` | integer | `2517` | Next number to use (auto-increments) |
| `year_format` | `"YY"` or `"YYYY"` | `"YY"` | Year portion format |
| `separator` | string | `"-"` | Between number and year |
| `suffix` | string | `"GD"` | Appraiser initials etc. |

**Example output:** `prefix=""`, `current_number=2517`, `separator="-"`,
`year_format="YY"`, `suffix="GD"` → **`2517-26GD`**
