import React from 'react';
import { Plus, Eye, EyeOff, Wifi, WifiOff } from 'lucide-react';

const Header = ({ isOnline, hideAmounts, onToggleAmounts, onAddTask }) => {
    return (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-6 md:p-8 text-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">Client Task Tracker</h1>
                    <p className="text-indigo-100 text-sm md:text-base">Manage your client projects and track payments</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${isOnline ? 'bg-green-500/20 text-green-100' : 'bg-red-500/20 text-red-100'
                        }`}>
                        {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
                        <span className="font-medium">{isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                    <button
                        onClick={onToggleAmounts}
                        className="p-2.5 bg-white/20 hover:bg-white/30 rounded-full transition-all"
                        title={hideAmounts ? 'Show amounts' : 'Hide amounts'}
                    >
                        {hideAmounts ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                    <button
                        onClick={onAddTask}
                        disabled={!isOnline}
                        className={`px-6 py-2.5 rounded-full font-medium flex items-center gap-2 transition-all transform hover:scale-105 ${isOnline
                                ? 'bg-white text-indigo-600 hover:shadow-lg'
                                : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                            }`}
                    >
                        <Plus size={20} />
                        <span className="hidden sm:inline">Add Task</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Header;
