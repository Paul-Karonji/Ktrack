-- Add file support to messages table
ALTER TABLE messages 
ADD COLUMN file_url VARCHAR(500) NULL AFTER message,
ADD COLUMN file_name VARCHAR(255) NULL AFTER file_url,
ADD COLUMN file_size INT NULL AFTER file_name,
ADD COLUMN file_type VARCHAR(255) NULL AFTER file_size;
