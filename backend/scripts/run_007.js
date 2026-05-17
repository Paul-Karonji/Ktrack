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
        multipleStatements: true
    });

    try {
        console.log('📁 Reading migration...');
        const sql = fs.readFileSync(path.join(__dirname, '../migrations', '007_add_tutor_and_superadmin_roles.sql'), 'utf8');

        console.log('🚀 Executing...');
        await connection.query(sql);
        console.log('✅ DONE!\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

runMigration();
