const { Resend } = require('resend');

// Email configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'karonjipaul.w@gmail.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev'; // Use your verified domain
const FROM_NAME = process.env.FROM_NAME || 'Paul From Ktrack';
const EMAIL_ENABLED = process.env.EMAIL_ENABLED !== 'false';

// Create Resend client
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// Verify configuration on startup
if (EMAIL_ENABLED && RESEND_API_KEY) {
    console.log('✅ Resend email service configured');
    console.log('📧 From:', `${FROM_NAME} <${FROM_EMAIL}>`);
} else {
    console.warn('⚠️  Email service disabled - RESEND_API_KEY not configured');
}

const EmailService = {
    async sendEmail({ to, subject, html, text }) {
        if (!EMAIL_ENABLED) {
            console.log('[Email] Skipped (disabled):', subject);
            return { success: false, message: 'Email service disabled' };
        }

        if (!RESEND_API_KEY || !resend) {
            console.error('[Email] CRITICAL: Missing RESEND_API_KEY');
            return { success: false, message: 'Email service not configured' };
        }

        try {
            console.log(`[Email] Sending via Resend to: ${to} | Subject: ${subject}`);

            const { data, error } = await resend.emails.send({
                from: `${FROM_NAME} <${FROM_EMAIL}>`,
                to: [to],
                subject,
                html,
                text: text || html.replace(/<[^>]*>/g, '')
            });

            if (error) {
                console.error('[Email] ❌ Resend error:', error);
                return { success: false, error: error.message };
            }

            console.log(`[Email] ✅ Success! ID: ${data.id}`);
            return { success: true, messageId: data.id };
        } catch (error) {
            console.error('[Email] ❌ FAILED:', error.message);
            return { success: false, error: error.message };
        }
    },

    async notifyAdmin({ subject, html, text }) {
        return this.sendEmail({
            to: ADMIN_EMAIL,
            subject: `[Admin] ${subject}`,
            html,
            text
        });
    },

    async notifyClient({ to, subject, html, text }) {
        return this.sendEmail({
            to,
            subject,
            html,
            text
        });
    },

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

    async sendTestEmail(to) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4F46E5;">🎉 Email Test Successful!</h2>
                <p>Your K-Track email notification system is working correctly via Resend.</p>
                <p><strong>Configuration:</strong></p>
                <ul>
                    <li>From: ${FROM_NAME}</li>
                    <li>Admin Email: ${ADMIN_EMAIL}</li>
                    <li>Service: Resend</li>
                </ul>
                <hr style="border: 1px solid #E5E7EB; margin: 20px 0;">
                <p style="color: #6B7280; font-size: 12px;">
                    K-Track Task Management System
                </p>
            </div>
        `;

        return this.sendEmail({
            to,
            subject: 'Test Email - K-Track Notifications (Resend)',
            html
        });
    }
};

module.exports = EmailService;
