// Migration runner for creating users table
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function runMigration() {
    let connection;

    try {
        console.log('🔌 Connecting to database...');

        // Create connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('✅ Connected to database:', process.env.DB_NAME);

        // Check if users table already exists
        console.log('\n📋 Checking if users table exists...');
        const [tables] = await connection.execute(
            "SHOW TABLES LIKE 'users'"
        );

        if (tables.length > 0) {
            console.log('⚠️  Users table already exists!');
            console.log('   Skipping migration.');
            return;
        }

        console.log('\n🚀 Creating users table...');

        // Create users table
        await connection.execute(`
      CREATE TABLE users (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

        console.log('✅ Users table created successfully!');

        // Create admin user
        console.log('\n👤 Creating admin user...');
        const adminPassword = 'admin123'; // CHANGE THIS AFTER FIRST LOGIN!
        const passwordHash = await bcrypt.hash(adminPassword, 10);

        await connection.execute(
            `INSERT INTO users (email, password_hash, role, full_name, status, approved_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            ['admin@tasktracker.com', passwordHash, 'admin', 'System Administrator', 'approved']
        );

        console.log('✅ Admin user created!');
        console.log('   📧 Email: admin@tasktracker.com');
        console.log('   🔑 Password: admin123');
        console.log('   ⚠️  IMPORTANT: Change this password after first login!');

        // Verify the table
        console.log('\n🔍 Verifying table structure...');
        const [columns] = await connection.execute('DESCRIBE users');

        console.log('\n📋 Users table structure:');
        columns.forEach(col => {
            console.log(`   - ${col.Field}: ${col.Type}`);
        });

        console.log('\n✨ Migration completed successfully!');
        console.log('🎉 Authentication system is ready!');

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error('\nError details:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Database connection closed');
        }
    }
}

// Run the migration
runMigration();
