const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendApprovalEmail = async (toEmail, userName) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: toEmail,
            subject: 'Welcome to K-Track - Account Approved! 🎉',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #4f46e5;">Welcome to K-Track!</h1>
                    </div>
                    <p>Hi <strong>${userName}</strong>,</p>
                    <p>Great news! Your account has been approved by the admin.</p>
                    <p>You can now log in to your dashboard to submit tasks, request quotes, and track your progress.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.CLIENT_URL || 'https://ktrack.vercel.app'}/login" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login to Dashboard</a>
                    </div>
                    <p>If you have any questions, feel free to reply to this email.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #888; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} K-Track Systems</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Approval email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending approval email:', error);
        return false;
    }
};

module.exports = { sendApprovalEmail };
