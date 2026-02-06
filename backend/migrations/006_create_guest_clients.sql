-- ============================================
-- STEP 1: Create guest_clients table
-- ============================================
CREATE TABLE IF NOT EXISTS guest_clients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  course VARCHAR(255),
  notes TEXT,
  
  -- Optional login credentials
  password_hash VARCHAR(255),
  has_login_access BOOLEAN DEFAULT FALSE,
  
  -- Upgrade/merge tracking
  upgraded_to_user_id INT NULL,
  upgraded_at TIMESTAMP NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (upgraded_to_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- STEP 2: Add phone to users table (if not exists)
-- ============================================
-- Using a stored procedure to safely add column if not exists
DROP PROCEDURE IF EXISTS AddPhoneToUsers;
DELIMITER //
CREATE PROCEDURE AddPhoneToUsers()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'phone'
    ) THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(50);
    END IF;
END //
DELIMITER ;
CALL AddPhoneToUsers();
DROP PROCEDURE AddPhoneToUsers;

-- ============================================
-- STEP 3: Modify tasks table
-- ============================================
-- Add guest_client_id column
DROP PROCEDURE IF EXISTS AddGuestClientIdToTasks;
DELIMITER //
CREATE PROCEDURE AddGuestClientIdToTasks()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'tasks' 
        AND COLUMN_NAME = 'guest_client_id'
    ) THEN
        ALTER TABLE tasks ADD COLUMN guest_client_id INT NULL;
        ALTER TABLE tasks ADD FOREIGN KEY (guest_client_id) REFERENCES guest_clients(id) ON DELETE SET NULL;
    END IF;
END //
DELIMITER ;
CALL AddGuestClientIdToTasks();
DROP PROCEDURE AddGuestClientIdToTasks;

-- Make client_id nullable
ALTER TABLE tasks MODIFY COLUMN client_id INT NULL;

-- ============================================
-- STEP 4: Migrate existing legacy data (if any)
-- ============================================
-- Migrate tasks with client_name but no client_id
INSERT INTO guest_clients (name, created_at)
SELECT DISTINCT client_name, MIN(created_at)
FROM tasks
WHERE client_id IS NULL AND client_name IS NOT NULL
GROUP BY client_name;

-- Link migrated tasks to guest clients
UPDATE tasks t
JOIN guest_clients gc ON t.client_name = gc.name
SET t.guest_client_id = gc.id
WHERE t.client_id IS NULL AND t.client_name IS NOT NULL;
