import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../services/api';

const VerifyEmailPage = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'already_verified' | 'error'
    const [message, setMessage] = useState('');

    useEffect(() => {
        const token = searchParams.get('token');

        if (!token) {
            setStatus('error');
            setMessage('No verification token found in the link. Please check your email and try again.');
            return;
        }

        const verify = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/auth/verify-email?token=${encodeURIComponent(token)}`);
                const data = await res.json();

                if (res.ok) {
                    if (data.message && data.message.includes('already')) {
                        setStatus('already_verified');
                    } else {
                        setStatus('success');
                    }
                    setMessage(data.message || 'Your email has been verified.');
                } else {
                    setStatus('error');
                    setMessage(data.error || 'Verification failed. The link may have expired.');
                }
            } catch {
                setStatus('error');
                setMessage('Something went wrong. Please try again.');
            }
        };

        verify();
    }, [searchParams]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
                {status === 'loading' && (
                    <>
                        <Loader2 className="w-16 h-16 text-indigo-500 mx-auto mb-4 animate-spin" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying your email...</h2>
                        <p className="text-gray-500">Just a moment.</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h2>
                        <p className="text-gray-600 mb-6">{message}</p>
                        <Link
                            to="/login"
                            className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                        >
                            Log In Now
                        </Link>
                    </>
                )}

                {status === 'already_verified' && (
                    <>
                        <CheckCircle className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Already Verified</h2>
                        <p className="text-gray-600 mb-6">{message}</p>
                        <Link
                            to="/login"
                            className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                        >
                            Go to Login
                        </Link>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
                        <p className="text-gray-600 mb-6">{message}</p>
                        <div className="space-y-3">
                            <Link
                                to="/login"
                                className="block bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                            >
                                Back to Login
                            </Link>
                            <p className="text-sm text-gray-500">
                                Need a new link?{' '}
                                <Link to="/login" className="text-indigo-600 hover:underline font-medium">
                                    Request resend on the login page
                                </Link>
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default VerifyEmailPage;
