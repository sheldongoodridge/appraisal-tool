# Properties Feature — server.js Additions

All snippets go into server.js. Order matters — add them top-to-bottom.

Corrections from original draft:
- Column is `normalized_address` (not address_normalized) throughout
- ON CONFLICT uses `(normalized_address, created_by)` — the actual unique index
- upsertProperty now accepts userId and passes it as created_by
- sqft and bathrooms existing columns are preserved; floor-level and split columns are additive
- property_id is INTEGER throughout (not UUID)

---

## 1. Helper function (add ONCE, near top of file before routes)

```javascript
// ─── Property upsert helper ───────────────────────────────────────────────────
async function upsertProperty(address, property, roomAllocation, userId) {
  if (!address || !address.trim()) return null;

  const normalized = address.toLowerCase().trim().replace(/\s+/g, ' ');
  const r  = roomAllocation || {};
  const fl = (level) => r[level] || {};
  const toInt = (v) => (v !== '' && v != null && !isNaN(parseInt(v))) ? parseInt(v) : null;

  const bedrooms    = ['main','second','third','basement'].reduce((s,l) => s + (fl(l).bedrooms || 0), 0);
  const fullBath    = ['main','second','third','basement'].reduce((s,l) => s + (fl(l).fullBath  || 0), 0);
  const partialBath = ['main','second','third','basement'].reduce((s,l) => s + (fl(l).partBath  || 0), 0);

  const { rows } = await pool.query(
    `INSERT INTO properties
       (address, normalized_address, created_by,
        year_built, property_type, design_style, construction, foundation,
        bedrooms, full_bathrooms, partial_bathrooms,
        sqft_main, sqft_second, sqft_third, sqft_basement,
        lot_size, zoning)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     ON CONFLICT (normalized_address, created_by) DO UPDATE SET
       year_built        = COALESCE(EXCLUDED.year_built,        properties.year_built),
       property_type     = COALESCE(EXCLUDED.property_type,     properties.property_type),
       design_style      = COALESCE(EXCLUDED.design_style,      properties.design_style),
       construction      = COALESCE(EXCLUDED.construction,      properties.construction),
       foundation        = COALESCE(EXCLUDED.foundation,        properties.foundation),
       bedrooms          = COALESCE(EXCLUDED.bedrooms,          properties.bedrooms),
       full_bathrooms    = COALESCE(EXCLUDED.full_bathrooms,    properties.full_bathrooms),
       partial_bathrooms = COALESCE(EXCLUDED.partial_bathrooms, properties.partial_bathrooms),
       sqft_main         = COALESCE(EXCLUDED.sqft_main,         properties.sqft_main),
       sqft_second       = COALESCE(EXCLUDED.sqft_second,       properties.sqft_second),
       sqft_third        = COALESCE(EXCLUDED.sqft_third,        properties.sqft_third),
       sqft_basement     = COALESCE(EXCLUDED.sqft_basement,     properties.sqft_basement),
       lot_size          = COALESCE(EXCLUDED.lot_size,          properties.lot_size),
       zoning            = COALESCE(EXCLUDED.zoning,            properties.zoning)
     RETURNING id`,
    [
      address.trim(), normalized, userId,
      toInt(property.yearBuilt),
      property.propertyType    || null,
      property.designStyle     || null,
      property.construction    || null,
      property.foundationWalls || null,
      bedrooms    || null,
      fullBath    || null,
      partialBath || null,
      toInt(fl('main').sqft),
      toInt(fl('second').sqft),
      toInt(fl('third').sqft),
      toInt(fl('basement').sqft),
      property.lotSize || null,
      property.zoning  || null,
    ]
  );
  return rows[0].id;
}
// ─────────────────────────────────────────────────────────────────────────────
```

COALESCE on every column: new values only fill in NULL slots — existing CRAL data
is never overwritten by a Spoke inspection. The existing `sqft` and `bathrooms`
columns (single values from CRAL) are not touched by this upsert at all.

---

## 2. POST /api/inspections — add property upsert

Find your existing `app.post('/api/inspections', ...)` and modify the INSERT block.

**Add this BEFORE your existing INSERT:**
```javascript
const propertyId = await upsertProperty(
  req.body.property?.address,
  req.body.property || {},
  req.body.roomAllocation || {},
  req.user.id
);
```

**Then add `property_id` to your INSERT column list and VALUES:**
```sql
-- Add to your INSERT INTO inspections column list:
property_id

-- Add to your VALUES parameter list:
$N   -- where N is the next param index; value: propertyId
```

---

## 3. PUT /api/inspections/:id — same addition

Find your existing `app.put('/api/inspections/:id', ...)` and add the same upsert call:

```javascript
// Add at top of the route handler, before your UPDATE query
const propertyId = await upsertProperty(
  req.body.property?.address,
  req.body.property || {},
  req.body.roomAllocation || {},
  req.user.id
);

// Add to your UPDATE SET clause:
// property_id = COALESCE($N, property_id)
// Pass propertyId as the param value.
// COALESCE means: only update property_id if upsert returned one.
```

