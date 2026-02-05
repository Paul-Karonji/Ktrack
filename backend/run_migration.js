require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('📁 Reading migration...');
        const sql = fs.readFileSync(path.join(__dirname, 'migrations', 'add_message_files.sql'), 'utf8');

        console.log('🚀 Executing ALTER TABLE...');
        await connection.query(sql);

        console.log('📊 Creating index...');
        try {
            await connection.query('CREATE INDEX idx_messages_file ON messages(file_url)');
        } catch (e) {
            if (e.code === 'ER_DUP_KEYNAME') console.log('  ℹ️  Index exists');
            else throw e;
        }

        console.log('✅ DONE!\n');
        const [cols] = await connection.query('DESCRIBE messages');
        console.table(cols);

    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('✅ Columns already exist! Checking structure...');
            const [cols] = await connection.query('DESCRIBE messages');
            console.table(cols);
        } else {
            console.error('❌ Error:', error.message);
            process.exit(1);
        }
    } finally {
        await connection.end();
    }
}

runMigration();
