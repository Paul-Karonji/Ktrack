const { Server } = require('socket.io');
const User = require('../models/User');
const Task = require('../models/Task');
const { verifyToken } = require('../utils/jwt');

let io;

const ROOM_PATTERNS = {
    general: /^general_(\d+)$/,
    task: /^task_(\d+)$/
};

const normalizeRoomName = (room) => {
    if (typeof room !== 'string') return null;
    const trimmed = room.trim();
    if (!trimmed) return null;
    return trimmed;
};

const parseRoom = (room) => {
    const normalized = normalizeRoomName(room);
    if (!normalized) return null;

    const generalMatch = normalized.match(ROOM_PATTERNS.general);
    if (generalMatch) {
        return { type: 'general', id: Number(generalMatch[1]), room: normalized };
    }

    const taskMatch = normalized.match(ROOM_PATTERNS.task);
    if (taskMatch) {
        return { type: 'task', id: Number(taskMatch[1]), room: normalized };
    }

    return null;
};

const extractHandshakeToken = (socket) => {
    const authToken = socket.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
        return authToken.trim();
    }

    const header = socket.handshake.headers?.authorization;
    if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) {
        return header.slice(7).trim();
    }

    return null;
};

const getSocketUserPayload = (socket) => ({
    id: socket.data.user.id,
    name: socket.data.user.full_name || socket.data.user.email,
    role: socket.data.user.role
});

const canAccessRoom = async (user, parsedRoom) => {
    if (!user || !parsedRoom) return false;

    if (parsedRoom.type === 'general') {
        return user.role === 'admin' || user.id === parsedRoom.id;
    }

    if (parsedRoom.type === 'task') {
        if (user.role === 'admin') {
            return true;
        }

        const task = await Task.findById(parsedRoom.id, undefined, 0);
        return !!task && task.client_id === user.id;
    }

    return false;
};

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.use(async (socket, next) => {
        try {
            const token = extractHandshakeToken(socket);
            if (!token) {
                return next(new Error('Authentication required'));
            }

            const decoded = verifyToken(token);
            if (!decoded) {
                return next(new Error('Invalid or expired token'));
            }

            const user = await User.findById(decoded.id);
            if (!user || user.status !== 'approved') {
                return next(new Error('User not found or not approved'));
            }

            socket.data.user = user;
            socket.data.authorizedRooms = new Set();
            next();
        } catch (error) {
            next(new Error('Socket authentication failed'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`🔌 Client connected to socket: ${socket.id} (${socket.data.user.email})`);

        const tryJoinRoom = async (room) => {
            const parsedRoom = parseRoom(room);
            if (!parsedRoom) {
                socket.emit('socket_error', { message: 'Invalid room requested' });
                return;
            }

            if (!socket.data.authorizedRooms.has(parsedRoom.room)) {
                const allowed = await canAccessRoom(socket.data.user, parsedRoom);
                if (!allowed) {
                    socket.emit('socket_error', { message: 'Access denied for requested room' });
                    return;
                }

                socket.data.authorizedRooms.add(parsedRoom.room);
            }

            socket.join(parsedRoom.room);
            console.log(`👥 Client ${socket.id} joined room: ${parsedRoom.room}`);
        };

        socket.on('join_room', async (room) => {
            try {
                await tryJoinRoom(room);
            } catch (error) {
                socket.emit('socket_error', { message: 'Failed to join room' });
            }
        });

        socket.on('leave_room', (room) => {
            const parsedRoom = parseRoom(room);
            if (!parsedRoom) {
                return;
            }

            socket.leave(parsedRoom.room);
            console.log(`🏃 Client ${socket.id} left room: ${parsedRoom.room}`);
        });

        socket.on('typing', ({ room }) => {
            const parsedRoom = parseRoom(room);
            if (!parsedRoom || !socket.data.authorizedRooms.has(parsedRoom.room) || !socket.rooms.has(parsedRoom.room)) {
                return;
            }

            socket.to(parsedRoom.room).emit('user_typing', { user: getSocketUserPayload(socket) });
        });

        socket.on('stop_typing', ({ room }) => {
            const parsedRoom = parseRoom(room);
            if (!parsedRoom || !socket.data.authorizedRooms.has(parsedRoom.room) || !socket.rooms.has(parsedRoom.room)) {
                return;
            }

            socket.to(parsedRoom.room).emit('user_stopped_typing', { user: getSocketUserPayload(socket) });
        });

        socket.on('disconnect', () => {
            console.log(`❌ Client disconnected: ${socket.id}`);
        });
    });

    console.log('✅ Socket.io initialized');
    return io;
};

const getIo = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};

module.exports = {
    initSocket,
    getIo
};
