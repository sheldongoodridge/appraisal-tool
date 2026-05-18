-- Run this on your PostgreSQL database on DigitalOcean

CREATE TABLE inspection_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id),
  storage_url   TEXT NOT NULL,
  storage_key   TEXT NOT NULL,
  filename      TEXT NOT NULL,
  room          TEXT NOT NULL DEFAULT 'untagged',
  notes         TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_photos_inspection_id ON inspection_photos(inspection_id);
CREATE INDEX idx_photos_user_id ON inspection_photos(user_id);
