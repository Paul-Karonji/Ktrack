-- Create task_files table
CREATE TABLE IF NOT EXISTS task_files (
    id INT PRIMARY KEY AUTO_INCREMENT,
    task_id INT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(255),
    file_size INT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Add has_file column to tasks if it doesn't exist
-- Using a stored procedure to check for column existence since MariaDB/MySQL doesn't support IF NOT EXISTS for columns in ALTER TABLE directly in all versions
DROP PROCEDURE IF EXISTS upgrade_tasks_table;

DELIMITER //

CREATE PROCEDURE upgrade_tasks_table()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'tasks' 
        AND COLUMN_NAME = 'has_file'
    ) THEN
        ALTER TABLE tasks ADD COLUMN has_file BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Rename expected_amount to final_amount if it exists and hasn't been renamed yet
    -- For now, let's just keep expected_amount to avoid breaking existing code, 
    -- or maybe simple add client_id if needed, but tasks already has client_name which implies it's simpler.
    -- Wait, the implementation plan said "ADD COLUMN client_id".
    -- Phase 4A implementation didn't link tasks to users via ID, it used client_name string?
    -- Let's check Task.js model.
    -- Phase 4A didn't strictly enforce client_id on tasks yet, just "clientName". 
    -- To keep it compatible with existing data, we can add client_id as nullable for now and backfill later.
    
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'tasks' 
        AND COLUMN_NAME = 'client_id'
    ) THEN
        ALTER TABLE tasks ADD COLUMN client_id INT NULL AFTER id;
        ALTER TABLE tasks ADD CONSTRAINT fk_task_client FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;

END //

DELIMITER ;

CALL upgrade_tasks_table();
DROP PROCEDURE IF EXISTS upgrade_tasks_table;
