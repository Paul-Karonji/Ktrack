const nodemailer = require('nodemailer');

// Email configuration
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'karonjipaul.w@gmail.com';
const FROM_NAME = process.env.FROM_NAME || 'Paul From Ktrack';
const EMAIL_ENABLED = process.env.EMAIL_ENABLED !== 'false'; // Default enabled

// Create transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
    }
});

// Verify connection on startup
if (EMAIL_ENABLED && EMAIL_USER && EMAIL_PASS) {
    transporter.verify((error, success) => {
        if (error) {
            console.error('❌ Email service configuration error:', error.message);
        } else {
            console.log('✅ Email service ready');
        }
    });
} else {
    console.warn('⚠️  Email service disabled - EMAIL_USER or EMAIL_PASS not configured');
}

const EmailService = {
    /**
     * Send email
     * @param {Object} options - Email options
     * @param {string} options.to - Recipient email
     * @param {string} options.subject - Email subject
     * @param {string} options.html - HTML content
     * @param {string} options.text - Plain text content (optional)
     */
    async sendEmail({ to, subject, html, text }) {
        if (!EMAIL_ENABLED) {
            console.log('[Email] Skipped (disabled):', subject);
            return { success: false, message: 'Email service disabled' };
        }

        if (!EMAIL_USER || !EMAIL_PASS) {
            console.error('[Email] Missing credentials');
            return { success: false, message: 'Email credentials not configured' };
        }

        try {
            const mailOptions = {
                from: `"${FROM_NAME}" <${EMAIL_USER}>`,
                to,
                subject,
                html,
                text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for plain text fallback
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('✅ Email sent:', subject, 'to', to);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Email send failed:', error.message);
            return { success: false, error: error.message };
        }
    },

    /**
     * Send notification to admin
     */
    async notifyAdmin({ subject, html, text }) {
        return this.sendEmail({
            to: ADMIN_EMAIL,
            subject: `[Admin] ${subject}`,
            html,
            text
        });
    },

    /**
     * Send notification to client
     */
    async notifyClient({ to, subject, html, text }) {
        return this.sendEmail({
            to,
            subject, // Let the caller define the full subject 
            html,
            text
        });
    },

    /**
     * Send approval email (Legacy support / specific helper)
     */
    async sendApprovalEmail(toEmail, userName) {
        const subject = 'Welcome to K-Track - Account Approved! 🎉';
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h1 style="color: #4f46e5;">Welcome to K-Track!</h1>
                </div>
                <p>Hi <strong>${userName}</strong>,</p>
                <p>Great news! Your account has been approved.</p>
                <p>You can now log in to your dashboard to submit tasks, request quotes, and track your progress.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.CLIENT_URL || 'https://ktrack.vercel.app'}/login" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login to Dashboard</a>
                </div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #888; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} K-Track</p>
            </div>
       `;
        return this.notifyClient({ to: toEmail, subject, html });
    },

    /**
     * Test email
     */
    async sendTestEmail(to) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4F46E5;">🎉 Email Test Successful!</h2>
                <p>Your K-Track email notification system is working correctly.</p>
                <p><strong>Configuration:</strong></p>
                <ul>
                    <li>From: ${FROM_NAME}</li>
                    <li>Admin Email: ${ADMIN_EMAIL}</li>
                    <li>Service: Gmail SMTP</li>
                </ul>
                <hr style="border: 1px solid #E5E7EB; margin: 20px 0;">
                <p style="color: #6B7280; font-size: 12px;">
                    K-Track Task Management System
                </p>
            </div>
        `;

        return this.sendEmail({
            to,
            subject: 'Test Email - K-Track Notifications',
            html
        });
    }
};

module.exports = EmailService;
