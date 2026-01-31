require('dotenv').config();
const { S3Client, ListObjectsCommand } = require('@aws-sdk/client-s3');
const { pool } = require('../config/database');

async function checkInfrastructure() {
    console.log('--- Checking Database ---');
    try {
        const [rows] = await pool.query("SHOW TABLES LIKE 'task_files'");
        if (rows.length > 0) {
            console.log('✅ Table `task_files` exists.');
            // Check columns
            const [cols] = await pool.query("SHOW COLUMNS FROM task_files");
            console.log('Columns:', cols.map(c => c.Field).join(', '));
        } else {
            console.log('❌ Table `task_files` MISSING!');
        }
    } catch (err) {
        console.error('❌ DB Check Error:', err.message);
    }

    console.log('\n--- Checking R2 Connection ---');
    const s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
    });

    try {
        const command = new ListObjectsCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            MaxKeys: 1
        });
        const response = await s3Client.send(command);
        console.log(`✅ R2 Connection Successful! Bucket "${process.env.R2_BUCKET_NAME}" is accessible.`);
    } catch (err) {
        console.error('❌ R2 Connection Error:', err.name, err.message);
    }

    process.exit();
}

checkInfrastructure();
