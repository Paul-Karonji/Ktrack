const GuestClient = require('../models/GuestClient');
const User = require('../models/User');
const Task = require('../models/Task');
const bcrypt = require('bcrypt');

// GET /api/guest-clients - Get all guest clients
exports.getAllGuestClients = async (req, res) => {
    try {
        const guests = await GuestClient.findAll();
        res.json({ success: true, guests });
    } catch (error) {
        console.error('Error fetching guest clients:', error);
        res.status(500).json({ error: 'Failed to fetch guest clients' });
    }
};

// POST /api/guest-clients - Create guest client
exports.createGuestClient = async (req, res) => {
    try {
        const { name, email, phone, course, notes } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        // Check for exact duplicate (name + phone)
        if (phone) {
            const exactDuplicate = await GuestClient.findByNameAndPhone(name, phone);
            if (exactDuplicate) {
                return res.status(400).json({
                    error: 'Guest with this name and phone already exists',
                    existingGuest: exactDuplicate
                });
            }
        }

        // Check for name duplicates (warning only)
        if (!req.body.force) {
            const nameDuplicates = await GuestClient.findByName(name);

            if (nameDuplicates.length > 0) {
                return res.status(200).json({
                    warning: true,
                    message: `${nameDuplicates.length} guest(s) with name "${name}" already exist`,
                    duplicates: nameDuplicates.map(d => ({
                        id: d.id,
                        name: d.name,
                        phone: d.phone,
                        email: d.email,
                        taskCount: d.task_count
                    })),
                    suggestion: phone
                        ? 'Different phone number - safe to create'
                        : 'Consider adding phone number to differentiate',
                    allowCreate: true
                });
            }
        }

        // Create guest client
        const guest = await GuestClient.create({ name, email, phone, course, notes });
        res.json({ success: true, guest });

    } catch (error) {
        console.error('Error creating guest client:', error);
        res.status(500).json({ error: 'Failed to create guest client' });
    }
};

// PUT /api/guest-clients/:id - Update guest client
exports.updateGuestClient = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, course, notes } = req.body;

        const guest = await GuestClient.update(id, { name, email, phone, course, notes });

        if (!guest) {
            return res.status(404).json({ error: 'Guest client not found' });
        }

        res.json({ success: true, guest });
    } catch (error) {
        console.error('Error updating guest client:', error);
        res.status(500).json({ error: 'Failed to update guest client' });
    }
};

// DELETE /api/guest-clients/:id - Delete guest client
exports.deleteGuestClient = async (req, res) => {
    try {
        const { id } = req.params;
        const success = await GuestClient.delete(id);

        if (!success) {
            return res.status(404).json({ error: 'Guest client not found' });
        }

        res.json({ success: true, message: 'Guest client deleted' });
    } catch (error) {
        console.error('Error deleting guest client:', error);
        res.status(500).json({ error: 'Failed to delete guest client' });
    }
};

// POST /api/guest-clients/:id/upgrade - Upgrade guest to registered
exports.upgradeToRegistered = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, password } = req.body;

        // Validate inputs
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Get guest
        const guest = await GuestClient.findById(id);
        if (!guest) {
            return res.status(404).json({ error: 'Guest not found' });
        }

        if (guest.upgraded_to_user_id) {
            return res.status(400).json({ error: 'Guest already upgraded' });
        }

        // Check email availability
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Create user account
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            name: guest.name,
            email: email,
            password: hashedPassword,
            phone: guest.phone,
            role: 'client',
            status: 'approved', // Auto-approve
            course: guest.course
        });

        // Transfer tasks
        const taskCount = await Task.transferGuestTasks(id, newUser.id);

        // Mark guest as upgraded
        await GuestClient.markAsUpgraded(id, newUser.id);

        // Send upgrade notification (email) - Optional for now, logic not implemented in plan detail but can trigger notification service here
        // await sendUpgradeNotification(newUser); 

        res.json({
            success: true,
            message: `Guest upgraded to registered client. ${taskCount} tasks transferred.`,
            userId: newUser.id,
            taskCount
        });

    } catch (error) {
        console.error('Error upgrading guest:', error);
        res.status(500).json({ error: 'Failed to upgrade guest' });
    }
};
