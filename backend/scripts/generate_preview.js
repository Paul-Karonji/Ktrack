const fs = require('fs');
const path = require('path');
const templates = require('../templates/emailTemplates');

// Dummy data for preview
const user = {
    full_name: 'John Doe',
    email: 'john.doe@example.com'
};

const { html } = templates.newRegistration(user);

const outputPath = path.resolve(__dirname, 'preview_registration.html');
fs.writeFileSync(outputPath, html);

console.log(`Preview generated at: ${outputPath}`);
