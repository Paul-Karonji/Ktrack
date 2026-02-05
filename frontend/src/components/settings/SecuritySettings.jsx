import React, { useState } from 'react';
import { Lock, Mail, Key } from 'lucide-react';

const SecuritySettings = ({ onChangePassword, onUpdateEmail }) => {
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [emailData, setEmailData] = useState({
        newEmail: '',
        password: ''
    });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [emailSuccess, setEmailSuccess] = useState('');

    const handlePasswordChange = (e) => {
        setPasswordData({
            ...passwordData,
            [e.target.name]: e.target.value
        });
        setPasswordError('');
        setPasswordSuccess('');
    };

    const handleEmailChange = (e) => {
        setEmailData({
            ...emailData,
            [e.target.name]: e.target.value
        });
        setEmailError('');
        setEmailSuccess('');
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordLoading(true);
        setPasswordError('');
        setPasswordSuccess('');

        // Validation
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordError('New passwords do not match');
            setPasswordLoading(false);
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            setPasswordLoading(false);
            return;
        }

        try {
            await onChangePassword({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            setPasswordSuccess('Password changed successfully!');
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (err) {
            setPasswordError(err.response?.data?.error || 'Failed to change password');
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setEmailLoading(true);
        setEmailError('');
        setEmailSuccess('');

        try {
            await onUpdateEmail(emailData);
            setEmailSuccess('Email updated successfully!');
            setEmailData({
                newEmail: '',
                password: ''
            });
        } catch (err) {
            setEmailError(err.response?.data?.error || 'Failed to update email');
        } finally {
            setEmailLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Change Password */}
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
                        <Key size={24} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Change Password</h2>
                        <p className="text-gray-500">Update your account password</p>
                    </div>
                </div>

                {passwordError && (
                    <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700">
                        {passwordError}
                    </div>
                )}

                {passwordSuccess && (
                    <div className="mb-4 p-4 bg-green-50 border-2 border-green-200 rounded-xl text-green-700">
                        {passwordSuccess}
                    </div>
                )}

                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Current Password *
                        </label>
                        <input
                            type="password"
                            name="currentPassword"
                            value={passwordData.currentPassword}
                            onChange={handlePasswordChange}
                            required
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                            placeholder="Enter current password"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            New Password *
                        </label>
                        <input
                            type="password"
                            name="newPassword"
                            value={passwordData.newPassword}
                            onChange={handlePasswordChange}
                            required
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                            placeholder="Enter new password (min 6 characters)"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Confirm New Password *
                        </label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={passwordData.confirmPassword}
                            onChange={handlePasswordChange}
                            required
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                            placeholder="Confirm new password"
                        />
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={passwordLoading}
                            className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Lock size={20} />
                            {passwordLoading ? 'Changing...' : 'Change Password'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Update Email */}
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
                        <Mail size={24} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Update Email Address</h2>
                        <p className="text-gray-500">Change your login email</p>
                    </div>
                </div>

                {emailError && (
                    <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700">
                        {emailError}
                    </div>
                )}

                {emailSuccess && (
                    <div className="mb-4 p-4 bg-green-50 border-2 border-green-200 rounded-xl text-green-700">
                        {emailSuccess}
                    </div>
                )}

                <form onSubmit={handleEmailSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            New Email Address *
                        </label>
                        <input
                            type="email"
                            name="newEmail"
                            value={emailData.newEmail}
                            onChange={handleEmailChange}
                            required
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            placeholder="Enter new email address"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Confirm Password *
                        </label>
                        <input
                            type="password"
                            name="password"
                            value={emailData.password}
                            onChange={handleEmailChange}
                            required
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            placeholder="Enter your password to confirm"
                        />
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={emailLoading}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Mail size={20} />
                            {emailLoading ? 'Updating...' : 'Update Email'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SecuritySettings;
