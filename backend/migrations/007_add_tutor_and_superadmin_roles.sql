-- 007_add_tutor_and_superadmin_roles.sql

-- First, add the new roles without removing the old one to avoid truncation
ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'client', 'superadmin', 'tutor') NOT NULL DEFAULT 'client';

-- Migrate existing admins to superadmin
UPDATE users SET role = 'superadmin' WHERE role = 'admin';

-- Now safely remove 'admin' from the enum
ALTER TABLE users MODIFY COLUMN role ENUM('superadmin', 'tutor', 'client') NOT NULL DEFAULT 'client';

-- Alter tasks table to add assigned_tutor_id
ALTER TABLE tasks ADD COLUMN assigned_tutor_id INT NULL;
ALTER TABLE tasks ADD CONSTRAINT fk_task_assigned_tutor FOREIGN KEY (assigned_tutor_id) REFERENCES users(id) ON DELETE SET NULL;
