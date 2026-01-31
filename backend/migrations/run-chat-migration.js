const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

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

        console.log('🔧 Creating messages table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id INT PRIMARY KEY AUTO_INCREMENT,
                task_id INT NOT NULL,
                sender_id INT NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                read_at TIMESTAMP NULL,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
                FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Created messages table');

        console.log('🔧 Adding last_message_at to tasks...');
        try {
            await connection.query(`
                ALTER TABLE tasks 
                ADD COLUMN last_message_at TIMESTAMP NULL AFTER updated_at
            `);
            console.log('✅ Added last_message_at column');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') console.log('ℹ️ last_message_at already exists');
            else throw err;
        }

        console.log('🎉 Chat Schema Migration completed!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        if (connection) await connection.end();
    }
}

runMigration();
