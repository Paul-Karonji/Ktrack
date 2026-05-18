import React, { useState, useEffect } from 'react';
import { Gift, Copy, CheckCircle, Users } from 'lucide-react';
import api from '../../services/api';

const ReferralSection = ({ user }) => {
    const [referrals, setReferrals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchReferrals = async () => {
            try {
                const data = await api.getMyReferrals();
                setReferrals(data.referrals || []);
            } catch (error) {
                console.error('Failed to fetch referrals:', error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchReferrals();
        }
    }, [user]);

    const referralLink = `${window.location.origin}/register?ref=${user?.referralCode || ''}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!user) return null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <Gift className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Refer & Earn</h2>
                        <p className="text-sm text-gray-500">Invite friends and earn discounts on your next tasks</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-500">Available Discount</p>
                    <p className="text-2xl font-bold text-green-600">${parseFloat(user.referralDiscountBalance || 0).toFixed(2)}</p>
                </div>
            </div>

            <div className="p-6">
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Your Unique Referral Link</label>
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            readOnly
                            value={referralLink}
                            className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-2 text-gray-600 focus:outline-none focus:border-indigo-300"
                        />
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                </div>

                <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    Your Referrals
                </h3>

                {loading ? (
                    <div className="text-center py-4 text-gray-500">Loading referrals...</div>
                ) : referrals.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                        <p className="text-gray-500">You haven't referred anyone yet.</p>
                        <p className="text-sm text-gray-400 mt-1">Share your link above to get started!</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined Date</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {referrals.map((ref) => (
                                    <tr key={ref.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{ref.full_name}</div>
                                            <div className="text-sm text-gray-500">{ref.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                ref.status === 'approved' ? 'bg-green-100 text-green-800' : 
                                                ref.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {ref.status.charAt(0).toUpperCase() + ref.status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(ref.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReferralSection;
