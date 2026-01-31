import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Shield, Clock, ArrowRight, Star } from 'lucide-react';
import ktrackLogo from '../assets/images/ktrack_logo.png';

const LandingPage = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800">
            {/* Navigation */}
            <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center gap-2">
                            <img src={ktrackLogo} alt="K-Track" className="h-10 w-auto object-contain" />
                        </div>
                        <div className="flex items-center gap-4">
                            <Link to="/login" className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">
                                Log In
                            </Link>
                            <Link to="/register" className="bg-indigo-600 text-white px-5 py-2.5 rounded-full font-medium hover:bg-indigo-700 transition-all hover:shadow-lg transform hover:-translate-y-0.5">
                                Get Started
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative overflow-hidden pt-16 pb-24 lg:pt-32 lg:pb-40">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 -z-10" />
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-100/30 to-transparent -z-10 rounded-bl-[100px]" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-medium text-sm mb-8 animate-fade-in-up">
                        <Star size={14} className="fill-indigo-700" />
                        <span>The #1 Task Management Platform</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-8 leading-tight">
                        Track Tasks. <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Get Paid.</span><br />
                        Scale Your Work.
                    </h1>

                    <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-600 mb-10 leading-relaxed">
                        K-Track acts as the bridge between professionals and clients.
                        Manage commissions, track revisions, and confirm payments in one unified dashboard.
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-up delay-100">
                        <Link to="/register" className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-bold rounded-full text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1">
                            Start Tracking Now
                            <ArrowRight className="ml-2 -mr-1 w-5 h-5" />
                        </Link>
                        <Link to="/login" className="inline-flex items-center justify-center px-8 py-4 border-2 border-gray-200 text-lg font-bold rounded-full text-gray-700 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10 transition-all hover:border-gray-300">
                            Client Login
                        </Link>
                    </div>
                </div>
            </header>

            {/* Features Grid */}
            <section className="py-24 bg-white relative">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Why Professionals Choose K-Track</h2>
                        <p className="mt-4 text-xl text-gray-600">Built for efficiency, security, and peace of mind.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {/* Feature 1 */}
                        <div className="group p-8 rounded-3xl bg-gray-50 hover:bg-white border border-transparent hover:border-indigo-100 hover:shadow-xl transition-all duration-300">
                            <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-indigo-600">
                                <CheckCircle size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Real-time Tracking</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Never lose track of a project again. Client and admin dashboards stay in sync with instant status updates.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="group p-8 rounded-3xl bg-gray-50 hover:bg-white border border-transparent hover:border-purple-100 hover:shadow-xl transition-all duration-300">
                            <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-purple-600">
                                <Shield size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Payment Tracking</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Keep accurate records of all commissions. Mark projects as paid and maintain a clear financial history.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="group p-8 rounded-3xl bg-gray-50 hover:bg-white border border-transparent hover:border-blue-100 hover:shadow-xl transition-all duration-300">
                            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-blue-600">
                                <Clock size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Deadline Management</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Automated alerts and clear timeline views keep everyone aligned on delivery dates and expectations.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-12 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
                        <img src={ktrackLogo} alt="K-Track" className="h-8 w-auto brightness-0 invert" />
                    </div>
                    <div className="text-gray-400 text-sm">
                        © {new Date().getFullYear()} K-Track Systems. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
