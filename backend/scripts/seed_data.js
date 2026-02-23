const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const User = require('../models/User');
const GuestClient = require('../models/GuestClient');
const { testConnection, pool } = require('../config/database');

async function seed() {
    try {
        await testConnection();
        console.log('🌱 Starting seeding process...');

        const clients = [
            {
                email: 'john.doe@example.com',
                password: 'Password123!',
                fullName: 'John Doe',
                phoneNumber: '1234567890',
                course: 'Computer Science'
            },
            {
                email: 'jane.smith@example.com',
                password: 'Password123!',
                fullName: 'Jane Smith',
                phoneNumber: '0987654321',
                course: 'Business Admin'
            },
            {
                email: 'alice.brown@example.com',
                password: 'Password123!',
                fullName: 'Alice Brown',
                phoneNumber: '5551234567',
                course: 'Data Science'
            }
        ];

        for (const clientData of clients) {
            const existing = await User.findByEmail(clientData.email);
            if (!existing) {
                await User.create(clientData);
                console.log(`✅ Registered user: ${clientData.email}`);
            } else {
                console.log(`⏩ User already exists: ${clientData.email}`);
            }
        }

        const guests = [
            {
                name: 'Bob Wilson',
                email: 'bob.wilson@example.com',
                phone: '1112223333',
                course: 'History',
                notes: 'Interested in academic writing'
            },
            {
                name: 'Charlie Davis',
                email: 'charlie.davis@example.com',
                phone: '4445556666',
                course: 'Philosophy',
                notes: 'Guest client for pilot project'
            }
        ];

        for (const guestData of guests) {
            const existing = await GuestClient.findByName(guestData.name);
            if (existing.length === 0) {
                await GuestClient.create(guestData);
                console.log(`✅ Created guest client: ${guestData.name}`);
            } else {
                console.log(`⏩ Guest client already exists: ${guestData.name}`);
            }
        }

        console.log('🏁 Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seed();
