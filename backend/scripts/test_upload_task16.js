require('dotenv').config();
const R2Service = require('../services/r2Service');

async function testTask16() {
    console.log('--- Testing Real Upload for Task 16 ---');

    const mockFile = {
        originalname: 'real_test_16.txt',
        mimetype: 'text/plain',
        size: 30,
        buffer: Buffer.from('Testing Task 16 Real Upload')
    };

    const taskId = 16;

    try {
        console.log(`Uploading to Task ${taskId}...`);
        const result = await R2Service.uploadFile(mockFile, taskId);
        console.log('✅ Success:', result);
    } catch (error) {
        console.error('❌ Failed:', error);
    } finally {
        process.exit();
    }
}

testTask16();
