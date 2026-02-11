import React, { useState } from 'react';
import { Plus, Eye, EyeOff, Wifi, WifiOff, LogOut, Users, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNavigation } from '../../context/NavigationContext';

import ktrackIcon from '../../assets/images/ktrack_icon.png';

const Header = ({ isOnline, hideAmounts, onToggleAmounts, onAddTask, user, onLogout }) => {
    const [showMenu, setShowMenu] = useState(false);
    const { toggleSidebar } = useNavigation();

    return (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-4 md:p-6 lg:p-8 text-white relative">
            <div className="flex flex-col gap-4">
                {/* Top Row: Menu + Logo + User */}
                <div className="flex items-center justify-between">
                    {/* Mobile Menu Button */}
                    <button
                        onClick={toggleSidebar}
                        className="lg:hidden p-2 hover:bg-white/20 rounded-lg transition-colors"
                        aria-label="Toggle menu"
                    >
                        <Menu size={24} />
                    </button>

                    {/* Logo */}
                    <div className="flex items-center gap-3 flex-1 lg:flex-initial">
                        <img src={ktrackIcon} alt="K-Track" className="w-10 h-10 md:w-12 md:h-12 rounded-xl shadow-lg border-2 border-white/20" />
                        <div className="hidden sm:block">
                            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-1">K-Track</h1>
                            <p className="text-indigo-100 text-xs md:text-sm lg:text-base">Commission & Task Management</p>
                        </div>
                    </div>

                    {/* User Profile (Mobile) */}
                    {user && (
                        <div className="lg:hidden relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-indigo-800/50 hover:bg-indigo-800/70 rounded-full border border-indigo-400/30 transition-all"
                            >
                                <div className="bg-indigo-300 text-indigo-900 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                                    {user.fullName?.charAt(0).toUpperCase() || user.full_name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                            </button>

                            {showMenu && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl py-2 text-gray-800 z-50 animate-fade-in-down border border-gray-100">
                                    <div className="px-4 py-3 border-b border-gray-100">
                                        <p className="text-sm font-medium text-gray-900">{user.fullName || user.full_name}</p>
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

                {/* Bottom Row: Actions */}
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                    {/* Online Status */}
                    <div className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-full text-sm ${isOnline ? 'bg-green-500/20 text-green-100' : 'bg-red-500/20 text-red-100'}`}>
                        {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
                        <span className="font-medium hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
                    </div>

                    {/* Visibility Toggle */}
                    <button
                        onClick={onToggleAmounts}
                        className="p-2 md:p-2.5 bg-white/20 hover:bg-white/30 rounded-full transition-all"
                        title={hideAmounts ? 'Show amounts' : 'Hide amounts'}
                    >
                        {hideAmounts ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>

                    {/* Add Task Button */}
                    <button
                        onClick={onAddTask}
                        disabled={!isOnline}
                        className={`px-4 md:px-6 py-2 md:py-2.5 rounded-full font-medium flex items-center gap-2 transition-all transform hover:scale-105 text-sm md:text-base ${isOnline
                                ? 'bg-white text-indigo-600 hover:shadow-lg'
                                : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                            }`}
                    >
                        <Plus size={18} />
                        <span className="hidden sm:inline">Add Task</span>
                        <span className="sm:hidden">Add</span>
                    </button>

                    {/* User Profile (Desktop) */}
                    {user && (
                        <div className="hidden lg:block relative ml-auto">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="flex items-center gap-2 pl-2 pr-4 py-1.5 bg-indigo-800/50 hover:bg-indigo-800/70 rounded-full border border-indigo-400/30 transition-all"
                            >
                                <div className="bg-indigo-300 text-indigo-900 w-8 h-8 rounded-full flex items-center justify-center font-bold">
                                    {user.fullName?.charAt(0).toUpperCase() || user.full_name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <span className="text-sm font-medium max-w-[100px] truncate">
                                    {user.fullName || user.full_name}
                                </span>
                            </button>

                            {showMenu && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl py-2 text-gray-800 z-50 animate-fade-in-down border border-gray-100">
                                    <div className="px-4 py-3 border-b border-gray-100">
                                        <p className="text-sm font-medium text-gray-900">{user.fullName || user.full_name}</p>
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

            {/* Click outside listener */}
            {showMenu && (
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
            )}
        </div>
    );
};

export default Header;
