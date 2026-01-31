const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
};

async function runMigration() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('🔌 Connected to database');

        console.log('📦 Creating task_files table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS task_files (
                id INT PRIMARY KEY AUTO_INCREMENT,
                task_id INT NOT NULL,
                original_filename VARCHAR(255) NOT NULL,
                stored_filename VARCHAR(255) NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                file_type VARCHAR(50),
                file_size INT,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ task_files table checked/created');

        console.log('🔧 Check/Add has_file column...');
        try {
            await connection.query(`ALTER TABLE tasks ADD COLUMN has_file BOOLEAN DEFAULT FALSE`);
            console.log('✅ Added has_file column');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ has_file column already exists');
            } else {
                throw err;
            }
        }

        console.log('🔧 Check/Add client_id column...');
        try {
            await connection.query(`ALTER TABLE tasks ADD COLUMN client_id INT NULL AFTER id`);
            console.log('✅ Added client_id column');

            // Add foreign key separately
            await connection.query(`ALTER TABLE tasks ADD CONSTRAINT fk_task_client FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE SET NULL`);
            console.log('✅ Added FK for client_id');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ client_id column already exists');
            } else {
                // If FK creation fails, it might be due to existing constraint, log it but don't fail hard if column exists
                console.log('⚠️ Warning during client_id/FK creation:', err.message);
            }
        }

        console.log('🎉 Migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        if (connection) await connection.end();
    }
}

runMigration();
