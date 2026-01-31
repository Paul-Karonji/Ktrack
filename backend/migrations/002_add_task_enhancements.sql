-- Instructions for running the database migration
-- This will add priority, status, and notes fields to your tasks table

-- IMPORTANT: Before running this migration:
-- 1. Backup your database
-- 2. Connect to your MySQL database
-- 3. Select your task tracker database

-- To run this migration, execute the following SQL:

USE your_database_name;  -- Replace with your actual database name

-- Add new columns to tasks table
ALTER TABLE tasks 
  ADD COLUMN priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium' AFTER is_paid,
  ADD COLUMN status ENUM('not_started', 'in_progress', 'review', 'completed') DEFAULT 'not_started' AFTER priority,
  ADD COLUMN notes TEXT AFTER status;

-- Add indexes for better query performance
CREATE INDEX idx_priority ON tasks(priority);
CREATE INDEX idx_status ON tasks(status);

-- Verify the changes
DESCRIBE tasks;

-- Expected output should include the new columns:
-- priority: enum('low','medium','high','urgent') DEFAULT 'medium'
-- status: enum('not_started','in_progress','review','completed') DEFAULT 'not_started'
-- notes: text

SELECT 'Migration completed successfully!' AS status;
