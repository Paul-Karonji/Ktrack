require('dotenv').config();
const R2Service = require('../services/r2Service');

async function testFallback() {
    console.log('--- Testing R2Service LOCAL FALLBACK ---');

    // Mock file object
    const mockFile = {
        originalname: 'fallback_test.txt',
        mimetype: 'text/plain',
        size: 20,
        buffer: Buffer.from('Fallback Content Test')
    };

    const taskId = 4; // Existing task

    // Monkey-patch s3Client to ALWAYS FAIL so we trigger fallback
    const { S3Client } = require('@aws-sdk/client-s3');
    S3Client.prototype.send = async () => {
        throw new Error('Simulated R2 Connection Failure');
    };

    try {
        console.log(`Attempting upload for Task ${taskId} (Expect Fallback)...`);

        const result = await R2Service.uploadFile(mockFile, taskId);
        console.log('✅ Fallback Upload SUCCESS:', result);

        if (result.storageType === 'local') {
            console.log('✅ Correctly used LOCAL storage.');
        } else {
            console.log('❌ Unexpected storage type:', result.storageType);
        }

    } catch (error) {
        console.error('❌ Fallback Upload FAILED:', error);
    } finally {
        process.exit();
    }
}

testFallback();
