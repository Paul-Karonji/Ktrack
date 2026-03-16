import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { apiService } from '../../services/api';
import Sidebar from '../../components/layout/Sidebar';
import ChatComponent from '../../components/chat/ChatComponent';
import { MessageSquare, Menu, Users } from 'lucide-react';

const MessagesPage = () => {
    const { user, logout } = useAuth();
    const { openSidebar } = useNavigation();
    const [clients, setClients] = useState([]);
    const [selectedClientId, setSelectedClientId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.role === 'admin') {
            loadClients();
        } else if (user?.role === 'client') {
            setSelectedClientId(user.id);
            setLoading(false);
        }
    }, [user]);

    const loadClients = async () => {
        try {
            setLoading(true);
            const data = await apiService.getUsers({ role: 'client' });
            setClients(data.users || data || []);
            setLoading(false);
        } catch (error) {
            console.error('Failed to load clients', error);
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
            <Sidebar user={user} onLogout={logout} />

            <main className="flex-1 lg:ml-64 flex flex-col h-full relative z-0 relative">
                {/* Header */}
                <div className="flex-none p-4 md:p-6 lg:p-8 pb-4">
                    <div className="flex items-center justify-between gap-4">
                        <h1 className="text-3xl md:text-5xl font-bold text-gray-900 flex items-center gap-3">
                            <button
                                onClick={openSidebar}
                                className="lg:hidden p-2 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                <Menu size={32} className="text-gray-900" />
                            </button>
                            <MessageSquare size={48} className="text-indigo-600 hidden lg:block" />
                            <span className="flex items-center gap-2">
                                <MessageSquare size={32} className="text-indigo-600 lg:hidden" />
                                Messages
                            </span>
                        </h1>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex overflow-hidden px-4 md:px-6 lg:px-8 pb-6">
                    <div className="flex-1 flex bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        
                        {/* Admin Sidebar for Clients */}
                        {user.role === 'admin' && (
                            <div className={`w-80 border-r border-gray-200 flex flex-col ${selectedClientId ? 'hidden md:flex' : 'flex'}`}>
                                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                                    <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                                        <Users size={18} />
                                        Clients
                                    </h2>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    {loading ? (
                                        <div className="p-4 text-center text-gray-400">Loading clients...</div>
                                    ) : clients.length === 0 ? (
                                        <div className="p-4 text-center text-gray-400">No clients found.</div>
                                    ) : (
                                        <div className="divide-y divide-gray-100">
                                            {clients.map(client => (
                                                <button
                                                    key={client.id}
                                                    onClick={() => setSelectedClientId(client.id)}
                                                    className={`w-full text-left p-4 hover:bg-indigo-50 transition-colors ${selectedClientId === client.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'border-l-4 border-transparent'}`}
                                                >
                                                    <div className="font-medium text-gray-900">{client.full_name || client.fullName}</div>
                                                    <div className="text-xs text-gray-500 mt-1 truncate">{client.email}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Chat Area */}
                        <div className={`flex-1 flex flex-col ${!selectedClientId && user.role === 'admin' ? 'hidden md:flex' : 'flex'}`}>
                            {selectedClientId ? (
                                <>
                                    {user.role === 'admin' && (
                                        <div className="md:hidden p-3 bg-indigo-50 border-b flex items-center gap-2">
                                            <button 
                                                onClick={() => setSelectedClientId(null)}
                                                className="text-indigo-600 text-sm font-medium hover:underline"
                                            >
                                                &larr; Back to Clients
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex-1 flex flex-col h-full bg-gray-50/30">
                                        <ChatComponent 
                                            clientId={selectedClientId} 
                                            user={user} 
                                            isGeneralChat={true}
                                            hideHeader={true}
                                            fullHeight={true}
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-gray-400 p-8 text-center bg-gray-50">
                                    <div>
                                        <MessageSquare size={48} className="mx-auto mb-4 opacity-50 text-indigo-300" />
                                        <p className="text-lg">Select a client to start messaging.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MessagesPage;
