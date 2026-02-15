const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../config/database');

const API_URL = 'http://localhost:3001/api';

// Helper to get CSRF token and cookies
async function getCsrfCtx() {
    try {
        const res = await axios.get(`${API_URL}/csrf-token`);
        const csrfToken = res.data.csrfToken;
        const cookies = res.headers['set-cookie'];
        return { csrfToken, cookies };
    } catch (e) {
        console.error('Failed to get CSRF token:', e.message);
        return { csrfToken: null, cookies: [] };
    }
}

async function approveUser(email) {
    // console.log(`[DB] Approving user ${email}...`);
    await pool.query('UPDATE users SET status = ? WHERE email = ?', ['approved', email]);
}

async function repro() {
    console.log('--- IDOR User Deletion Reproduction ---');
    try {
        // 1. Get CSRF Context
        const ctx = await getCsrfCtx();
        // console.log('CSRF Token:', ctx.csrfToken);

        const headers = {
            'X-CSRF-Token': ctx.csrfToken,
            'Cookie': ctx.cookies
        };

        // 2. Create Attacker Account
        const attackerEmail = `attacker_${Date.now()}@example.com`;
        const attackerPassword = 'Password123!';
        console.log(`Creating attacker: ${attackerEmail}`);

        await axios.post(`${API_URL}/auth/register`, {
            email: attackerEmail,
            password: attackerPassword,
            fullName: 'Attacker User',
            role: 'client'
        }, { headers });

        // FORCE APPROVE ATTACKER
        await approveUser(attackerEmail);

        // 3. Login to get access token (and maybe new cookies?)
        // Reuse headers which contain CSRF cookie
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: attackerEmail,
            password: attackerPassword
        }, { headers });

        const token = loginRes.data.accessToken;
        // Merge login cookies if any (unlikely for stateless JWT but maybe refresh token)
        const loginCookies = loginRes.headers['set-cookie'] || [];
        const combinedCookies = [...(ctx.cookies || []), ...loginCookies];

        const authHeaders = {
            Authorization: `Bearer ${token}`,
            'X-CSRF-Token': ctx.csrfToken, // CSRF token usually stays valid for session
            'Cookie': combinedCookies
        };

        // 4. Create Victim Account
        // We can use same CSRF context for registration loop or get new one. 
        // Let's reuse for simplicity, or just use DB to create victim to avoid hassle?
        // Let's use API to be "real".
        const victimEmail = `victim_${Date.now()}@example.com`;
        console.log(`Creating victim: ${victimEmail}`);
        const victimRes = await axios.post(`${API_URL}/auth/register`, {
            email: victimEmail,
            password: 'Password123!',
            fullName: 'Victim User'
        }, { headers }); // Use initial headers for registration

        const victimId = victimRes.data.user.id;
        console.log(`Victim ID: ${victimId}`);

        // 5. Attacker tries to delete Victim
        console.log(`Attacker (Client) attempting to DELETE user ${victimId}...`);
        try {
            await axios.delete(`${API_URL}/auth/users/${victimId}`, { headers: authHeaders });
            console.log('❌ VULNERABILITY CONFIRMED: Attacker successfully deleted the victim!');
        } catch (err) {
            if (err.response && err.response.status === 403) {
                console.log('✅ FIX VERIFIED: Server returned 403 Forbidden.');
            } else {
                console.log(`❓ Unexpected response: ${err.response ? err.response.status : err.message}`);
                if (err.response) console.log(JSON.stringify(err.response.data));
            }
        }

    } catch (err) {
        console.error('Setup failed:', err.message);
        if (err.response) console.error(JSON.stringify(err.response.data));
    } finally {
        await pool.end();
    }
}

repro();
