const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const nodemailer = require('nodemailer');

async function debugEmail() {
    console.log('🔍 Starting Email Debugger...');

    // 1. Check Environment Variables
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    const admin = process.env.ADMIN_EMAIL;

    console.log('\n1. Checking Environment Variables:');
    console.log(`- EMAIL_USER: ${user ? '✅ Set (' + user + ')' : '❌ MISSING'}`);
    console.log(`- EMAIL_PASS: ${pass ? '✅ Set (Length: ' + pass.length + ')' : '❌ MISSING'}`);
    console.log(`- ADMIN_EMAIL: ${admin ? '✅ Set (' + admin + ')' : '❌ MISSING'}`);

    if (!user || !pass) {
        console.error('❌ CRITICAL: Missing email credentials in .env file');
        return;
    }

    // 2. Configure Transporter
    console.log('\n2. Configuring Transporter (Gmail)...');
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: user,
            pass: pass
        },
        debug: true, // Enable debug output
        logger: true // Log to console
    });

    // 3. Verify Connection
    console.log('\n3. Verifying SMTP Connection...');
    try {
        await transporter.verify();
        console.log('✅ SMTP Connection Successful!');
    } catch (error) {
        console.error('❌ SMTP Connection Failed:', error.message);
        console.error('   Hint: Ensure you are using an App Password, not your login password.');
        console.error('   Hint: Check if "Less secure apps" is applicable (likely not for Gmail anymore, strictly use App Passwords).');
        return;
    }

    // 4. Send Test Email
    console.log('\n4. Sending Test Email...');
    try {
        const info = await transporter.sendMail({
            from: `K-Track Debugger <${user}>`,
            to: admin || user, // Send to admin or self
            subject: 'K-Track Email Debug Test',
            text: 'If you are reading this, the K-Track email system is working correctly!',
            html: '<h3>✅ K-Track Email Test</h3><p>If you are reading this, the <strong>email system is working correctly</strong>!</p>'
        });
        console.log('✅ Email Sent Successfully!');
        console.log('   Message ID:', info.messageId);
        console.log('   Response:', info.response);
    } catch (error) {
        console.error('❌ Failed to send email:', error);
    }
}

debugEmail();
