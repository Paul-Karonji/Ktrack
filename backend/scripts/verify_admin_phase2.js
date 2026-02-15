const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../config/database');

const API_URL = 'http://localhost:3001/api';

async function getCsrfCtx() {
    try {
        const res = await axios.get(`${API_URL}/csrf-token`);
        return {
            csrfToken: res.data.csrfToken,
            cookies: res.headers['set-cookie']
        };
    } catch (e) {
        return { csrfToken: null, cookies: [] };
    }
}

async function makeAdmin(email) {
    await pool.query('UPDATE users SET role = ?, status = ? WHERE email = ?', ['admin', 'approved', email]);
}

async function verifyAdmin() {
    console.log('--- Admin Capability Verification Phase 2 ---');
    try {
        const ctx = await getCsrfCtx();
        const headers = {
            'X-CSRF-Token': ctx.csrfToken,
            'Cookie': ctx.cookies
        };

        const adminEmail = `admin_check_ph2_${Date.now()}@example.com`;
        const password = 'Password123!';

        // Register Admin
        await axios.post(`${API_URL}/auth/register`, {
            email: adminEmail,
            password,
            fullName: 'Admin Verify 2',
            role: 'client'
        }, { headers });
        await makeAdmin(adminEmail);

        // Login Admin
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: adminEmail,
            password
        }, { headers });

        const adminHeaders = {
            Authorization: `Bearer ${loginRes.data.accessToken}`,
            'X-CSRF-Token': ctx.csrfToken,
            'Cookie': [...(ctx.cookies || []), ...(loginRes.headers['set-cookie'] || [])]
        };

        // 4. Verify Admin access to existing tasks (Cross-Tenant)
        // Get latest task ID that is NOT owned by this admin
        const [rows] = await pool.execute('SELECT id FROM tasks WHERE client_id != ? ORDER BY id DESC LIMIT 1', [loginRes.data.user.id]);

        if (rows.length > 0) {
            const taskId = rows[0].id;
            console.log(`Testing access to existing task ID: ${taskId}`);

            // 1. Admin sends message
            try {
                await axios.post(`${API_URL}/messages/tasks/${taskId}`, {
                    message: 'Admin message to existing task'
                }, { headers: adminHeaders });
                console.log('✅ Admin sent message');
            } catch (e) {
                console.log('❌ Admin failed to send message:', e.response ? e.response.status : e.message);
            }

            // 2. Admin reads messages
            try {
                await axios.get(`${API_URL}/messages/tasks/${taskId}`, { headers: adminHeaders });
                console.log('✅ Admin read messages');
            } catch (e) {
                console.log('❌ Admin failed to read messages:', e.response ? e.response.status : e.message);
            }

            // 3. Admin lists files
            try {
                await axios.get(`${API_URL}/tasks/${taskId}/files`, { headers: adminHeaders });
                console.log('✅ Admin listed files');
            } catch (e) {
                console.log('❌ Admin failed to list files:', e.response ? e.response.status : e.message);
            }
        } else {
            console.log('⚠️  No existing tasks found to test cross-tenant access');
        }

    } catch (e) {
        console.error('Setup failed:', e.message);
        if (e.response) console.error(JSON.stringify(e.response.data));
    } finally {
        await pool.end();
    }
}

verifyAdmin();
