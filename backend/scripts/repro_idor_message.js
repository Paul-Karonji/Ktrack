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
    console.log('--- IDOR Messaging Reproduction ---');
    try {
        // 1. Setup Accounts
        const attackerCtx = await createAccount('attacker_msg');
        const victimCtx = await createAccount('victim_msg');

        // 2. Victim creates a task
        console.log('Victim creating a task...');
        const taskRes = await axios.post(`${API_URL}/tasks`, {
            taskName: 'Victim Secret Task',
            taskDescription: 'Discussing proprietary secrets',
            expectedAmount: 500
        }, { headers: victimCtx.headers });
        const taskId = taskRes.data.id;
        console.log(`Task Created. ID: ${taskId}`);

        // 3. Victim sends a message
        console.log('Victim sending a message...');
        await axios.post(`${API_URL}/messages/tasks/${taskId}`, {
            message: 'This is a secret message only for me and admin.'
        }, { headers: victimCtx.headers });

        // 4. Attacker tries to Read Messages
        console.log(`Attacker attempting to GET /api/messages/tasks/${taskId}...`);
        try {
            const res = await axios.get(`${API_URL}/messages/tasks/${taskId}`, { headers: attackerCtx.headers });
            console.log('❌ VULNERABILITY CONFIRMED: Attacker read messages!');
            console.log('Messages:', JSON.stringify(res.data, null, 2));
        } catch (err) {
            if (err.response && err.response.status === 403) {
                console.log('✅ FIX VERIFIED: Server returned 403 Forbidden on Read.');
            } else {
                console.log(`❓ Read failed with: ${err.response ? err.response.status : err.message}`);
            }
        }

        // 5. Attacker tries to Send Message
        console.log(`Attacker attempting to POST /api/messages/tasks/${taskId}...`);
        try {
            await axios.post(`${API_URL}/messages/tasks/${taskId}`, {
                message: 'I am reading your secrets!'
            }, { headers: attackerCtx.headers });
            console.log('❌ VULNERABILITY CONFIRMED: Attacker sent a message!');
        } catch (err) {
            if (err.response && err.response.status === 403) {
                console.log('✅ FIX VERIFIED: Server returned 403 Forbidden on Send.');
            } else {
                console.log(`❓ Send failed with: ${err.response ? err.response.status : err.message}`);
            }
        }

    } catch (err) {
        console.error('Setup failed:', err.message);
        if (err.response) console.error(JSON.stringify(err.response.data));
    } finally {
        await pool.end();
    }
}

async function createAccount(prefix) {
    console.log(`[${prefix}] Getting CSRF...`);
    const ctx = await getCsrfCtx();
    const headers = {
        'X-CSRF-Token': ctx.csrfToken,
        'Cookie': ctx.cookies
    };

    const email = `${prefix}_${Date.now()}@example.com`;
    const password = 'Password123!';

    console.log(`[${prefix}] Registering ${email}...`);
    try {
        await axios.post(`${API_URL}/auth/register`, {
            email,
            password,
            fullName: 'Test User',
            role: 'client'
        }, { headers });
    } catch (e) {
        console.error(`[${prefix}] Register failed:`, e);
        throw e;
    }

    console.log(`[${prefix}] Approving...`);
    await approveUser(email);

    console.log(`[${prefix}] Logging in...`);
    try {
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email,
            password
        }, { headers });

        const combinedCookies = [...(ctx.cookies || []), ...(loginRes.headers['set-cookie'] || [])];

        return {
            id: loginRes.data.user.id,
            headers: {
                Authorization: `Bearer ${loginRes.data.accessToken}`,
                'X-CSRF-Token': ctx.csrfToken,
                'Cookie': combinedCookies
            }
        };
    } catch (e) {
        console.error(`[${prefix}] Login failed:`, e.response ? e.response.data : e.message);
        throw e;
    }
}

repro();
