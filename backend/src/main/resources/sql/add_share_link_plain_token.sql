-- Add plain_token column to document_share_links table
-- to allow the owner to re-copy the share URL later.
-- Existing links will have plain_token = null.

ALTER TABLE document_share_links
ADD COLUMN IF NOT EXISTS plain_token VARCHAR(255) NULL;
