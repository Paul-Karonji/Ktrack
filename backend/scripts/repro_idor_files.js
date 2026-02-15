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
    console.log('--- IDOR File Reproduction ---');
    try {
        // 1. Setup Accounts
        const attackerCtx = await createAccount('attacker_file');
        const victimCtx = await createAccount('victim_file');

        // 2. Victim creates a task
        console.log('Victim creating a task...');
        const taskRes = await axios.post(`${API_URL}/tasks`, {
            taskName: 'Victim File Task',
            taskDescription: 'Task with sensitive files',
            expectedAmount: 500
        }, { headers: victimCtx.headers });
        const taskId = taskRes.data.id;
        console.log(`Task Created. ID: ${taskId}`);

        // Note: For file upload, we'd need a valid file logic, but we can try listing files first on an empty task
        // or just assume if we can list, we are vulnerable.
        // Actually, let's try to query files for that task.

        // 3. Attacker tries to List Files for Victim Task
        // The endpoint is likely /api/files?taskId=ID or /api/tasks/:id/files
        // Checking routes/files.js -> GET / -> uses getAllFiles with filters
        // Checking routes/tasks.js -> GET /:taskId/files -> FileController.getTaskFiles

        console.log(`Attacker attempting to GET /api/tasks/${taskId}/files...`);
        try {
            const res = await axios.get(`${API_URL}/tasks/${taskId}/files`, { headers: attackerCtx.headers });
            console.log('❌ VULNERABILITY CONFIRMED: Attacker listed files!');
            // console.log('Files:', res.data);
        } catch (err) {
            if (err.response && err.response.status === 403) {
                console.log('✅ FIX VERIFIED: Server returned 403 Forbidden on List Files.');
            } else {
                console.log(`❓ List failed with: ${err.response ? err.response.status : err.message}`);
                // if (err.response) console.log(err.response.data);
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

    await approveUser(email);

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
}

repro();
