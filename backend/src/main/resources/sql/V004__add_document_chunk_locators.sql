ALTER TABLE document_chunks
ADD COLUMN locator_type VARCHAR(30),
ADD COLUMN locator_start INT,
ADD COLUMN locator_end INT;
