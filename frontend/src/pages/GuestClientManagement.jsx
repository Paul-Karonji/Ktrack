import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Trash2, Edit2, AlertTriangle, Phone, Mail, BookOpen } from 'lucide-react';
import api from '../services/api';

const GuestClientManagement = ({ isOnline }) => {
    const [guests, setGuests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', course: '', notes: '' });
    const [editingId, setEditingId] = useState(null);
    const [duplicateWarning, setDuplicateWarning] = useState(null);

    useEffect(() => {
        fetchGuests();
    }, []);

    const fetchGuests = async () => {
        try {
            setLoading(true);
            const response = await api.get('/guest-clients');
            setGuests(response.data.guests);
        } catch (error) {
            console.error('Failed to fetch guests', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setDuplicateWarning(null); // Clear warnings on edit
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/guest-clients/${editingId}`, formData);
            } else {
                const response = await api.post('/guest-clients', formData);
                if (response.data.warning) {
                    setDuplicateWarning(response.data);
                    return; // Stop here, show warning
                }
            }
            resetForm();
            fetchGuests();
        } catch (error) {
            if (error.response?.data?.existingGuest) {
                setDuplicateWarning({
                    error: true,
                    message: error.response.data.error,
                    existingGuest: error.response.data.existingGuest
                });
            } else {
                console.error('Error saving guest', error);
                alert('Failed to save guest client');
            }
        }
    };



    const handleDelete = async (id) => {
        if (window.confirm('Are you sure? This guest client will be permanently deleted.')) {
            try {
                await api.delete(`/guest-clients/${id}`);
                fetchGuests();
            } catch (error) {
                console.error('Failed to delete', error);
            }
        }
    };

    const handleEdit = (guest) => {
        setFormData({
            name: guest.name,
            email: guest.email || '',
            phone: guest.phone || '',
            course: guest.course || '',
            notes: guest.notes || ''
        });
        setEditingId(guest.id);
        setShowForm(true);
        setDuplicateWarning(null);
    };

    const resetForm = () => {
        setFormData({ name: '', email: '', phone: '', course: '', notes: '' });
        setEditingId(null);
        setShowForm(false);
        setDuplicateWarning(null);
    };

    const filteredGuests = guests.filter(g =>
        g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (g.email && g.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (g.phone && g.phone.includes(searchTerm))
    );

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <Users className="text-indigo-600" />
                        Guest Clients
                    </h1>
                    <p className="text-gray-500 mt-1">Manage external clients and their tasks</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-all font-semibold shadow-lg shadow-indigo-200"
                >
                    <Plus size={20} />
                    {showForm ? 'Close Form' : 'Add Guest Client'}
                </button>
            </div>

            {/* Form Section */}
            {showForm && (
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-indigo-100 animate-in fade-in slide-in-from-top-4">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">
                        {editingId ? 'Edit Guest Client' : 'New Guest Client'}
                    </h2>

                    {duplicateWarning && (
                        <div className={`p-4 rounded-xl mb-6 ${duplicateWarning.error ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'}`}>
                            <div className="flex items-start gap-3">
                                <AlertTriangle className={duplicateWarning.error ? 'text-red-500' : 'text-orange-500'} />
                                <div>
                                    <h3 className={`font-bold ${duplicateWarning.error ? 'text-red-800' : 'text-orange-800'}`}>
                                        {duplicateWarning.error ? 'Duplicate Detected' : 'Potential Duplicate'}
                                    </h3>
                                    <p className={`text-sm mt-1 ${duplicateWarning.error ? 'text-red-600' : 'text-orange-600'}`}>
                                        {duplicateWarning.message}
                                    </p>

                                    {duplicateWarning.duplicates && (
                                        <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                                            {duplicateWarning.duplicates.map(d => (
                                                <li key={d.id}>{d.name} {d.phone && `(${d.phone})`} - {d.taskCount} tasks</li>
                                            ))}
                                        </ul>
                                    )}

                                    {!duplicateWarning.error && (
                                        <div className="mt-3 flex gap-3">
                                            <button
                                                // I need to implement force create in backend first
                                                // For now, let's assume we pass { force: true }
                                                onClick={async () => {
                                                    try {
                                                        await api.post('/guest-clients', { ...formData, force: true });
                                                        resetForm();
                                                        fetchGuests();
                                                    } catch (e) { console.error(e); }
                                                }}
                                                className="bg-orange-100 text-orange-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-orange-200"
                                            >
                                                Create Anyway
                                            </button>
                                            <button
                                                onClick={() => setDuplicateWarning(null)}
                                                className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                                            >
                                                Edit Details
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Email (Optional)</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Phone (Highly Recommended)</label>
                            <input
                                type="text"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="e.g. +254..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Course/Program</label>
                            <input
                                type="text"
                                name="course"
                                value={formData.course}
                                onChange={handleInputChange}
                                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                rows={2}
                            />
                        </div>
                        <div className="md:col-span-2 flex gap-3 pt-2">
                            <button
                                type="submit"
                                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg hover:bg-indigo-700 transition-all"
                            >
                                {editingId ? 'Update Client' : 'Save Client'}
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="bg-gray-100 text-gray-600 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search guest clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-lg"
                />
            </div>

            {/* List */}
            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading guests...</div>
            ) : filteredGuests.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-300">
                    <Users size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">No guest clients found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredGuests.map(guest => (
                        <div key={guest.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <Users size={24} />
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(guest)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                                        <Edit2 size={18} />
                                    </button>
                                    <button onClick={() => handleDelete(guest.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-gray-800 mb-1">{guest.name}</h3>
                            <div className="flex flex-col gap-2 mt-4">
                                {guest.phone && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Phone size={16} className="text-gray-400" />
                                        {guest.phone}
                                    </div>
                                )}
                                {guest.email && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Mail size={16} className="text-gray-400" />
                                        {guest.email}
                                    </div>
                                )}
                                {guest.course && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <BookOpen size={16} className="text-gray-400" />
                                        {guest.course}
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Activity</span>
                                <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
                                    {guest.task_count || 0} Tasks
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default GuestClientManagement;

