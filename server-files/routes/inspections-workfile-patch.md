# Server Change: Add 'report' to VALID_SECTIONS

On the DigitalOcean droplet, find the PATCH /api/inspections/:id/workfile
handler in your inspections route (likely routes/inspections.js) and add
'report' to the VALID_SECTIONS array:

```javascript
const VALID_SECTIONS = [
  'order',
  'contacts',
  'property',
  'site',
  'inspections',
  'report',       // ← ADD THIS
];
```

No database migration needed. Report data stores automatically in
workfile_data.report JSONB on the inspections table.

After editing, restart the server:
  pm2 restart spoke
