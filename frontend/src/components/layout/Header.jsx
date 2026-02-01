import React, { useState } from 'react';
import { Plus, Eye, EyeOff, Wifi, WifiOff, LogOut, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import ktrackIcon from '../../assets/images/ktrack_icon.png';

const Header = ({ isOnline, hideAmounts, onToggleAmounts, onAddTask, user, onLogout }) => {
    const [showMenu, setShowMenu] = useState(false);

    return (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-6 md:p-8 text-white relative">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <img src={ktrackIcon} alt="K-Track" className="w-12 h-12 rounded-xl shadow-lg border-2 border-white/20" />
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-1">K-Track</h1>
                        <p className="text-indigo-100 text-sm md:text-base">Commission & Task Management</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Online Status */}
                    <div className={`flex items - center gap - 2 px - 4 py - 2 rounded - full ${isOnline ? 'bg-green-500/20 text-green-100' : 'bg-red-500/20 text-red-100'} `}>
                        {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
                        <span className="font-medium hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
                    </div>

                    {/* Visibility Toggle */}
                    <button
                        onClick={onToggleAmounts}
                        className="p-2.5 bg-white/20 hover:bg-white/30 rounded-full transition-all"
                        title={hideAmounts ? 'Show amounts' : 'Hide amounts'}
                    >
                        {hideAmounts ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>

                    {/* Add Task Button */}
                    <button
                        onClick={onAddTask}
                        disabled={!isOnline}
                        className={`px - 6 py - 2.5 rounded - full font - medium flex items - center gap - 2 transition - all transform hover: scale - 105 ${isOnline
                            ? 'bg-white text-indigo-600 hover:shadow-lg'
                            : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                            } `}
                    >
                        <Plus size={20} />
                        <span className="hidden sm:inline">Add Task</span>
                    </button>

                    {/* User Profile */}
                    {user && (
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="flex items-center gap-2 pl-2 pr-4 py-1.5 bg-indigo-800/50 hover:bg-indigo-800/70 rounded-full border border-indigo-400/30 transition-all"
                            >
                                <div className="bg-indigo-300 text-indigo-900 w-8 h-8 rounded-full flex items-center justify-center font-bold">
                                    {user.fullName?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <span className="text-sm font-medium hidden sm:block max-w-[100px] truncate">
                                    {user.fullName}
                                </span>
                            </button>

                            {showMenu && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl py-2 text-gray-800 z-50 animate-fade-in-down border border-gray-100">
                                    <div className="px-4 py-3 border-b border-gray-100">
                                        <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
                                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                        <div className="mt-1 inline-flex px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 uppercase tracking-wide">
                                            {user.role}
                                        </div>
                                    </div>

                                    {user.role === 'admin' && (
                                        <Link
                                            to="/admin/users"
                                            onClick={() => setShowMenu(false)}
                                            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
                                        >
                                            <Users size={16} className="text-gray-500" />
                                            User Management
                                        </Link>
                                    )}

                                    <div className="border-t border-gray-100 my-1"></div>

                                    <button
                                        onClick={() => {
                                            onLogout();
                                            setShowMenu(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 text-sm font-medium text-red-600 transition-colors text-left"
                                    >
                                        <LogOut size={16} />
                                        Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Click outside listener could go here to close menu */}
            {showMenu && (
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
            )}
        </div>
    );
};

export default Header;
