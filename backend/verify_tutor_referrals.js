require('dotenv').config();
const User = require('./models/User');

async function run() {
    console.log('--- Verifying Tutor Client Visibility Updates ---');
    try {
        // Let's get the first tutor from the system
        const tutors = await User.findTutors();
        if (tutors.length === 0) {
            console.log('No tutors found in the system. Cannot run verification.');
            process.exit(0);
        }

        const tutorId = tutors[0].id;
        console.log(`\nUsing Tutor ID: ${tutorId} (${tutors[0].full_name})`);

        // Test User.findAll
        console.log('\n1. Testing User.findAll({ tutorId })...');
        const tutorClients = await User.findAll({ tutorId });
        console.log(`Success! Found ${tutorClients.length} clients visible to this tutor.`);
        if (tutorClients.length > 0) {
            console.log(`Sample client name: ${tutorClients[0].full_name}, Referred By: ${tutorClients[0].referred_by}`);
        }

        // Test User.getStats
        console.log('\n2. Testing User.getStats(tutorId)...');
        const stats = await User.getStats(tutorId);
        console.log('Success! Stats returned:');
        console.log(stats);

        console.log('\n✅ Verification passed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Verification failed:', error);
        process.exit(1);
    }
}

run();
