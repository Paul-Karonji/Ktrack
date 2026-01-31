-- Migration: Create users table for authentication system
-- This enables client registration, admin approval, and role-based access

USE client_task_tracker;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'client') DEFAULT 'client',
  full_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  course VARCHAR(255),
  status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP NULL,
  approved_by INT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_email (email),
  INDEX idx_status (status),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create initial admin user (password: admin123 - CHANGE THIS!)
-- Password hash for 'admin123' using bcrypt with 10 rounds
INSERT INTO users (email, password_hash, role, full_name, status, approved_at)
VALUES (
  'admin@tasktracker.com',
  '$2b$10$rKvVPZqGqXqKGX5xKxN0xOYJ5YqJ5YqJ5YqJ5YqJ5YqJ5YqJ5Yq',  -- Placeholder, will be updated
  'admin',
  'System Administrator',
  'approved',
  CURRENT_TIMESTAMP
);

-- Verify the table was created
DESCRIBE users;

SELECT 'Users table created successfully!' AS status;
