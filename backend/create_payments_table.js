const { pool } = require('./config/database');

async function createPaymentsTable() {
    try {
        console.log('🚀 Creating Payments Table...');

        const createTableQuery = `
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        kes_amount DECIMAL(15, 2),
        exchange_rate DECIMAL(10, 2),
        reference VARCHAR(255) UNIQUE NOT NULL,
        type ENUM('deposit', 'balance', 'full') NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_task_id (task_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

        await pool.execute(createTableQuery);
        console.log('✅ Payments table created (or already exists).');

        console.log('✨ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

createPaymentsTable();
