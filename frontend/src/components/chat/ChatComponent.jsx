import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, FileText, X, Image as ImageIcon } from 'lucide-react';
import { apiService } from '../../services/api';
import { formatDate } from '../../utils/formatters';

const ChatComponent = ({ taskId, user, onClose }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const messagesEndRef = useRef(null);
    const intervalRef = useRef(null);
    const fileInputRef = useRef(null);

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Load messages
    const loadMessages = React.useCallback(async () => {
        try {
            const data = await apiService.getMessages(taskId);
            setMessages(prev => {
                if (Array.isArray(data) && prev.length !== data.length) {
                    setTimeout(scrollToBottom, 100);
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
        apiService.markMessagesRead(taskId).catch(console.error);
        intervalRef.current = setInterval(loadMessages, 5000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [taskId, loadMessages]);

    // Handle file selection
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                alert('File too large. Maximum size is 10MB');
                return;
            }
            setSelectedFile(file);
        }
    };

    // Send text message
    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() && !selectedFile) return;

        try {
            if (selectedFile) {
                // Send file
                setUploading(true);
                const formData = new FormData();
                formData.append('file', selectedFile);

                await apiService.uploadMessageFile(taskId, formData);
                setSelectedFile(null);
                setUploading(false);
                loadMessages();
            } else {
                // Send text
                const tempMsg = {
                    id: 'temp-' + Date.now(),
                    message: newMessage,
                    sender_id: user.id,
                    sender_name: user.full_name,
                    created_at: new Date().toISOString(),
                    isTemp: true
                };

                setMessages(prev => [...prev, tempMsg]);
                setNewMessage('');
                setTimeout(scrollToBottom, 50);

                await apiService.sendMessage(taskId, newMessage);
                loadMessages();
            }
        } catch (err) {
            console.error('Failed to send message', err);
            alert('Message failed to send');
            setUploading(false);
        }
    };

    const isImageFile = (fileType) => {
        return fileType && fileType.startsWith('image/');
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
                        const hasFile = msg.file_url;

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

                                    {/* File content */}
                                    {hasFile ? (
                                        <div className="mb-2">
                                            {isImageFile(msg.file_type) ? (
                                                <img
                                                    src={msg.file_url}
                                                    alt={msg.file_name}
                                                    className="max-w-xs rounded-lg cursor-pointer hover:opacity-90"
                                                    onClick={() => window.open(msg.file_url, '_blank')}
                                                />
                                            ) : (
                                                <a
                                                    href={`/api/messages/file/${msg.id}`}
                                                    download={msg.file_name}
                                                    className={`flex items-center gap-2 p-2 rounded-lg ${isMe ? 'bg-indigo-700' : 'bg-gray-100'
                                                        } hover:opacity-80 transition-opacity`}
                                                >
                                                    <FileText size={20} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium truncate">
                                                            {msg.file_name}
                                                        </div>
                                                        <div className={`text-xs ${isMe ? 'text-indigo-200' : 'text-gray-500'}`}>
                                                            {(msg.file_size / 1024).toFixed(1)} KB
                                                        </div>
                                                    </div>
                                                </a>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-sm">{msg.message}</div>
                                    )}

                                    <div className={`text-[10px] mt-1 text-right flex items-center justify-end gap-1 ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                                        {formatDate(msg.created_at)}
                                        {isMe && (
                                            <span>
                                                {msg.read_at ? (
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="translate(5, 0)" />
                                                    </svg>
                                                ) : (
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
            <form onSubmit={handleSend} className="bg-white p-3 border-t">
                {/* File preview */}
                {selectedFile && (
                    <div className="mb-2 p-2 bg-indigo-50 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {selectedFile.type.startsWith('image/') ? (
                                <ImageIcon size={16} className="text-indigo-600" />
                            ) : (
                                <FileText size={16} className="text-indigo-600" />
                            )}
                            <span className="text-sm text-indigo-700 truncate max-w-[200px]">
                                {selectedFile.name}
                            </span>
                            <span className="text-xs text-indigo-500">
                                ({(selectedFile.size / 1024).toFixed(1)} KB)
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSelectedFile(null)}
                            className="text-red-500 hover:text-red-700"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}

                <div className="flex gap-2">
                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    />

                    {/* Attachment button */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="p-2 text-gray-500 hover:text-indigo-600 transition-colors disabled:opacity-50"
                        title="Attach file"
                    >
                        <Paperclip size={18} />
                    </button>

                    {/* Text input */}
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={selectedFile ? "Send file..." : "Type a message..."}
                        disabled={uploading || selectedFile}
                        className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100"
                    />

                    {/* Send button */}
                    <button
                        type="submit"
                        disabled={(!newMessage.trim() && !selectedFile) || uploading}
                        className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {uploading ? (
                            <div className="animate-spin">⏳</div>
                        ) : (
                            <Send size={18} />
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChatComponent;
