const GuestClient = require('../models/GuestClient');
const Task = require('../models/Task');
const User = require('../models/User');
const { pool } = require('../config/database');

async function runVerification() {
    console.log('🚀 Starting Guest Client Verification...');
    let guestId = null;
    let taskId = null;

    try {
        // 1. Test Create Guest
        console.log('\nTesting GuestClient.create()...');
        const uniqueName = `TestGuest_${Date.now()}`;
        const guest = await GuestClient.create({
            name: uniqueName,
            email: 'test@example.com',
            phone: '1234567890',
            notes: 'Verification test'
        });
        console.log('✅ Guest created:', guest.id, guest.name);
        guestId = guest.id;

        // 2. Test Duplicate Detection
        console.log('\nTesting GuestClient.findByName() for duplicates...');
        const dupeCheck = await GuestClient.findByName(uniqueName);
        if (dupeCheck.length > 0) {
            console.log('✅ Duplicate detected successfully:', dupeCheck.length, 'found');
        } else {
            console.error('❌ Duplicate detection failed');
        }

        // 3. Test Task Creation for Guest
        console.log('\nTesting Task.create() with guestClientId...');
        const task = await Task.create({
            clientName: uniqueName,
            taskName: 'Guest Verification Task',
            taskDescription: 'Testing guest task linkage',
            guestClientId: guestId,
            status: 'not_started'
        });
        console.log('✅ Task created:', task.id, 'linked to guest:', task.guest_client_id);
        taskId = task.id;

        // 4. Test Task Retrieval
        console.log('\nTesting Task.findAll() with guest filter...');
        const tasks = await Task.findAll({ guestClientId: guestId });
        const foundTask = tasks.find(t => t.id === taskId);
        if (foundTask && foundTask.client_type === 'guest') {
            console.log('✅ Task retrieved successfully with client_type="guest"');
        } else {
            console.error('❌ Task retrieval validation failed', foundTask);
        }

        // 5. Test Potential Matches
        console.log('\nTesting GuestClient.findPotentialMatches()...');
        // Match by name
        const matches = await GuestClient.findPotentialMatches(uniqueName, 'other@email.com', '0000000000');
        if (matches.length > 0 && matches[0].id === guestId) {
            console.log('✅ Potential match found by name');
        } else {
            console.error('❌ Potential match logic failed');
        }

        // 6. Test Task Transfer (Dry run logic verification)
        // We won't actually create a user to merge into to avoid polluting users table unless needed.
        // We can create a dummy user?
        // Let's skip actual merge to keep verification non-destructive to main User table if possible.
        // Or create a temp user and delete it.

    } catch (error) {
        console.error('❌ Verification failed:', error);
    } finally {
        // Cleanup
        console.log('\nCleaning up...');
        if (taskId) {
            await Task.delete(taskId);
            console.log('Deleted test task');
        }
        if (guestId) {
            await GuestClient.delete(guestId);
            console.log('Deleted test guest');
        }

        pool.end(); // Close connection
    }
}

runVerification();
