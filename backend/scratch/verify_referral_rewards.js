const { pool } = require('../config/database');
const User = require('../models/User');
const PaymentSettings = require('../models/PaymentSettings');
const DatabasePatchService = require('../services/databasePatchService');

async function run() {
    try {
        console.log('--- START REFERRAL REWARDS TEST ---');
        console.log('Applying database patches...');
        await DatabasePatchService.applyPatches();
        
        // 1. Get or create referrer client
        const referrerEmail = 'referrer_test_client@example.com';
        let referrer = await User.findByEmail(referrerEmail);
        if (!referrer) {
            console.log('Creating referrer client...');
            referrer = await User.create({
                fullName: 'Test Referrer Client',
                email: referrerEmail,
                password: 'Password123',
                role: 'client'
            });
        }
        
        // Ensure role is client and status is approved
        await pool.execute(
            "UPDATE users SET role = 'client', status = 'approved', referral_discount_balance = 0.00 WHERE id = ?",
            [referrer.id]
        );
        referrer = await User.findById(referrer.id);
        console.log(`Referrer Client ID: ${referrer.id}, Initial Balance: $${referrer.referral_discount_balance}`);

        // 2. Set custom referral reward amount to $25.50
        const testRewardAmount = 25.50;
        console.log(`Setting referral reward settings to $${testRewardAmount}...`);
        await PaymentSettings.update({
            depositRemindersEnabled: true,
            depositReminderIntervalHours: 24,
            balanceRemindersEnabled: true,
            balanceReminderIntervalDays: 7,
            referralDiscountAmount: testRewardAmount
        }, referrer.id);

        const settings = await PaymentSettings.get();
        console.log(`Verified database settings referral_discount_amount: $${settings.referral_discount_amount}`);

        // 3. Create referred client
        const referredEmail = 'referred_test_client@example.com';
        let referred = await User.findByEmail(referredEmail);
        if (referred) {
            // Delete existing referred user to start fresh
            await pool.execute('DELETE FROM users WHERE id = ?', [referred.id]);
        }
        
        console.log('Creating referred client...');
        referred = await User.create({
            fullName: 'Test Referred Client',
            email: referredEmail,
            password: 'Password123',
            role: 'client'
        });
        
        // Set referred_by field and status to 'pending'
        await pool.execute(
            "UPDATE users SET referred_by = ?, status = 'pending' WHERE id = ?",
            [referrer.id, referred.id]
        );
        console.log(`Referred Client ID: ${referred.id}, Referred By: ${referrer.id}, Status: pending`);

        // 4. Approve the referred client
        console.log('Approving the referred client...');
        await User.approve(referred.id, referrer.id); // approved by referrer for testing

        // 5. Check referrer client's balance
        const updatedReferrer = await User.findById(referrer.id);
        console.log(`Referrer Client Updated Balance: $${updatedReferrer.referral_discount_balance}`);

        if (Number(updatedReferrer.referral_discount_balance) === testRewardAmount) {
            console.log('✅ SUCCESS: Referral reward correctly credited!');
        } else {
            console.error('❌ FAILURE: Referral reward balance mismatch!');
        }

        // Cleanup
        await pool.execute('DELETE FROM users WHERE id = ?', [referred.id]);
        await pool.execute('DELETE FROM users WHERE id = ?', [referrer.id]);
        console.log('Cleanup completed successfully.');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error executing test:', error);
        process.exit(1);
    }
}

run();
