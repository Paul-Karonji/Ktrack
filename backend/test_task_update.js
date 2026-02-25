const Task = require('./models/Task');

async function testUpdate() {
    try {
        console.log('--- TEST: Task.update (requiresDeposit) ---');
        const taskId = 8; // Adjust to an existing task ID

        console.log(`Updating task ${taskId}...`);
        const updatedTask = await Task.update(taskId, {
            requiresDeposit: 1,
            depositAmount: 75.00,
            quotedAmount: 150.00
        });

        console.log('Update result from findById:');
        console.log({
            id: updatedTask.id,
            requires_deposit: updatedTask.requires_deposit,
            deposit_amount: updatedTask.deposit_amount,
            quoted_amount: updatedTask.quoted_amount
        });

        if (updatedTask.requires_deposit === 1) {
            console.log('✅ PASS: requires_deposit is 1');
        } else {
            console.log('❌ FAIL: requires_deposit is', updatedTask.requires_deposit);
        }

        process.exit(0);
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

testUpdate();
