require('dotenv').config();
const R2Service = require('../services/r2Service');

async function testUpload() {
    console.log('--- Testing R2Service Isolated Upload ---');

    // Mock file object (similar to what multer provides)
    const mockFile = {
        originalname: 'test_debug_script.txt',
        mimetype: 'text/plain',
        size: 13,
        buffer: Buffer.from('Hello R2 World!')
    };

    const taskId = 4; // Using known existing task ID

    try {
        console.log(`Attempting to upload file for Task ${taskId}...`);
        console.log('Bucket:', process.env.R2_BUCKET_NAME || 'UNDEFINED');

        const result = await R2Service.uploadFile(mockFile, taskId);
        console.log('✅ Upload SUCCESS:', result);
    } catch (error) {
        console.error('❌ Upload FAILED:', error);
    } finally {
        process.exit();
    }
}

testUpload();
