# Phase 1 Deployment — Photo Cloud Storage

## 1. Set up DigitalOcean Spaces

1. In DO dashboard → Spaces → Create Space
   - Name: `spoke-photos` (or whatever you like)
   - Region: match your droplet region
   - Enable CDN: yes
2. Spaces → Manage Keys → Generate New Key
   - Save the Access Key and Secret

## 2. Add environment variables to your droplet

SSH into the droplet and add to your `.env` file:

```
DO_SPACES_KEY=your_access_key
DO_SPACES_SECRET=your_secret_key
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com   # use your region
DO_SPACES_BUCKET=spoke-photos
DO_SPACES_CDN_ENDPOINT=https://spoke-photos.nyc3.cdn.digitaloceanspaces.com
```

## 3. Install new backend dependencies

```bash
npm install @aws-sdk/client-s3 multer uuid
```

## 4. Copy routes/photos.js to your server

Copy `routes/photos.js` from this folder to your backend's `routes/` directory.

## 5. Add the route to server.js

Add these two lines to `server.js` alongside the other route registrations:

```javascript
const photoRoutes = require('./routes/photos');
app.use('/api/photos', photoRoutes);
```

## 6. Run the database migration

```bash
psql -U your_db_user -d your_db_name -f migration.sql
```

## 7. Restart the server

```bash
pm2 restart spoke   # or however you manage the process
```

## 8. Deploy the frontend

From your local machine in the appraisal-tool directory:

```bash
npm run deploy
```
