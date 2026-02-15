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

async function approveUser(email) {
    await pool.query('UPDATE users SET status = ? WHERE email = ?', ['approved', email]);
}

async function repro() {
    console.log('--- Notifications API Reproduction ---');
    try {
        const ctx = await getCsrfCtx();
        const headers = {
            'X-CSRF-Token': ctx.csrfToken,
            'Cookie': ctx.cookies
        };

        const email = `notif_test_${Date.now()}@example.com`;
        const password = 'Password123!';

        console.log(`Registering ${email}...`);
        await axios.post(`${API_URL}/auth/register`, {
            email,
            password,
            fullName: 'Notif Tester',
            role: 'client'
        }, { headers });

        await approveUser(email);

        console.log(`Logging in...`);
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email,
            password
        }, { headers });

        const authHeaders = {
            Authorization: `Bearer ${loginRes.data.accessToken}`,
            'X-CSRF-Token': ctx.csrfToken,
            'Cookie': [...(ctx.cookies || []), ...(loginRes.headers['set-cookie'] || [])]
        };

        console.log('Testing GET /api/notifications/unread-count...');
        try {
            const countRes = await axios.get(`${API_URL}/notifications/unread-count`, { headers: authHeaders });
            console.log('✅ Unread Count:', countRes.data);
        } catch (e) {
            console.log('❌ Unread Count Failed:', e.response ? e.response.status : e.message);
            if (e.response) console.log('Response:', e.response.data);
        }

        console.log('Testing GET /api/notifications...');
        try {
            const listRes = await axios.get(`${API_URL}/notifications`, { headers: authHeaders });
            console.log('✅ Notifications List:', listRes.data);
        } catch (e) {
            console.log('❌ Notifications List Failed:', e.response ? e.response.status : e.message);
            if (e.response) console.log('Response:', e.response.data);
        }

    } catch (err) {
        console.error('Setup failed:', err.message);
        if (err.response) console.error(JSON.stringify(err.response.data));
    } finally {
        await pool.end();
    }
}

repro();
