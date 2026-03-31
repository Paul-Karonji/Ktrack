import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Paperclip, FileText, X, Image as ImageIcon } from 'lucide-react';
import { apiService, API_BASE_URL } from '../../services/api';
import { formatDate } from '../../utils/formatters';
import { useSocket } from '../../context/SocketContext';

const INLINE_SAFE_IMAGE_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
]);

const ChatComponent = ({ taskId, clientId, user, onClose, isGeneralChat = false, hideHeader = false, fullHeight = false }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    
    // Pagination state
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const LIMIT = 50;

    // Typing state
    const [typingUsers, setTypingUsers] = useState(new Set());
    
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    
    const { socket, retainSocket, releaseSocket } = useSocket();

    const roomName = isGeneralChat ? `general_${clientId}` : `task_${taskId}`;
    const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '');

    useEffect(() => {
        retainSocket();

        return () => {
            releaseSocket();
        };
    }, [releaseSocket, retainSocket]);

    // Scroll to bottom
    const scrollToBottom = (behavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    const getMessageFileUrl = useCallback((fileUrl) => {
        if (!fileUrl) return '';
        if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
        if (fileUrl.startsWith('/')) return `${apiOrigin}${fileUrl}`;
        return fileUrl;
    }, [apiOrigin]);

    const openFileInNewTab = useCallback((fileUrl) => {
        const targetUrl = getMessageFileUrl(fileUrl);
        const popup = window.open(targetUrl, '_blank', 'noopener,noreferrer');
        if (popup) {
            popup.opener = null;
        }
    }, [getMessageFileUrl]);

    // Load messages
    const loadMessages = useCallback(async (currentOffset = 0, append = false) => {
        try {
            if (currentOffset === 0) setLoading(true);
            else setLoadingMore(true);

            let data;
            if (isGeneralChat) {
                if (!clientId) return;
                data = await apiService.getGeneralMessages(clientId, LIMIT, currentOffset);
            } else {
                if (!taskId) return;
                data = await apiService.getMessages(taskId, LIMIT, currentOffset);
            }

            if (data.length < LIMIT) {
                setHasMore(false);
            }

            setMessages(prev => {
                if (append) {
                    return [...data, ...prev]; // Prepend older messages
                }
                return data;
            });
            
            if (currentOffset === 0) {
                setTimeout(() => scrollToBottom('auto'), 100);
            }

            setLoading(false);
            setLoadingMore(false);
        } catch (err) {
            console.error('Failed to load messages', err);
            setLoading(false);
            setLoadingMore(false);
        }
    }, [taskId, clientId, isGeneralChat]);

    // Initial load and socket setup
    useEffect(() => {
        loadMessages(0, false);
        setOffset(0);
        setHasMore(true);

        if (!isGeneralChat && taskId) {
            apiService.markMessagesRead(taskId).catch(console.error);
        }

        if (socket) {
            socket.emit('join_room', roomName);

            // Socket Listeners
            socket.on('new_message', (msg) => {
                setMessages(prev => {
                    // Check if already exists 
                    if (prev.find(m => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });
                setTimeout(() => scrollToBottom(), 100);
                
                if (!isGeneralChat && taskId) {
                    apiService.markMessagesRead(taskId).catch(console.error);
                }
            });

            socket.on('user_typing', ({ user: typingUser }) => {
                if (typingUser.id !== user.id) {
                    setTypingUsers(prev => {
                        const newSet = new Set(prev);
                        newSet.add(typingUser.name);
                        return newSet;
                    });
                }
            });

            socket.on('user_stopped_typing', ({ user: typingUser }) => {
                setTypingUsers(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(typingUser.name);
                    return newSet;
                });
            });

            return () => {
                socket.emit('leave_room', roomName);
                socket.off('new_message');
                socket.off('user_typing');
                socket.off('user_stopped_typing');
            };
        }
    }, [taskId, clientId, isGeneralChat, loadMessages, roomName, socket, user.id]);

    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            const newOffset = offset + LIMIT;
            setOffset(newOffset);
            loadMessages(newOffset, true);
        }
    };

    const handleTyping = (e) => {
        setNewMessage(e.target.value);

        if (!socket) return;

        socket.emit('typing', { room: roomName, user: { id: user.id, name: user.full_name || user.fullName } });

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('stop_typing', { room: roomName, user: { id: user.id, name: user.full_name || user.fullName } });
        }, 1500);
    };

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

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() && !selectedFile) return;

        try {
            if (socket) {
                socket.emit('stop_typing', { room: roomName, user: { id: user.id, name: user.full_name || user.fullName } });
            }

            if (selectedFile) {
                // Send file
                setUploading(true);
                const formData = new FormData();
                formData.append('file', selectedFile);

                if (isGeneralChat) {
                    await apiService.uploadGeneralMessageFile(clientId, formData);
                } else {
                    await apiService.uploadMessageFile(taskId, formData);
                }
                
                setSelectedFile(null);
                setUploading(false);
            } else {
                // Send text
                const msgText = newMessage;
                setNewMessage('');
                
                if (isGeneralChat) {
                    await apiService.sendGeneralMessage(clientId, msgText);
                } else {
                    await apiService.sendMessage(taskId, msgText);
                }
            }
        } catch (err) {
            console.error('Failed to send message', err);
            alert('Message failed to send');
            setUploading(false);
        }
    };

    const isImageFile = (fileType) => {
        return INLINE_SAFE_IMAGE_TYPES.has(String(fileType || '').toLowerCase());
    };

    return (
        <div className={`flex flex-col bg-gray-50 rounded-xl border border-gray-200 overflow-hidden shadow-inner ${fullHeight ? 'h-full' : 'h-[400px]'}`}>
            {/* Header */}
            {!hideHeader && (
                <div className="bg-white p-3 border-b flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">{isGeneralChat ? 'Direct Chat' : 'Project Chat'}</h3>
                    {onClose && (
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            &times;
                        </button>
                    )}
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col" ref={messagesContainerRef}>
                {hasMore && !loading && messages.length >= LIMIT && (
                    <div className="text-center mb-4">
                        <button 
                            onClick={handleLoadMore} 
                            disabled={loadingMore}
                            className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1 rounded-full hover:bg-gray-50 disabled:opacity-50"
                        >
                            {loadingMore ? 'Loading...' : 'Load older messages'}
                        </button>
                    </div>
                )}
            
                {loading && messages.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Loading conversation...</div>
                ) : messages.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-gray-400 text-sm italic">
                        No messages yet. Start the conversation!
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((msg) => {
                            const isMe = msg.sender_id === user.id;
                            const hasFile = msg.file_url;
                            const isTemp = msg.isTemp;

                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isTemp ? 'opacity-50' : ''}`}>
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
                                                        src={getMessageFileUrl(msg.file_url)}
                                                        alt={msg.file_name}
                                                        className="max-w-xs rounded-lg cursor-pointer hover:opacity-90"
                                                        onClick={() => openFileInNewTab(msg.file_url)}
                                                    />
                                                ) : (
                                                    <a
                                                        href={getMessageFileUrl(msg.file_url)}
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
                                            <div className="text-sm break-words">{msg.message}</div>
                                        )}

                                        <div className={`text-[10px] mt-1 text-right flex items-center justify-end gap-1 ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                                            {formatDate(msg.created_at)}
                                            {isMe && !isTemp && (
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
                                            {isMe && isTemp && (
                                                <span className="animate-pulse">Sending...</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                
                {uploading && (
                    <div className="flex justify-end mt-4">
                        <div className="max-w-[80%] rounded-2xl p-3 bg-indigo-600 text-white rounded-br-none opacity-70 animate-pulse">
                            <div className="text-sm flex items-center gap-2">
                                <div className="animate-spin">⏳</div> Uploading file...
                            </div>
                        </div>
                    </div>
                )}

                {typingUsers.size > 0 && (
                    <div className="text-xs text-gray-500 italic mt-2 ml-2">
                        {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                    </div>
                )}
                <div ref={messagesEndRef} className="h-4" />
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

                <div className="flex gap-2 items-center">
                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileSelect}
                        className="hidden"
                        accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar,.7z"
                    />

                    {/* Attachment button */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="p-2 text-gray-500 hover:text-indigo-600 transition-colors disabled:opacity-50 flex-shrink-0"
                        title="Attach file"
                    >
                        <Paperclip size={18} />
                    </button>

                    {/* Text input */}
                    <input
                        type="text"
                        value={newMessage}
                        onChange={handleTyping}
                        placeholder={selectedFile ? "Send file..." : "Type a message..."}
                        disabled={uploading || selectedFile}
                        className="flex-1 min-w-0 p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 placeholder-gray-400"
                    />

                    {/* Send button */}
                    <button
                        type="submit"
                        disabled={(!newMessage.trim() && !selectedFile) || uploading}
                        className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                    >
                        {uploading ? (
                            <div className="animate-spin w-[18px] h-[18px] flex items-center justify-center">⏳</div>
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
