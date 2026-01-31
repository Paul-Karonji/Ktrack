require('dotenv').config({ path: '../.env' });
const { pool } = require('../config/database');
const User = require('../models/User');
const bcrypt = require('bcrypt');

async function seedUsers() {
    try {
        console.log('🌱 Seeding Users...');

        // 1. Ensure Admin Exists
        const [admins] = await pool.execute('SELECT * FROM users WHERE role = "admin" LIMIT 1');
        let adminUser;
        if (admins.length === 0) {
            console.log('Creating Admin user...');
            adminUser = await User.create({
                email: 'admin@demo.com',
                password: 'password123',
                fullName: 'Demo Admin',
                phoneNumber: '555-0100',
                course: 'N/A',
                role: 'admin'
            });
            console.log('✅ Admin created: admin@demo.com / password123');
        } else {
            console.log('ℹ️ Admin already exists');
        }

        // 2. Ensure Client Exists
        const [clients] = await pool.execute('SELECT * FROM users WHERE email = "client@demo.com" LIMIT 1');
        if (clients.length === 0) {
            console.log('Creating Client user...');
            // User.create sets status to 'pending' by default for clients
            // We want this demo client to be 'approved' immediately so they can log in
            const client = await User.create({
                email: 'client@demo.com',
                password: 'password123',
                fullName: 'Demo Client',
                phoneNumber: '555-0101',
                course: 'Computer Science',
                role: 'client'
            });

            // Manually approve
            await pool.execute('UPDATE users SET status = "approved" WHERE id = ?', [client.id]);
            console.log('✅ Client created and approved: client@demo.com / password123');
        } else {
            console.log('ℹ️ Client already exists (client@demo.com)');
        }

        console.log('✨ Seeding complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seedUsers();
