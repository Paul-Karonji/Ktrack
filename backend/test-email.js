// Quick test script for Resend email service
require('dotenv').config();
const EmailService = require('./services/emailService');

async function testEmail() {
    console.log('🧪 Testing Resend Email Service...\n');

    const testRecipient = process.env.ADMIN_EMAIL || 'karonjipaul.w@gmail.com';

    try {
        const result = await EmailService.sendTestEmail(testRecipient);

        if (result.success) {
            console.log('\n✅ SUCCESS! Email sent via Resend');
            console.log('Message ID:', result.messageId);
            console.log(`\nCheck ${testRecipient} for the test email.`);
        } else {
            console.log('\n❌ FAILED:', result.error || result.message);
        }
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
    }
}

testEmail();
