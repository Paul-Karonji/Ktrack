// Migration runner script to add priority, status, and notes to tasks table
const mysql = require('mysql2/promise');
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

        // Check if columns already exist
        console.log('\n📋 Checking existing table structure...');
        const [columns] = await connection.execute('DESCRIBE tasks');
        const existingColumns = columns.map(col => col.Field);

        const hasPriority = existingColumns.includes('priority');
        const hasStatus = existingColumns.includes('status');
        const hasNotes = existingColumns.includes('notes');

        if (hasPriority && hasStatus && hasNotes) {
            console.log('⚠️  Migration already applied! All columns exist.');
            console.log('   - priority: ✓');
            console.log('   - status: ✓');
            console.log('   - notes: ✓');
            return;
        }

        console.log('\n🚀 Running migration...');

        // Add priority column if it doesn't exist
        if (!hasPriority) {
            console.log('   Adding priority column...');
            await connection.execute(`
        ALTER TABLE tasks 
        ADD COLUMN priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium' AFTER is_paid
      `);
            console.log('   ✅ Priority column added');
        } else {
            console.log('   ⏭️  Priority column already exists');
        }

        // Add status column if it doesn't exist
        if (!hasStatus) {
            console.log('   Adding status column...');
            await connection.execute(`
        ALTER TABLE tasks 
        ADD COLUMN status ENUM('not_started', 'in_progress', 'review', 'completed') DEFAULT 'not_started' AFTER priority
      `);
            console.log('   ✅ Status column added');
        } else {
            console.log('   ⏭️  Status column already exists');
        }

        // Add notes column if it doesn't exist
        if (!hasNotes) {
            console.log('   Adding notes column...');
            await connection.execute(`
        ALTER TABLE tasks 
        ADD COLUMN notes TEXT AFTER status
      `);
            console.log('   ✅ Notes column added');
        } else {
            console.log('   ⏭️  Notes column already exists');
        }

        // Create indexes
        console.log('\n📊 Creating indexes...');

        try {
            await connection.execute('CREATE INDEX idx_priority ON tasks(priority)');
            console.log('   ✅ Priority index created');
        } catch (err) {
            if (err.code === 'ER_DUP_KEYNAME') {
                console.log('   ⏭️  Priority index already exists');
            } else {
                throw err;
            }
        }

        try {
            await connection.execute('CREATE INDEX idx_status ON tasks(status)');
            console.log('   ✅ Status index created');
        } catch (err) {
            if (err.code === 'ER_DUP_KEYNAME') {
                console.log('   ⏭️  Status index already exists');
            } else {
                throw err;
            }
        }

        // Verify the changes
        console.log('\n🔍 Verifying migration...');
        const [newColumns] = await connection.execute('DESCRIBE tasks');

        console.log('\n📋 Updated table structure:');
        newColumns.forEach(col => {
            if (['priority', 'status', 'notes'].includes(col.Field)) {
                console.log(`   ✓ ${col.Field}: ${col.Type}`);
            }
        });

        console.log('\n✨ Migration completed successfully!');
        console.log('🎉 Your task tracker now supports priority, status, and notes!');

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
