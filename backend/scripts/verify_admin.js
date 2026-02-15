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
    console.log('--- Admin Capability Verification ---');
    try {
        const ctx = await getCsrfCtx();
        const headers = {
            'X-CSRF-Token': ctx.csrfToken,
            'Cookie': ctx.cookies
        };

        const adminEmail = `admin_verify_${Date.now()}@example.com`;
        const password = 'Password123!';

        // Register
        await axios.post(`${API_URL}/auth/register`, {
            email: adminEmail,
            password,
            fullName: 'Admin Verify',
            role: 'client' // Will upgrade
        }, { headers });

        // Make Admin
        await makeAdmin(adminEmail);

        // Login
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: adminEmail,
            password
        }, { headers });

        const adminHeaders = {
            Authorization: `Bearer ${loginRes.data.accessToken}`,
            'X-CSRF-Token': ctx.csrfToken,
            'Cookie': [...(ctx.cookies || []), ...(loginRes.headers['set-cookie'] || [])]
        };

        // 1. Create Task (as admin, or just find one)
        // Let's create a dummy task to verify we can toggle it
        const taskRes = await axios.post(`${API_URL}/tasks`, {
            taskName: 'Admin Task',
            taskDescription: 'Admin verify task',
            clientName: 'Some Client',
            expectedAmount: 100
        }, { headers: adminHeaders });
        const taskId = taskRes.data.id;
        console.log(`Admin Task Created: ${taskId}`);

        // 2. Toggle Payment (Should succeed)
        try {
            await axios.patch(`${API_URL}/tasks/${taskId}/toggle-payment`, {}, { headers: adminHeaders });
            console.log('✅ Admin successfully toggled payment (Access Granted)');
        } catch (e) {
            console.log('❌ Admin failed to toggle payment:', e.response ? e.response.status : e.message);
        }

        // 3. Delete a user (Create dummy victim first)
        const victimEmail = `victim_del_${Date.now()}@example.com`;
        const victimRes = await axios.post(`${API_URL}/auth/register`, {
            email: victimEmail,
            password: 'Password123!',
            fullName: 'Victim User'
        }, { headers });
        const victimId = victimRes.data.user.id;

        try {
            await axios.delete(`${API_URL}/auth/users/${victimId}`, { headers: adminHeaders });
            console.log('✅ Admin successfully deleted user (Access Granted)');
        } catch (e) {
            console.log('❌ Admin failed to delete user:', e.response ? e.response.status : e.message);
        }

    } catch (e) {
        console.error('Setup failed:', e.message);
    } finally {
        await pool.end();
    }
}

verifyAdmin();
