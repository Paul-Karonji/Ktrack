import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { UserPlus, User, Mail, Lock, Phone, BookOpen, AlertCircle, Eye, EyeOff, CheckCircle, Clock, ArrowRight, ChevronRight } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';

import ktrackLogo from '../../assets/images/ktrack_logo.png';

// Password strength rule checker
const checkPasswordRules = (password) => ({
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[@$!%*?&]/.test(password),
});

const PasswordRule = ({ met, label }) => (
    <div className={`flex items-center gap-1.5 text-xs transition-colors duration-200 ${met ? 'text-green-600' : 'text-gray-400'}`}>
        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${met ? 'bg-green-100' : 'bg-gray-100'}`}>
            {met ? (
                <svg className="w-2.5 h-2.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            ) : (
                <div className="w-1 h-1 rounded-full bg-gray-300" />
            )}
        </div>
        <span>{label}</span>
    </div>
);

const Register = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        phoneNumber: '',
        course: ''
    });
    const [localError, setLocalError] = useState('');
    const [success, setSuccess] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const { register, loading, error } = useAuth();

    const passwordRules = checkPasswordRules(formData.password);
    const allRulesMet = Object.values(passwordRules).every(Boolean);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');

        if (formData.password !== formData.confirmPassword) {
            setLocalError('Passwords do not match');
            return;
        }

        if (!allRulesMet) {
            setLocalError('Please meet all password requirements before submitting');
            return;
        }

        try {
            const { confirmPassword, ...registerData } = formData;
            console.log('[Register] Submitting registration for:', formData.email);
            await register(registerData);
            console.log('[Register] Registration success state being set to true');
            setRegisteredEmail(formData.email);
            setSuccess(true);
            window.scrollTo(0, 0); // Ensure user sees the success message
        } catch (err) {
            console.error('[Register] Registration submission failed:', err);
            // Error is handled by context
        }
    };

    // ─── Premium Success Screen ──────────────────────────────────────────────
    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

                    {/* Gradient top bar */}
                    <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-600" />

                    <div className="p-8 text-center">
                        {/* Animated checkmark */}
                        <div className="relative inline-flex items-center justify-center mb-6">
                            <div className="absolute w-20 h-20 rounded-full bg-green-100 animate-ping opacity-30" />
                            <div className="relative w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle className="w-10 h-10 text-green-500" />
                            </div>
                        </div>

                        <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Registration Successful!</h2>
                        <p className="text-gray-600 text-lg mb-2">
                            Your account request has been submitted.
                        </p>
                        <p className="font-semibold text-indigo-600 mb-6 text-sm break-all">
                            {registeredEmail}
                        </p>

                        {/* Step flow */}
                        <div className="bg-gray-50 rounded-xl p-5 mb-6">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">What happens next</p>
                            <div className="flex items-start gap-3 text-left">
                                {/* Step 1 */}
                                <div className="flex flex-col items-center">
                                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                    </div>
                                    <div className="w-0.5 h-8 bg-gray-200 mt-1" />
                                </div>
                                <div className="pt-1 flex-1">
                                    <p className="text-sm font-semibold text-gray-800">Submitted</p>
                                    <p className="text-xs text-gray-400">Your account request is in</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 text-left">
                                {/* Step 2 */}
                                <div className="flex flex-col items-center">
                                    <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                                        <Clock className="w-4 h-4 text-yellow-500" />
                                    </div>
                                    <div className="w-0.5 h-8 bg-gray-200 mt-1" />
                                </div>
                                <div className="pt-1 flex-1">
                                    <p className="text-sm font-semibold text-gray-800">Admin review</p>
                                    <p className="text-xs text-gray-400">We'll verify your details</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 text-left">
                                {/* Step 3 */}
                                <div className="flex flex-col items-center">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                        <Mail className="w-4 h-4 text-indigo-500" />
                                    </div>
                                </div>
                                <div className="pt-1 flex-1">
                                    <p className="text-sm font-semibold text-gray-800">Email notification</p>
                                    <p className="text-xs text-gray-400">You'll get an email once we approve your account</p>
                                </div>
                            </div>
                        </div>

                        {/* Note */}
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-left flex gap-3">
                            <Mail className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-700 leading-relaxed">
                                A confirmation email has been sent to <strong>{registeredEmail}</strong>. Check your inbox (and spam folder) for details.
                            </p>
                        </div>

                        <Link
                            to="/login"
                            className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none transition-all"
                        >
                            Go to Login
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Registration Form ───────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 py-8">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-6">
                            <img src={ktrackLogo} alt="K-Track Logo" className="h-16 object-contain" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
                        <p className="text-gray-600 mt-2">Join to submit tasks and track progress</p>
                    </div>

                    {(error || localError) && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r">
                            <div className="flex items-center">
                                <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                                <p className="text-red-700 text-sm">{localError || error}</p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="john@example.com"
                                    required
                                />
                            </div>
                        </div>

                        {/* Phone + Course */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Phone className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="tel"
                                        name="phoneNumber"
                                        value={formData.phoneNumber}
                                        onChange={handleChange}
                                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="+1 234 567 890"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Course/Program</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <BookOpen className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        name="course"
                                        value={formData.course}
                                        onChange={handleChange}
                                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Computer Science"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    onFocus={() => setPasswordFocused(true)}
                                    className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-600 focus:outline-none"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>

                            {/* Inline password strength hints */}
                            {(passwordFocused || formData.password.length > 0) && (
                                <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100 grid grid-cols-2 gap-1.5">
                                    <PasswordRule met={passwordRules.minLength} label="At least 8 characters" />
                                    <PasswordRule met={passwordRules.hasUppercase} label="Uppercase letter" />
                                    <PasswordRule met={passwordRules.hasLowercase} label="Lowercase letter" />
                                    <PasswordRule met={passwordRules.hasNumber} label="Number (0–9)" />
                                    <PasswordRule met={passwordRules.hasSpecial} label="Special char (@$!%*?&)" />
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-600 focus:outline-none"
                                >
                                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                            {/* Match indicator */}
                            {formData.confirmPassword.length > 0 && (
                                <p className={`text-xs mt-1.5 ${formData.password === formData.confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                                    {formData.password === formData.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <div className="flex items-center">
                                    <div className="animate-spin -ml-1 mr-2 h-4 w-4 text-white">
                                        <LoadingSpinner size="small" color="white" />
                                    </div>
                                    Creating Account...
                                </div>
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center space-y-4">
                        <p className="text-sm text-gray-600">
                            Already have an account?{' '}
                            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                                Sign in
                            </Link>
                        </p>
                        <div className="border-t pt-4">
                            <Link to="/" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
                                ← Back to Homepage
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
