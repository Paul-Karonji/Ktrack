const { pool } = require('../config/database');
require('dotenv').config({ path: '../.env' });

function generateReferralCode() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

async function runMigration() {
    console.log('Starting referrals migration...');
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Add columns to users table
        console.log('Adding referral columns to users table...');
        
        // Check if columns exist first to avoid errors on re-run
        const [columns] = await connection.query(`SHOW COLUMNS FROM users`);
        const hasReferralCode = columns.some(col => col.Field === 'referral_code');
        
        if (!hasReferralCode) {
            await connection.query(`
                ALTER TABLE users
                ADD COLUMN referral_code VARCHAR(20) UNIQUE NULL,
                ADD COLUMN referred_by INT NULL,
                ADD COLUMN referral_discount_balance DECIMAL(10,2) DEFAULT 0.00,
                ADD CONSTRAINT fk_referred_by FOREIGN KEY (referred_by) REFERENCES users(id) ON DELETE SET NULL
            `);
            console.log('Columns added successfully.');
        } else {
            console.log('Referral columns already exist, skipping ALTER TABLE.');
        }

        // 2. Generate referral codes for existing users
        console.log('Generating referral codes for existing users...');
        const [users] = await connection.query(`SELECT id FROM users WHERE referral_code IS NULL`);
        
        for (const user of users) {
            let uniqueCode = false;
            let code = '';
            
            // Ensure uniqueness
            while (!uniqueCode) {
                code = generateReferralCode();
                const [existing] = await connection.query(`SELECT id FROM users WHERE referral_code = ?`, [code]);
                if (existing.length === 0) {
                    uniqueCode = true;
                }
            }

            await connection.query(`UPDATE users SET referral_code = ? WHERE id = ?`, [code, user.id]);
        }
        
        console.log(`Generated codes for ${users.length} users.`);

        await connection.commit();
        console.log('Migration completed successfully!');

    } catch (error) {
        await connection.rollback();
        console.error('Migration failed:', error);
    } finally {
        connection.release();
        process.exit(0);
    }
}

runMigration();
