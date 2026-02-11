import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Upload, Eye, MessageSquare, ArrowRight, Star, User, LogIn, PlayCircle } from 'lucide-react';
import { apiService } from '../services/api';
import ktrackLogo from '../assets/images/ktrack_logo.png';
import WhatsAppButton from '../components/common/WhatsAppButton';

const LandingPage = () => {
    const [stats, setStats] = useState({ clients: 0, jobsDone: 0 });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await apiService.getPublicStats();
                if (data.success) {
                    setStats(data.stats);
                }
            } catch (err) {
                console.error('Failed to load public stats', err);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800">
            {/* Navigation */}
            <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16 md:h-20">
                        <div className="flex items-center gap-2">
                            <img src={ktrackLogo} alt="K-Track" className="h-8 md:h-10 w-auto object-contain" />
                        </div>
                        <div className="flex items-center gap-2 md:gap-4">
                            <Link to="/login" className="text-gray-600 hover:text-indigo-600 font-medium transition-colors text-sm md:text-base">
                                Log In
                            </Link>
                            <Link to="/register" className="bg-indigo-600 text-white px-3 md:px-5 py-2 md:py-2.5 rounded-full font-medium hover:bg-indigo-700 transition-all hover:shadow-lg transform hover:-translate-y-0.5 text-sm md:text-base">
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
                        <span>Trusted by Clients Worldwide</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-extrabold tracking-tight text-gray-900 mb-6 md:mb-8 leading-tight px-4">
                        Submit Your Project. <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Track Progress.</span><br className="hidden sm:block" />
                        Get Results.
                    </h1>

                    <p className="mt-4 max-w-2xl mx-auto text-base md:text-lg lg:text-xl text-gray-600 mb-8 md:mb-10 leading-relaxed px-4">
                        The easiest way for clients to submit tasks and monitor their progress.
                        Upload your project, track every update, and stay connected with your service provider - all in one place.
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4 animate-fade-in-up delay-100 px-4">
                        <Link to="/register" className="inline-flex items-center justify-center px-6 md:px-8 lg:px-10 py-3 md:py-4 border border-transparent text-base md:text-lg font-bold rounded-full text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1">
                            Submit Your First Task
                            <ArrowRight className="ml-2 -mr-1 w-4 h-4 md:w-5 md:h-5" />
                        </Link>
                        <Link to="/login" className="inline-flex items-center justify-center px-8 py-4 border-2 border-gray-200 text-lg font-bold rounded-full text-gray-700 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10 transition-all hover:border-gray-300">
                            <LogIn className="mr-2 w-5 h-5" />
                            I Have an Account
                        </Link>
                    </div>
                    <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-indigo-100/50 flex flex-col sm:flex-row justify-center gap-8 md:gap-16 animate-fade-in-up delay-200 px-4">
                        <div className="text-center">
                            <p className="text-3xl md:text-4xl font-extrabold text-indigo-600 mb-1">{stats.clients > 0 ? stats.clients : '150'}+</p>
                            <p className="text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wide">Happy Clients</p>
                        </div>
                        <div className="hidden sm:block w-px h-16 bg-gradient-to-b from-transparent via-indigo-200 to-transparent"></div>
                        <div className="text-center">
                            <p className="text-3xl md:text-4xl font-extrabold text-purple-600 mb-1">{stats.jobsDone > 0 ? stats.jobsDone : '500'}+</p>
                            <p className="text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wide">Projects Completed</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* How It Works Section */}
            <section className="py-24 bg-white relative">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-4">How K-Track Works</h2>
                        <p className="mt-4 text-xl text-gray-600">Get started in 3 simple steps</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 mb-16">
                        {/* Step 1 */}
                        <div className="relative group">
                            <div className="text-center">
                                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-xl">
                                    <User className="w-10 h-10 text-white" />
                                </div>
                                <div className="bg-indigo-600 text-white text-sm font-bold px-3 py-1 rounded-full inline-block mb-4">STEP 1</div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-3">Create Account</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    Register with your email and wait for admin approval. You'll be notified when your account is ready.
                                </p>
                            </div>
                            {/* Connector line */}
                            <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-indigo-200 to-purple-200 -z-10"></div>
                        </div>

                        {/* Step 2 */}
                        <div className="relative group">
                            <div className="text-center">
                                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-xl">
                                    <Upload className="w-10 h-10 text-white" />
                                </div>
                                <div className="bg-purple-600 text-white text-sm font-bold px-3 py-1 rounded-full inline-block mb-4">STEP 2</div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-3">Submit Your Task</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    Upload your project details, attach files, set priority, and describe what you need done.
                                </p>
                            </div>
                            {/* Connector line */}
                            <div className="hidden md:block absolute top-10 left-full w-full h-0.5 bg-gradient-to-r from-purple-200 to-green-200 -z-10"></div>
                        </div>

                        {/* Step 3 */}
                        <div className="group">
                            <div className="text-center">
                                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-xl">
                                    <Eye className="w-10 h-10 text-white" />
                                </div>
                                <div className="bg-green-600 text-white text-sm font-bold px-3 py-1 rounded-full inline-block mb-4">STEP 3</div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-3">Track Progress</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    Monitor your task status, receive quotes, chat with admin, and download completed work.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Start CTA */}
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-3xl p-8 md:p-12 text-center">
                        <PlayCircle className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">Ready to Get Started?</h3>
                        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                            Join hundreds of clients who trust K-Track to manage their projects.
                            Create your free account now and submit your first task in minutes.
                        </p>
                        <Link
                            to="/register"
                            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-full font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                            <User size={20} />
                            Create Free Account
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-24 bg-gray-50 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Why Clients Love K-Track</h2>
                        <p className="mt-4 text-xl text-gray-600">Everything you need to manage your projects effortlessly</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {/* Feature 1 */}
                        <div className="group p-8 rounded-3xl bg-white hover:bg-white border border-gray-100 hover:border-indigo-100 hover:shadow-xl transition-all duration-300">
                            <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-indigo-600">
                                <CheckCircle size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Real-Time Updates</h3>
                            <p className="text-gray-600 leading-relaxed">
                                See exactly where your project stands. Get instant notifications when status changes or messages arrive.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="group p-8 rounded-3xl bg-white hover:bg-white border border-gray-100 hover:border-purple-100 hover:shadow-xl transition-all duration-300">
                            <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-purple-600">
                                <MessageSquare size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Direct Communication</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Chat directly with your service provider. Ask questions, provide feedback, and clarify details instantly.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="group p-8 rounded-3xl bg-white hover:bg-white border border-gray-100 hover:border-blue-100 hover:shadow-xl transition-all duration-300">
                            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-blue-600">
                                <Upload size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Easy File Sharing</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Upload reference files, download completed work, and keep all project files organized in one place.
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

            {/* WhatsApp Contact Button */}
            <WhatsAppButton />
        </div>
    );
};

export default LandingPage;
