ALTER TABLE document_share_links
ADD COLUMN IF NOT EXISTS plain_token VARCHAR(255);
