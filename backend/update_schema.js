const mysql = require('mysql2/promise');
require('dotenv').config();

async function runUpdate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });

    console.log('--- Updating Tasks Table for Currency Localization ---');

    // Get existing columns
    const [columns] = await connection.execute('SHOW COLUMNS FROM tasks');
    const existingColumns = columns.map(col => col.Field);

    const newColumns = [
        { name: 'payment_currency', def: 'VARCHAR(3) DEFAULT "USD"' },
        { name: 'payment_exchange_rate', def: 'DECIMAL(10, 2)' },
        { name: 'payment_kes_amount', def: 'DECIMAL(10, 2)' }
    ];

    for (const col of newColumns) {
        if (!existingColumns.includes(col.name)) {
            try {
                const query = `ALTER TABLE tasks ADD COLUMN ${col.name} ${col.def}`;
                await connection.execute(query);
                console.log(`Added column: ${col.name}`);
            } catch (err) {
                console.error(`Error adding column ${col.name}:`, err.message);
            }
        } else {
            console.log(`Column already exists: ${col.name}`);
        }
    }

    await connection.end();
    console.log('Update complete.');
}

runUpdate().catch(console.error);
