import React, { useState } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import Sidebar from '../components/layout/Sidebar';
import ProfileSettings from '../components/settings/ProfileSettings';
import SecuritySettings from '../components/settings/SecuritySettings';
import AccountInfo from '../components/settings/AccountInfo';

const Settings = () => {
    const { user, logout, updateUser } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');

    const handleUpdateProfile = async (data) => {
        const result = await apiService.updateProfile(data);
        // Update user in context
        if (updateUser && result.user) {
            updateUser(result.user);
        }
        return result;
    };

    const handleChangePassword = async (data) => {
        return await apiService.changePassword(data);
    };

    const handleUpdateEmail = async (data) => {
        const result = await apiService.updateEmail(data);
        // Update user in context
        if (updateUser && result.user) {
            updateUser(result.user);
        }
        return result;
    };

    const tabs = [
        { id: 'profile', label: 'Profile' },
        { id: 'security', label: 'Security' },
        { id: 'account', label: 'Account Info' }
    ];

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Sidebar user={user} onLogout={logout} />

            <main className="flex-1 ml-64 p-8">
                <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                    {/* Header */}
                    <div>
                        <h1 className="text-5xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                            <SettingsIcon size={48} className="text-indigo-600" />
                            Settings
                        </h1>
                        <p className="text-lg text-gray-500">Customize your K-Track experience</p>
                    </div>

                    {/* Tabs */}
                    <div className="bg-white rounded-2xl p-2 border-2 border-gray-100 inline-flex gap-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === tab.id
                                        ? 'bg-indigo-600 text-white shadow-lg'
                                        : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div>
                        {activeTab === 'profile' && (
                            <ProfileSettings user={user} onUpdate={handleUpdateProfile} />
                        )}

                        {activeTab === 'security' && (
                            <SecuritySettings
                                onChangePassword={handleChangePassword}
                                onUpdateEmail={handleUpdateEmail}
                            />
                        )}

                        {activeTab === 'account' && (
                            <AccountInfo user={user} />
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Settings;
