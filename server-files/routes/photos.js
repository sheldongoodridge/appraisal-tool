const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const pool = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

const s3 = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET,
  },
  forcePathStyle: false,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Upload a photo for an inspection
router.post('/upload', auth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { inspectionId, room, notes } = req.body;

    const inspection = await pool.query(
      'SELECT id FROM inspections WHERE id = $1 AND user_id = $2',
      [inspectionId, req.user.userId]
    );
    if (inspection.rows.length === 0) {
      return res.status(403).json({ error: 'Inspection not found' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
    const key = `inspections/${req.user.userId}/${inspectionId}/${uuidv4()}${ext}`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'public-read',
    }));

    const url = `${process.env.DO_SPACES_CDN_ENDPOINT}/${key}`;

    const result = await pool.query(
      `INSERT INTO inspection_photos
        (inspection_id, user_id, storage_url, storage_key, filename, room, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [inspectionId, req.user.userId, url, key, req.file.originalname, room || 'untagged', notes || '']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Photo upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Get all photos for an inspection
router.get('/inspection/:inspectionId', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.* FROM inspection_photos p
       JOIN inspections i ON p.inspection_id = i.id
       WHERE p.inspection_id = $1 AND i.user_id = $2
       ORDER BY p.created_at ASC`,
      [req.params.inspectionId, req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get photos error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update photo room tag or notes
router.patch('/:id', auth, async (req, res) => {
  try {
    const { room, notes } = req.body;
    const result = await pool.query(
      `UPDATE inspection_photos
       SET room = COALESCE($1, room), notes = COALESCE($2, notes)
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [room, notes, req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Photo not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update photo error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a photo
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM inspection_photos WHERE id = $1 AND user_id = $2 RETURNING storage_key',
      [req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Photo not found' });

    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: result.rows[0].storage_key,
    }));

    res.json({ message: 'Photo deleted' });
  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
