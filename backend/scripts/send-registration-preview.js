const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const EmailService = require('../services/emailService');
const templates = require('../templates/emailTemplates');

async function sendPreview() {
    console.log('🚀 Sending Registration Email Preview...');

    // Dummy user data
    const dummyUser = {
        full_name: 'John Doe',
        email: 'john.doe@example.com'
    };

    try {
        // Generate content using the actual template
        const { subject, html } = templates.newRegistration(dummyUser);

        // Send to ADMIN_EMAIL (which is set to paultutorw@gmail.com or karonjipaul.w@gmail.com in .env)
        // We can force it to send to the current configured user to be safe

        const targetEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
        console.log(`📨 Sending to: ${targetEmail}`);

        // Use the service to send
        await EmailService.sendEmail({
            to: targetEmail,
            subject: `[PREVIEW] ${subject}`,
            html: html
        });

        console.log('✅ Preview sent successfully! Check your inbox.');
    } catch (error) {
        console.error('❌ Failed to send preview:', error);
    }
}

sendPreview();
