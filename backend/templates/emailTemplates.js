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
                <h3 style="margin: 0 0 10px 0; color: #111827;">${task.client_name || clientName}'s Request</h3>
                <p style="margin: 0 0 10px 0; color: #4b5563;">${task.task_description}</p>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Quantity: ${task.quantity || 1} • Expected: $${task.expected_amount}</p>
            </div>
            <div style="text-align: center;">
                <a href="${CLIENT_URL}/dashboard" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Task</a>
            </div>
        `;
        return { subject: `📋 New Task from ${clientName}`, html: baseTemplate(content, title) };
    },

    newMessage: (senderName, messageText, taskId) => {
        const title = 'New Message';
        const content = `
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">You have a new message from <strong>${senderName}</strong> regarding Task #${taskId}.</p>
            <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #22c55e;">
                <p style="margin: 0; color: #1f2937; font-style: italic;">"${messageText}"</p>
            </div>
            <div style="text-align: center;">
                <a href="${CLIENT_URL}/dashboard" style="display: inline-block; background-color: #22c55e; color: #ffffff; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600;">Reply Now</a>
            </div>
        `;
        return { subject: `💬 New Message from ${senderName}`, html: baseTemplate(content, title) };
    },

    newFileAdmin: (uploaderName, filename, taskId) => {
        const title = 'New File Uploaded';
        const content = `
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;"><strong>${uploaderName}</strong> uploaded a file to Task #${taskId}.</p>
            <div style="background-color: #eff6ff; border-radius: 8px; padding: 15px; margin-bottom: 24px; display: flex; align-items: center;">
                <span style="font-size: 24px; margin-right: 15px;">📎</span>
                <span style="font-weight: 600; color: #1f2937;">${filename}</span>
            </div>
            <div style="text-align: center;">
                <a href="${CLIENT_URL}/dashboard" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600;">View File</a>
            </div>
        `;
        return { subject: `📎 New File: ${filename}`, html: baseTemplate(content, title) };
    },

    // CLIENT NOTIFICATIONS

    taskReceived: (userName, task) => {
        const title = 'We Received Your Task';
        const content = `
            <p style="color: #374151; font-size: 16px;">Hi ${userName},</p>
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">Thanks for submitting your task! We've received it and are reviewing the details.</p>
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #111827;">Task Details:</h3>
                <p style="margin: 0; color: #4b5563;">${task.task_description}</p>
            </div>
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">We'll get back to you shortly with a quote or any questions.</p>
            <div style="text-align: center;">
                <a href="${CLIENT_URL}/dashboard" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600;">Track Status</a>
            </div>
        `;
        return { subject: `✅ Task Received (ID: ${task.id})`, html: baseTemplate(content, title) };
    },

    quoteSent: (userName, task, amount) => {
        const title = 'Quote Ready';
        const content = `
            <p style="color: #374151; font-size: 16px;">Hi ${userName},</p>
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">We've prepared a quote for your task request.</p>
            <div style="background-color: #f0fdf4; border-radius: 8px; padding: 24px; margin-bottom: 24px; text-align: center;">
                <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">Total Quote Amount</p>
                <div style="color: #15803d; font-size: 32px; font-weight: 700;">$${amount}</div>
            </div>
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">Please review and approve this quote to proceed.</p>
            <div style="text-align: center;">
                <a href="${CLIENT_URL}/dashboard" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600;">Review Quote</a>
            </div>
        `;
        return { subject: `💰 Quote for Task #${task.id}`, html: baseTemplate(content, title) };
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
                 <p style="margin: 0 0 10px 0; color: #1e3a8a; font-weight: 600;">Task #${task.id}</p>
                 <div style="font-size: 18px; font-weight: 700; color: #2563eb;">${displayStatus}</div>
            </div>
            <div style="text-align: center;">
                <a href="${CLIENT_URL}/dashboard" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Details</a>
            </div>
        `;
        return { subject: `🔄 Update: Task #${task.id} is ${displayStatus}`, html: baseTemplate(content, title) };
    },

    newFileClient: (userName, filename, taskId) => {
        const title = 'New Deliverable Ready';
        const content = `
            <p style="color: #374151; font-size: 16px;">Hi ${userName},</p>
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">We've just uploaded a new file for your task.</p>
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

    newMessageClient: (userName, messageText, taskId) => {
        const title = 'New Reply';
        const content = `
            <p style="color: #374151; font-size: 16px;">Hi ${userName},</p>
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">You have a new message regarding Task #${taskId}.</p>
            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #4f46e5;">
                <p style="margin: 0; color: #1f2937; font-style: italic;">"${messageText}"</p>
            </div>
            <div style="text-align: center;">
                <a href="${CLIENT_URL}/dashboard" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Conversation</a>
            </div>
        `;
        return { subject: `💬 New Message - Task #${taskId}`, html: baseTemplate(content, title) };
    }
};

module.exports = templates;
