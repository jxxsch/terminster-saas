ALTER TABLE team ADD COLUMN IF NOT EXISTS image_position_email text DEFAULT '50% 50%';
ALTER TABLE team ADD COLUMN IF NOT EXISTS image_scale_email real DEFAULT 1.7;
