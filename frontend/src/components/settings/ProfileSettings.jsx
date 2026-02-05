import React, { useState } from 'react';
import { User, Save } from 'lucide-react';

const ProfileSettings = ({ user, onUpdate }) => {
    const [formData, setFormData] = useState({
        fullName: user?.fullName || '',
        phoneNumber: user?.phoneNumber || '',
        course: user?.course || ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            await onUpdate(formData);
            setSuccess('Profile updated successfully!');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl p-8 border-2 border-gray-100">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
                    <User size={24} className="text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Profile Information</h2>
                    <p className="text-gray-500">Update your personal details</p>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700">
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-4 p-4 bg-green-50 border-2 border-green-200 rounded-xl text-green-700">
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Full Name *
                    </label>
                    <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        placeholder="Enter your full name"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Phone Number
                    </label>
                    <input
                        type="tel"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        placeholder="+1234567890"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Course
                    </label>
                    <input
                        type="text"
                        name="course"
                        value={formData.course}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        placeholder="e.g., Bachelor in Software Development"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={() => {
                            setFormData({
                                fullName: user?.fullName || '',
                                phoneNumber: user?.phoneNumber || '',
                                course: user?.course || ''
                            });
                            setError('');
                            setSuccess('');
                        }}
                        className="px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save size={20} />
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProfileSettings;
