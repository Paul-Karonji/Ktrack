import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { apiService } from '../../services/api';
import { formatDate } from '../../utils/formatters';

const ChatComponent = ({ taskId, user, onClose }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const intervalRef = useRef(null);

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Load messages
    const loadMessages = React.useCallback(async () => {
        try {
            const data = await apiService.getMessages(taskId);
            // Only update state if length changed to avoid re-renders/scroll jumps
            setMessages(prev => {
                if (Array.isArray(data) && prev.length !== data.length) {
                    setTimeout(scrollToBottom, 100); // Scroll after render
                    return data;
                }
                return Array.isArray(data) ? data : prev;
            });
            setLoading(false);
        } catch (err) {
            console.error('Failed to load messages', err);
        }
    }, [taskId]);

    // Initial load and poll
    useEffect(() => {
        loadMessages();
        // Mark as read on open
        apiService.markMessagesRead(taskId).catch(console.error);

        // Poll every 5 seconds
        intervalRef.current = setInterval(loadMessages, 5000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [taskId, loadMessages]);

    // Send message
    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            const tempMsg = {
                id: 'temp-' + Date.now(),
                message: newMessage,
                sender_id: user.id,
                sender_name: user.full_name,
                created_at: new Date().toISOString(),
                isTemp: true
            };

            // Optimistic update
            setMessages(prev => [...prev, tempMsg]);
            setNewMessage('');
            setTimeout(scrollToBottom, 50);

            await apiService.sendMessage(taskId, newMessage);
            loadMessages(); // Refresh to get real ID
        } catch (err) {
            console.error('Failed to send message', err);
            alert('Message failed to send');
        }
    };

    return (
        <div className="flex flex-col h-[400px] bg-gray-50 rounded-xl border border-gray-200 overflow-hidden shadow-inner">
            {/* Header */}
            <div className="bg-white p-3 border-b flex justify-between items-center">
                <h3 className="font-bold text-gray-700">Project Chat</h3>
                {onClose && (
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        &times;
                    </button>
                )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading && messages.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-4">Loading conversation...</div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-4 italic">
                        No messages yet. Start the conversation!
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender_id === user.id;
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl p-3 ${isMe
                                    ? 'bg-indigo-600 text-white rounded-br-none'
                                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
                                    }`}>
                                    {!isMe && (
                                        <div className="text-xs font-bold text-gray-500 mb-1">
                                            {msg.sender_name}
                                        </div>
                                    )}
                                    <div className="text-sm">{msg.message}</div>
                                    <div className={`text-[10px] mt-1 text-right flex items-center justify-end gap-1 ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                                        {formatDate(msg.created_at)}
                                        {isMe && (
                                            <span>
                                                {msg.read_at ? (
                                                    // Double Check (Read)
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="translate(5, 0)" />
                                                    </svg>
                                                ) : (
                                                    // Single Check (Sent)
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12"></polyline>
                                                    </svg>
                                                )}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="bg-white p-3 border-t flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
};

export default ChatComponent;
