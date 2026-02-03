const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
    let connection;

    try {
        console.log('🔌 Connecting to database...');

        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('✅ Connected to database:', process.env.DB_NAME);
        console.log('\n🚀 Running migration: Add task_name column...');

        // Check if column exists
        const [columns] = await connection.execute("SHOW COLUMNS FROM tasks LIKE 'task_name'");

        if (columns.length > 0) {
            console.log('⚠️  Column task_name already exists. Skipping.');
        } else {
            // Add task_name column
            await connection.execute(`
                ALTER TABLE tasks 
                ADD COLUMN task_name VARCHAR(255) AFTER id
            `);
            console.log('   ✅ task_name column added successfully');
        }

        console.log('\n✨ Migration completed successfully!');

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Database connection closed');
        }
    }
}

runMigration();
