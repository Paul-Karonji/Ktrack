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
    console.log('--- IDOR Task Modification Reproduction ---');
    try {
        // 1. Setup Accounts
        const attackerCtx = await createAccount('attacker_task');
        const victimCtx = await createAccount('victim_task');

        // 2. Victim creates a task
        console.log('Victim creating a task...');
        const taskRes = await axios.post(`${API_URL}/tasks`, {
            taskName: 'Victim Task',
            taskDescription: 'Secret task',
            expectedAmount: 100
        }, { headers: victimCtx.headers });

        const taskId = taskRes.data.id;
        console.log(`Task Created. ID: ${taskId}`);

        // 3. Attacker tries to Modify Task status
        console.log(`Attacker attempting to PUT /api/tasks/${taskId}...`);
        try {
            await axios.put(`${API_URL}/tasks/${taskId}`, {
                status: 'completed'
            }, { headers: attackerCtx.headers });
            console.log('❌ VULNERABILITY CONFIRMED: Attacker successfully modified the task status!');
        } catch (err) {
            if (err.response && err.response.status === 403) {
                console.log('✅ FIX VERIFIED: Server returned 403 Forbidden on Update.');
            } else {
                console.log(`❓ Update failed with: ${err.response ? err.response.status : err.message}`);
                // if(err.response) console.log(err.response.data);
            }
        }

        // 4. Attacker tries to Toggle Payment
        console.log(`Attacker attempting to PATCH /api/tasks/${taskId}/toggle-payment...`);
        try {
            await axios.patch(`${API_URL}/tasks/${taskId}/toggle-payment`, {}, { headers: attackerCtx.headers });
            console.log('❌ VULNERABILITY CONFIRMED: Attacker successfully toggled payment status!');
        } catch (err) {
            if (err.response && err.response.status === 403) {
                console.log('✅ FIX VERIFIED: Server returned 403 Forbidden on Toggle Payment.');
            } else {
                console.log(`❓ Toggle Payment failed with: ${err.response ? err.response.status : err.message}`);
                // if(err.response) console.log(err.response.data);
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
    const ctx = await getCsrfCtx();
    const headers = {
        'X-CSRF-Token': ctx.csrfToken,
        'Cookie': ctx.cookies
    };

    const email = `${prefix}_${Date.now()}@example.com`;
    const password = 'Password123!';

    await axios.post(`${API_URL}/auth/register`, {
        email,
        password,
        fullName: 'Test User',
        role: 'client'
    }, { headers });

    // Force approve
    await approveUser(email);

    const loginRes = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
    }, { headers });

    // Combine cookies
    const loginCookies = loginRes.headers['set-cookie'] || [];
    const combinedCookies = [...(ctx.cookies || []), ...loginCookies];

    return {
        id: loginRes.data.user.id,
        headers: {
            Authorization: `Bearer ${loginRes.data.accessToken}`,
            'X-CSRF-Token': ctx.csrfToken,
            'Cookie': combinedCookies
        }
    };
}

repro();
