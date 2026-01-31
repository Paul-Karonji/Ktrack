// Using native fetch (Node 18+)
// Actually, let's try native fetch first.

async function testTaskCreation() {
    const baseUrl = 'http://localhost:3001/api';

    console.log('1. Logging in as client...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'client@demo.com', password: 'password123' })
    });

    if (!loginRes.ok) {
        console.error('Login failed:', await loginRes.text());
        return;
    }

    const loginData = await loginRes.json();
    const token = loginData.accessToken;
    console.log('Login successful. Token obtained.');

    console.log('2. Creating task with minimal data (testing NULL handling)...');
    // Sending empty strings for optional fields to test the SQL fix
    const taskPayload = {
        clientName: 'Demo Client',
        taskDescription: 'Terminal Test Task',
        dateCommissioned: '',
        dateDelivered: '',
        expectedAmount: '', // This caused the 500 error before
        priority: 'medium',
        status: 'not_started',
        notes: '',
        quantity: ''
    };

    const createRes = await fetch(`${baseUrl}/tasks`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(taskPayload)
    });

    if (createRes.ok) {
        const taskData = await createRes.json();
        console.log('SUCCESS! Task created:', taskData);
    } else {
        console.error('FAILED to create task:', createRes.status, await createRes.text());
    }
}

testTaskCreation().catch(console.error);
