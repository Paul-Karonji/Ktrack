require('dotenv').config();
const mysql = require('mysql2/promise');

async function runMigration() {
    console.log('🚀 Starting Guest Clients Migration...');

    if (!process.env.DB_NAME) {
        console.error('❌ Error: DB_NAME environment variable not set');
        process.exit(1);
    }

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        // STEP 1: Create guest_clients table
        console.log('\n1️⃣ Creating guest_clients table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS guest_clients (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                phone VARCHAR(50),
                course VARCHAR(255),
                notes TEXT,
                password_hash VARCHAR(255),
                has_login_access BOOLEAN DEFAULT FALSE,
                upgraded_to_user_id INT NULL,
                upgraded_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (upgraded_to_user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log('   ✅ guest_clients table ready');

        // STEP 2: Add phone to users table
        console.log('\n2️⃣ Checking users.phone column...');
        const [userCols] = await connection.query("SHOW COLUMNS FROM users LIKE 'phone'");
        if (userCols.length === 0) {
            await connection.query("ALTER TABLE users ADD COLUMN phone VARCHAR(50)");
            console.log('   ✅ Added phone column to users');
        } else {
            console.log('   ℹ️  phone column already exists');
        }

        // STEP 3: Add guest_client_id to tasks table
        console.log('\n3️⃣ Checking tasks.guest_client_id column...');
        const [taskCols] = await connection.query("SHOW COLUMNS FROM tasks LIKE 'guest_client_id'");
        if (taskCols.length === 0) {
            await connection.query(`
                ALTER TABLE tasks 
                ADD COLUMN guest_client_id INT NULL,
                ADD FOREIGN KEY (guest_client_id) REFERENCES guest_clients(id) ON DELETE SET NULL
            `);
            console.log('   ✅ Added guest_client_id column to tasks');
        } else {
            console.log('   ℹ️  guest_client_id column already exists');
        }

        // STEP 4: Make client_id nullable
        console.log('\n4️⃣ Making tasks.client_id nullable...');
        await connection.query("ALTER TABLE tasks MODIFY COLUMN client_id INT NULL");
        console.log('   ✅ client_id is now nullable');

        // STEP 5: Migrate legacy data
        console.log('\n5️⃣ Migrating legacy guest data...');
        const [tasksToMigrate] = await connection.query(`
            SELECT DISTINCT client_name 
            FROM tasks 
            WHERE client_id IS NULL AND client_name IS NOT NULL
        `);

        if (tasksToMigrate.length > 0) {
            console.log(`   Found ${tasksToMigrate.length} legacy guest names to migrate...`);

            // Insert guests
            await connection.query(`
                INSERT INTO guest_clients (name, created_at)
                SELECT DISTINCT client_name, MIN(created_at)
                FROM tasks
                WHERE client_id IS NULL AND client_name IS NOT NULL
                GROUP BY client_name
                ON DUPLICATE KEY UPDATE name=name 
            `);

            // Update tasks
            const [updateResult] = await connection.query(`
                UPDATE tasks t
                JOIN guest_clients gc ON t.client_name = gc.name
                SET t.guest_client_id = gc.id
                WHERE t.client_id IS NULL AND t.client_name IS NOT NULL
            `);
            console.log(`   ✅ Migrated ${updateResult.affectedRows} tasks to guest_clients`);
        } else {
            console.log('   ℹ️  No legacy task data to migrate');
        }

        console.log('\n✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration Error:', error.message);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

runMigration();
