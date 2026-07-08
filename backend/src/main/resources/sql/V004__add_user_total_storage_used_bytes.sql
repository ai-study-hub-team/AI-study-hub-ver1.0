ALTER TABLE users
ADD COLUMN IF NOT EXISTS total_storage_used_bytes BIGINT NOT NULL DEFAULT 0;

UPDATE users u
SET total_storage_used_bytes = COALESCE(usage.total_bytes, 0)
FROM (
    SELECT d.user_id, COALESCE(SUM(cf.file_size), 0) AS total_bytes
    FROM documents d
    JOIN cloud_files cf ON d.cloud_file_id = cf.id
    WHERE d.status = 'ACTIVE'
    GROUP BY d.user_id
) usage
WHERE u.id = usage.user_id;
