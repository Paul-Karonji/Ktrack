import React, { useState, useEffect } from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import Sidebar from '../../components/layout/Sidebar';
import apiService from '../../services/api';
import { Gift, Menu, Users, Search, AlertCircle, DollarSign, Edit2, Check, X } from 'lucide-react';

const AdminReferrals = () => {
    const { user, logout } = useAuth();
    const { openSidebar } = useNavigation();
    const isOnline = useOnlineStatus();

    const [referrals, setReferrals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchReferrals = async () => {
        try {
            setLoading(true);
            const data = await apiService.getAllReferrals();
            setReferrals(data.referrals || []);
        } catch (error) {
            console.error('Failed to fetch referrals:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReferrals();
    }, []);

    const filteredReferrals = referrals.filter(r =>
        r.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.referrer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.referrer_email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOnline) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-red-50 text-red-700 p-6 rounded-xl text-center">
                    <AlertCircle size={40} className="mx-auto mb-2" />
                    <h2 className="text-xl font-bold">Offline</h2>
                    <p>You need to be online to view referrals.</p>
                </div>
            </div>
        );
    }

    if (user?.role !== 'superadmin') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
                <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
                    <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
                    <p className="text-gray-500">Only superadmins can view the master referral list.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar user={user} onLogout={logout} />

            <div className="flex-1 lg:ml-64 p-4 md:p-8 relative">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="mb-8 flex items-center gap-3">
                        <button onClick={openSidebar} className="lg:hidden p-2 hover:bg-gray-200 rounded-lg transition-colors">
                            <Menu size={24} className="text-gray-600" />
                        </button>
                        <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                            <Gift size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 tracking-tight">Referrals Tracking</h1>
                            <p className="text-gray-500 font-medium">View all referred clients and manage rewards</p>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by name or email (referrer or referred)..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 p-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Main Content */}
                    {loading ? (
                        <div className="py-20 flex justify-center"><LoadingSpinner size="large" /></div>
                    ) : filteredReferrals.length === 0 ? (
                        <div className="bg-white rounded-3xl p-16 text-center border border-dashed border-gray-200 shadow-sm">
                            <Gift size={64} className="mx-auto text-gray-200 mb-4" />
                            <h3 className="text-xl font-bold text-gray-700 mb-2">No referrals found</h3>
                            <p className="text-gray-500">There are currently no tracked referrals in the system.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest">Referred Client</th>
                                            <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest">Referred By</th>
                                            <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-widest">Date Joined</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredReferrals.map((ref) => (
                                            <tr key={ref.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="p-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                                            {ref.full_name?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-900">{ref.full_name}</div>
                                                            <div className="text-xs text-gray-400 font-medium">{ref.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    <div className="inline-flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100">
                                                        <div className="w-6 h-6 rounded-full bg-orange-200 text-orange-700 flex items-center justify-center text-[10px] font-black">
                                                            {ref.referrer_name?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-orange-900 leading-none">{ref.referrer_name}</div>
                                                            <div className="text-[10px] text-orange-600 uppercase font-bold tracking-widest mt-0.5">{ref.referrer_email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-5 text-sm font-medium text-gray-500">
                                                    {new Date(ref.created_at).toLocaleDateString(undefined, {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminReferrals;
