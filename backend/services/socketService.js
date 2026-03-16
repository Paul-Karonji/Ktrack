const { Server } = require('socket.io');

let io;

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log(`🔌 Client connected to socket: ${socket.id}`);

        socket.on('join_room', (room) => {
            socket.join(room);
            console.log(`👥 Client ${socket.id} joined room: ${room}`);
        });

        socket.on('leave_room', (room) => {
            socket.leave(room);
            console.log(`🏃 Client ${socket.id} left room: ${room}`);
        });

        socket.on('typing', ({ room, user }) => {
            socket.to(room).emit('user_typing', { user });
        });

        socket.on('stop_typing', ({ room, user }) => {
            socket.to(room).emit('user_stopped_typing', { user });
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
