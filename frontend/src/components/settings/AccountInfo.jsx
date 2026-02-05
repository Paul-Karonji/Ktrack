import React from 'react';
import { Info, Mail, Shield, Calendar, Clock } from 'lucide-react';

const AccountInfo = ({ user }) => {
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getRoleBadge = (role) => {
        if (role === 'admin') {
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-purple-100 text-purple-800">
                    👨‍💼 Administrator
                </span>
            );
        }
        return (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                👤 Client
            </span>
        );
    };

    const getStatusBadge = (status) => {
        const badges = {
            approved: 'bg-green-100 text-green-800',
            pending: 'bg-yellow-100 text-yellow-800',
            rejected: 'bg-red-100 text-red-800',
            suspended: 'bg-gray-100 text-gray-800'
        };
        return (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${badges[status] || badges.pending}`}>
                {status?.charAt(0).toUpperCase() + status?.slice(1)}
            </span>
        );
    };

    return (
        <div className="bg-white rounded-2xl p-8 border-2 border-gray-100">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl">
                    <Info size={24} className="text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Account Information</h2>
                    <p className="text-gray-500">View your account details</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Email */}
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                    <Mail className="text-indigo-600 mt-1" size={20} />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-500 mb-1">Email Address</p>
                        <p className="text-lg font-semibold text-gray-900">{user?.email || 'N/A'}</p>
                    </div>
                </div>

                {/* Role */}
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                    <Shield className="text-purple-600 mt-1" size={20} />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-500 mb-2">Account Role</p>
                        {getRoleBadge(user?.role)}
                    </div>
                </div>

                {/* Status */}
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                    <Info className="text-green-600 mt-1" size={20} />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-500 mb-2">Account Status</p>
                        {getStatusBadge(user?.status)}
                    </div>
                </div>

                {/* Member Since */}
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                    <Calendar className="text-blue-600 mt-1" size={20} />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-500 mb-1">Member Since</p>
                        <p className="text-lg font-semibold text-gray-900">{formatDate(user?.created_at)}</p>
                    </div>
                </div>

                {/* Last Updated */}
                {user?.updated_at && (
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                        <Clock className="text-orange-600 mt-1" size={20} />
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-500 mb-1">Last Updated</p>
                            <p className="text-lg font-semibold text-gray-900">{formatDate(user?.updated_at)}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AccountInfo;
