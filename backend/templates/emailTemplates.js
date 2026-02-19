const CLIENT_URL = process.env.CLIENT_URL || 'https://ktrack.vercel.app';

const baseTemplate = (content, title) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 20px 0; text-align: center;">
            </td>
        </tr>
        <tr>
            <td style="padding: 0 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(to right, #4f46e5, #7c3aed); padding: 30px 40px; text-align: center;">
                            <img src="${CLIENT_URL}/logo.png" alt="K-Track Logo" style="height: 40px; margin-bottom: 10px; display: inline-block;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">${title}</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            ${content}
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">© ${new Date().getFullYear()} K-Track Task Management</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td style="padding: 20px 0; text-align: center;">
            </td>
        </tr>
    </table>
</body>
</html>
`;

const templates = {
    // ADMIN NOTIFICATIONS

    newRegistration: (user) => {
        const title = 'New Client Registration';
        const content = `
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">A new client has registered and is waiting for approval.</p>
            <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <table style="width: 100%;">
                    <tr>
                        <td style="padding: 4px 0; color: #6b7280; font-size: 14px;">Name:</td>
                        <td style="padding: 4px 0; color: #1f2937; font-weight: 600;">${user.full_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #6b7280; font-size: 14px;">Email:</td>
                        <td style="padding: 4px 0; color: #1f2937; font-weight: 600;">${user.email}</td>
                    </tr>
                </table>
            </div>
            <div style="text-align: center;">
                <a href="${CLIENT_URL}/dashboard" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600;">Review Application</a>
            </div>
        `;
        return { subject: `👤 New Client: ${user.full_name}`, html: baseTemplate(content, title) };
    },

    newTask: (task, clientName) => {
        const title = 'New Task Submitted';
        const content = `
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;"><strong>${clientName}</strong> has submitted a new task.</p>
            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 5px 0; color: #111827;">${task.task_name || 'Untitled Task'}</h3>
                <p style="margin: 0 0 10px 0; color: #4b5563; font-style: italic;">${task.client_name || clientName}</p>
                <div style="border-top: 1px solid #e5e7eb; padding-top: 10px; margin-top: 10px;">
                    <p style="margin: 0 0 10px 0; color: #374151;">${task.task_description}</p>
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Quantity: ${task.quantity || 1} • Expected: $${task.expected_amount}</p>
                </div>
            </div>
            <div style="text-align: center;">
                <a href="${CLIENT_URL}/dashboard" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Task</a>
            </div>
        `;
        return { subject: `📋 New Task: ${task.task_name || 'Untitled'} (${clientName})`, html: baseTemplate(content, title) };
    },

    newMessage: (senderName, messageText, taskId, taskName) => {
        const title = 'New Message';
        const content = `
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">You have a new message from <strong>${senderName}</strong> regarding <strong>${taskName || 'Task #' + taskId}</strong>.</p>
            <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #22c55e;">
                <p style="margin: 0; color: #1f2937; font-style: italic;">"${messageText}"</p>
            </div>
            <div style="text-align: center;">
                <a href="${CLIENT_URL}/dashboard" style="display: inline-block; background-color: #22c55e; color: #ffffff; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600;">Reply Now</a>
            </div>
        `;
        return { subject: `💬 Message: ${taskName || 'Task #' + taskId}`, html: baseTemplate(content, title) };
    },

    newFileAdmin: (uploaderName, filename, taskId, taskName) => {
        const title = 'New File Uploaded';
        const content = `
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;"><strong>${uploaderName}</strong> uploaded a file to <strong>${taskName || 'Task #' + taskId}</strong>.</p>
            <div style="background-color: #eff6ff; border-radius: 8px; padding: 15px; margin-bottom: 24px; display: flex; align-items: center;">
                <span style="font-size: 24px; margin-right: 15px;">📎</span>
                <span style="font-weight: 600; color: #1f2937;">${filename}</span>
            </div>
            <div style="text-align: center;">
                <a href="${CLIENT_URL}/dashboard" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600;">View File</a>
            </div>
        `;
        return { subject: `📎 New File: ${filename} (Task #${taskId})`, html: baseTemplate(content, title) };
    },

    // CLIENT NOTIFICATIONS

    taskReceived: (userName, task) => {
        const title = 'We Received Your Task';
        const content = `
            <p style="color: #374151; font-size: 16px;">Hi ${userName},</p>
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">Thanks for submitting your task! We've received it and are reviewing the details.</p>
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #111827;">${task.task_name || 'Untitled Task'}</h3>
                <p style="margin: 0; color: #4b5563;">${task.task_description}</p>
            </div>
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">We'll get back to you shortly with a quote or any questions.</p>
            <div style="text-align: center;">
                <a href="${CLIENT_URL}/dashboard" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600;">Track Status</a>
            </div>
        `;
        return { subject: `✅ Task Received: ${task.task_name || 'Task #' + task.id}`, html: baseTemplate(content, title) };
    },

    quoteSent: (userName, task, amount) => {
        const title = 'Quote Ready';
        const content = `
            <p style="color: #374151; font-size: 16px;">Hi ${userName},</p>
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">We've prepared a quote for <strong>${task.task_name || 'Task #' + task.id}</strong>.</p>
            <div style="background-color: #f0fdf4; border-radius: 8px; padding: 24px; margin-bottom: 24px; text-align: center;">
                <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Total Quote Amount</p>
                <div style="color: #15803d; font-size: 32px; font-weight: 700;">$${amount}</div>
            </div>
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">Please review and approve this quote to proceed.</p>
            <div style="text-align: center;">
                <a href="${CLIENT_URL}/dashboard" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600;">Review Quote</a>
            </div>
        `;
        return { subject: `💰 Quote for ${task.task_name || 'Task #' + task.id}`, html: baseTemplate(content, title) };
    },

    taskStatusUpdate: (userName, task, status) => {
        const statusMap = {
            'in_progress': 'In Progress 🚧',
            'review': 'Under Review 👁️',
            'completed': 'Completed ✅',
            'approved': 'Approved 👍'
        };
        const displayStatus = statusMap[status] || status;
        const title = 'Task Update';
        const content = `
            <p style="color: #374151; font-size: 16px;">Hi ${userName},</p>
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">Your task status has been updated.</p>
            <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
                 <p style="margin: 0 0 10px 0; color: #1e3a8a; font-weight: 600;">${task.task_name || 'Task #' + task.id}</p>
                 <div style="font-size: 18px; font-weight: 700; color: #2563eb;">${displayStatus}</div>
            </div>
            <div style="text-align: center;">
                <a href="${CLIENT_URL}/dashboard" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Details</a>
            </div>
        `;
        return { subject: `🔄 Update: ${task.task_name || 'Task #' + task.id} is ${displayStatus}`, html: baseTemplate(content, title) };
    },

    newFileClient: (userName, filename, taskId, taskName) => {
        const title = 'New Deliverable Ready';
        const content = `
            <p style="color: #374151; font-size: 16px;">Hi ${userName},</p>
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">We've just uploaded a new file for <strong>${taskName || 'Task #' + taskId}</strong>.</p>
            <div style="background-color: #fce7f3; border-radius: 8px; padding: 15px; margin-bottom: 24px; display: flex; align-items: center; border-left: 4px solid #db2777;">
                <span style="font-size: 24px; margin-right: 15px;">📦</span>
                <span style="font-weight: 600; color: #1f2937;">${filename}</span>
            </div>
            <div style="text-align: center;">
                <a href="${CLIENT_URL}/dashboard" style="display: inline-block; background-color: #db2777; color: #ffffff; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600;">Download File</a>
            </div>
        `;
        return { subject: `📦 New File: ${filename}`, html: baseTemplate(content, title) };
    },

    newMessageClient: (userName, messageText, taskId, taskName) => {
        const title = 'New Reply';
        const content = `
            <p style="color: #374151; font-size: 16px;">Hi ${userName},</p>
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">You have a new message regarding <strong>${taskName || 'Task #' + taskId}</strong>.</p>
            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #4f46e5;">
                <p style="margin: 0; color: #1f2937; font-style: italic;">"${messageText}"</p>
            </div>
            <div style="text-align: center;">
                <a href="${CLIENT_URL}/dashboard" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Conversation</a>
            </div>
        `;
        return { subject: `\u{1F4AC} New Message: ${taskName || 'Task #' + taskId}`, html: baseTemplate(content, title) };
    },

    // Sent to the NEW USER immediately after registration
    registrationConfirmation: (user) => {
        const title = 'We Received Your Registration \u2705';
        const content = `
            <p style="color: #374151; font-size: 16px;">Hi <strong>${user.full_name}</strong>,</p>
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">
                Thank you for registering with K-Track! We've received your account request and it's now <strong>pending review</strong> by our admin team.
            </p>
            <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #22c55e;">
                <p style="margin: 0 0 6px 0; font-weight: 700; color: #15803d; font-size: 15px;">What happens next?</p>
                <ul style="margin: 0; padding-left: 18px; color: #374151; font-size: 14px; line-height: 1.8;">
                    <li>Our admin will review your registration details</li>
                    <li>Once approved, you'll receive another email with a login link</li>
                    <li>You can then log in and start submitting tasks</li>
                </ul>
            </div>
            <div style="background-color: #eff6ff; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <table style="width: 100%;">
                    <tr>
                        <td style="padding: 3px 0; color: #6b7280; font-size: 13px; width: 70px;">Name:</td>
                        <td style="padding: 3px 0; color: #1f2937; font-weight: 600; font-size: 13px;">${user.full_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 3px 0; color: #6b7280; font-size: 13px;">Email:</td>
                        <td style="padding: 3px 0; color: #1f2937; font-weight: 600; font-size: 13px;">${user.email}</td>
                    </tr>
                    <tr>
                        <td style="padding: 3px 0; color: #6b7280; font-size: 13px;">Status:</td>
                        <td style="padding: 3px 0; font-size: 13px;"><span style="background-color: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 12px; font-weight: 600;">Pending Approval</span></td>
                    </tr>
                </table>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
                If you didn't create this account, please ignore this email or contact us immediately.
            </p>
        `;
        return { subject: `\u2705 Registration Received \u2014 K-Track`, html: baseTemplate(content, title) };
    },

    // Sent to CLIENT when admin creates/assigns a task to them
    taskAssigned: (userName, task) => {
        const title = 'A New Task Has Been Added for You';
        const content = `
            <p style="color: #374151; font-size: 16px;">Hi <strong>${userName}</strong>,</p>
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">
                Your account manager has added a new task to your dashboard. Here are the details:
            </p>
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #4f46e5;">
                <h3 style="margin: 0 0 8px 0; color: #111827; font-size: 16px;">${task.task_name || 'New Task'}</h3>
                <p style="margin: 0 0 12px 0; color: #4b5563; font-size: 14px; line-height: 1.6;">${task.task_description || ''}</p>
                ${task.expected_amount ? `<p style="margin: 0; color: #6b7280; font-size: 13px;">Expected amount: <strong>$${task.expected_amount}</strong></p>` : ''}
            </div>
            <p style="color: #374151; font-size: 15px; margin-bottom: 24px;">
                Log in to your dashboard to view the full details, ask questions, or track the progress.
            </p>
            <div style="text-align: center;">
                <a href="${CLIENT_URL}/dashboard" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600;">View My Dashboard</a>
            </div>
        `;
        return { subject: `📋 New Task Added: ${task.task_name || 'New Task'}`, html: baseTemplate(content, title) };
    },

    // Sent to CLIENT when admin rejects their registration
    accountRejected: (userName) => {
        const title = 'Update on Your K-Track Registration';
        const content = `
            <p style="color: #374151; font-size: 16px;">Hi <strong>${userName}</strong>,</p>
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">
                Thank you for your interest in K-Track. After reviewing your registration, we're unable to approve your account at this time.
            </p>
            <div style="background-color: #fef2f2; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #ef4444;">
                <p style="margin: 0; color: #7f1d1d; font-size: 14px; line-height: 1.6;">
                    This may be due to incomplete information or eligibility requirements. If you believe this is a mistake or would like more information, please reach out to us directly.
                </p>
            </div>
            <p style="color: #374151; font-size: 14px; margin-bottom: 24px;">
                You can contact us at <a href="mailto:${process.env.ADMIN_EMAIL || 'karonjipaul.w@gmail.com'}" style="color: #4f46e5;">${process.env.ADMIN_EMAIL || 'karonjipaul.w@gmail.com'}</a> to discuss further.
            </p>
        `;
        return { subject: `K-Track Registration Update`, html: baseTemplate(content, title) };
    },

    // Sent to CLIENT when admin suspends their account
    accountSuspended: (userName) => {
        const title = 'Your Account Has Been Suspended';
        const content = `
            <p style="color: #374151; font-size: 16px;">Hi <strong>${userName}</strong>,</p>
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">
                We're writing to let you know that your K-Track account has been temporarily suspended by an administrator.
            </p>
            <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">
                    While suspended, you will not be able to log in or access your dashboard. If you believe this is an error, please contact us.
                </p>
            </div>
            <p style="color: #374151; font-size: 14px; margin-bottom: 0;">
                Reach us at <a href="mailto:${process.env.ADMIN_EMAIL || 'karonjipaul.w@gmail.com'}" style="color: #4f46e5;">${process.env.ADMIN_EMAIL || 'karonjipaul.w@gmail.com'}</a>.
            </p>
        `;
        return { subject: `⚠️ K-Track Account Suspended`, html: baseTemplate(content, title) };
    },

    // Sent to CLIENT when admin reactivates their account
    accountReactivated: (userName) => {
        const title = 'Your Account Has Been Reactivated 🎉';
        const content = `
            <p style="color: #374151; font-size: 16px;">Hi <strong>${userName}</strong>,</p>
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">
                Great news — your K-Track account has been reactivated. You can now log in and access your dashboard normally.
            </p>
            <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #22c55e;">
                <p style="margin: 0; color: #15803d; font-size: 14px; line-height: 1.6;">
                    All your tasks, messages, and files are exactly as you left them.
                </p>
            </div>
            <div style="text-align: center;">
                <a href="${CLIENT_URL}/login" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600;">Log In Now</a>
            </div>
        `;
        return { subject: `✅ K-Track Account Reactivated`, html: baseTemplate(content, title) };
    }
};

module.exports = templates;
