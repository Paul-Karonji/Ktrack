import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import ktrackLogo from '../assets/images/ktrack_logo.png';

const PasswordRequirement = ({ met, label }) => (
    <li className={`flex items-center gap-2 text-xs ${met ? 'text-green-600' : 'text-gray-400'}`}>
        <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${met ? 'bg-green-100' : 'bg-gray-100'}`}>
            {met ? '✓' : '·'}
        </span>
        {label}
    </li>
);

const ResetPasswordPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const requirements = {
        length: newPassword.length >= 8,
        upper: /[A-Z]/.test(newPassword),
        lower: /[a-z]/.test(newPassword),
        number: /\d/.test(newPassword),
        special: /[@$!%*?&]/.test(newPassword)
    };
    const allMet = Object.values(requirements).every(Boolean);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!token) {
            setError('No reset token found. Please use the link from your email.');
            return;
        }

        if (!allMet) {
            setError('Password does not meet all requirements.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword })
            });
            const data = await res.json();

            if (res.ok) {
                setSuccess(true);
                setTimeout(() => navigate('/login'), 3000);
            } else {
                setError(data.error || 'Failed to reset password. The link may have expired.');
            }
        } catch {
            setError('Network error. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h2>
                    <p className="text-gray-600 mb-6">This reset link is missing a token. Please use the link sent to your email.</p>
                    <Link to="/forgot-password" className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
                        Request New Link
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-6">
                            <img src={ktrackLogo} alt="K-Track Logo" className="h-16 object-contain" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900">Reset Password</h2>
                        <p className="text-gray-600 mt-2">Enter your new password below</p>
                    </div>

                    {success ? (
                        <div className="text-center">
                            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Password Reset!</h3>
                            <p className="text-gray-600 mb-2">Your password has been updated successfully.</p>
                            <p className="text-sm text-gray-400">Redirecting to login...</p>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r">
                                    <div className="flex items-center">
                                        <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                                        <p className="text-red-700 text-sm">{error}</p>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                            placeholder="••••••••"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-600"
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>

                                    {newPassword.length > 0 && (
                                        <ul className="mt-2 space-y-1">
                                            <PasswordRequirement met={requirements.length} label="At least 8 characters" />
                                            <PasswordRequirement met={requirements.upper} label="One uppercase letter" />
                                            <PasswordRequirement met={requirements.lower} label="One lowercase letter" />
                                            <PasswordRequirement met={requirements.number} label="One number" />
                                            <PasswordRequirement met={requirements.special} label="One special character (@$!%*?&)" />
                                        </ul>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Confirm New Password
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type={showConfirm ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                            placeholder="••••••••"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm(!showConfirm)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-600"
                                        >
                                            {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                    {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                                        <p className="mt-1 text-xs text-red-500">Passwords do not match.</p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !allMet}
                                    className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all ${(loading || !allMet) ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {loading ? 'Resetting...' : 'Reset Password'}
                                </button>
                            </form>
                        </>
                    )}

                    {!success && (
                        <div className="mt-6 text-center">
                            <Link
                                to="/login"
                                className="text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center justify-center gap-2 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to Login
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
