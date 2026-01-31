// Using native fetch (Node 18+)

async function testSendQuote() {
    const baseUrl = 'http://localhost:3001/api';

    console.log('1. Logging in as ADMIN...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@tasktracker.com', password: 'password123' })
    });

    if (!loginRes.ok) {
        console.error('Admin Login failed:', await loginRes.text());
        return;
    }

    const loginData = await loginRes.json();
    const token = loginData.accessToken;
    const adminUser = loginData.user;
    console.log(`Login successful as ${adminUser.role}. Token obtained.`);

    if (adminUser.role !== 'admin') {
        console.error('Logged in user is NOT admin override needed or wrong perms.');
    }

    // Use Task ID 8 from previous test, or a known ID.
    const taskId = 8;
    console.log(`2. Sending quote for Task ID ${taskId}...`);

    const quotePayload = {
        amount: 500.00
    };

    const quoteRes = await fetch(`${baseUrl}/tasks/${taskId}/quote`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(quotePayload)
    });

    if (quoteRes.ok) {
        const updatedTask = await quoteRes.json();
        console.log('SUCCESS! Quote sent:', updatedTask);
    } else {
        console.error('FAILED to send quote:', quoteRes.status, await quoteRes.text());
    }
}

testSendQuote().catch(console.error);
