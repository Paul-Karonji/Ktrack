import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getAccessToken } from '../services/api';

const SocketContext = createContext(null);

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        if (!user) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
            return;
        }

        const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';
        
        const newSocket = io(socketUrl, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            auth: (cb) => cb({ token: getAccessToken() })
        });

        // Join general room based on role
        newSocket.on('connect', () => {
            console.log('Connected to socket server');
            if (user.role === 'client') {
                newSocket.emit('join_room', `general_${user.id}`);
            } else if (user.role === 'admin') {
                // Admins might join multiple rooms or just listen when they open a chat
            }
        });

        newSocket.on('connect_error', (error) => {
            console.error('Socket connection failed:', error.message);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [user]);

    return (
        <SocketContext.Provider value={{ socket }}>
            {children}
        </SocketContext.Provider>
    );
};