---

## 4. Extend GET /api/properties/search (around line 175)

Find your existing SELECT in the search route and add the new columns.
Keep all existing columns exactly as they are — just append to the SELECT list:

```sql
SELECT
  id, address, property_type, city, province,
  last_order_date, last_client, last_form_type,
  -- existing characteristic columns:
  year_built, sqft, bedrooms, bathrooms, lot_size, zoning,
  -- new columns added by migration:
  design_style, construction, foundation,
  sqft_main, sqft_second, sqft_third, sqft_basement,
  full_bathrooms, partial_bathrooms
FROM properties
WHERE ...  -- leave your existing WHERE/ORDER BY unchanged
```

---

## 5. GET /api/properties/:id — add this NEW route

Place this after your existing properties/search route.

Note on the orders timeline query: `last_order_date`, `last_client`, and
`last_form_type` appear to be columns on the properties table itself (populated
during CRAL import) rather than from a separate orders table with a property_id FK.
If you do have a separate orders table, adjust the column names in the try block below.
If not, the catch will silently skip it and the timeline will show inspections only.

```javascript
app.get('/api/properties/:id', authenticate, async (req, res) => {
  try {
    const propResult = await pool.query(
      `SELECT
         id, address, city, province, postal_code,
         year_built, property_type, design_style, construction, foundation,
         sqft, bedrooms, bathrooms,
         sqft_main, sqft_second, sqft_third, sqft_basement,
         full_bathrooms, partial_bathrooms,
         lot_size, zoning,
         last_order_date, last_client, last_form_type,
         created_at, updated_at
       FROM properties
       WHERE id = $1`,
      [req.params.id]
    );

    if (propResult.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Timeline: Spoke inspections linked to this property
    const inspResult = await pool.query(
      `SELECT
         i.id,
         'inspection'                          AS entry_type,
         COALESCE(
           i.property_data->>'inspectionDate',
           i.created_at::text
         )                                     AS entry_date,
         i.property_data->>'appraisalType'     AS form_type,
         i.property_data->>'clientName'        AS client,
         u.full_name                           AS appraiser,
         NULL                                  AS status,
         i.created_at
       FROM inspections i
       JOIN users u ON u.id = i.user_id
       WHERE i.property_id = $1
       ORDER BY i.created_at DESC`,
      [req.params.id]
    );

    // Timeline: historical CRAL orders (only if you have a separate orders table
    // with a property_id FK — adjust column names to match your actual schema)
    let ordRows = [];
    try {
      const ordResult = await pool.query(
        `SELECT
           o.id,
           'order'          AS entry_type,
           o.order_date     AS entry_date,
           o.form_type,
           o.client_name    AS client,
           o.appraiser_name AS appraiser,
           o.status,
           o.created_at
         FROM orders o
         WHERE o.property_id = $1
         ORDER BY o.order_date DESC`,
        [req.params.id]
      );
      ordRows = ordResult.rows;
    } catch (_) {
      // No separate orders table or schema differs — timeline shows inspections only
    }

    const timeline = [...inspResult.rows, ...ordRows].sort(
      (a, b) => new Date(b.entry_date || b.created_at) - new Date(a.entry_date || a.created_at)
    );

    res.json({ property: propResult.rows[0], timeline });
  } catch (err) {
    console.error('GET /api/properties/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});
```

---

## 6. PATCH /api/properties/:id — add this NEW route

Place this after the GET /api/properties/:id route.

The allowlist covers all editable characteristics. The original CRAL columns
`sqft` and `bathrooms` are intentionally excluded — they're source-of-truth
values from the import and should not be overwritten from the UI.

```javascript
app.patch('/api/properties/:id', authenticate, async (req, res) => {
  const allowed = [
    'year_built', 'property_type', 'design_style', 'construction', 'foundation',
    'bedrooms', 'full_bathrooms', 'partial_bathrooms',
    'sqft_main', 'sqft_second', 'sqft_third', 'sqft_basement',
    'lot_size', 'zoning',
    'city', 'province', 'postal_code'
  ];

  const updates = [];
  const values  = [];
  let idx = 1;

  for (const col of allowed) {
    if (req.body[col] !== undefined) {
      updates.push(`${col} = $${idx++}`);
      values.push(req.body[col] === '' ? null : req.body[col]);
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields provided' });
  }

  values.push(req.params.id);

  try {
    const { rows } = await pool.query(
      `UPDATE properties SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Property not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PATCH /api/properties/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});
```

---

## 7. Return property_id when loading inspections

In your `GET /api/inspections` (list) and `GET /api/inspections/:id` routes,
make sure `property_id` is included in the SELECT:

```sql
SELECT id, user_id, property_id, property_data, room_allocation, status, created_at, updated_at
FROM inspections
WHERE ...
```

---

## Deploy order

```bash
# 1. Run the database migration first
psql -U your_db_user -d your_db_name -f migration_properties.sql

# 2. Edit server.js with the additions above

# 3. Restart
pm2 restart spoke

# 4. Deploy frontend
npm run deploy
```
