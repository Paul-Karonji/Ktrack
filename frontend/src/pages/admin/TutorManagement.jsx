import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/layout/Sidebar';
import {
  UserPlus, Users, Trash2, ShieldOff, ShieldCheck,
  Loader2, X, Mail, User, Lock, CheckCircle, AlertCircle
} from 'lucide-react';

const TutorManagement = () => {
  const { user, logout } = useAuth();
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ email: '', full_name: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadTutors = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getTutors();
      setTutors(data);
    } catch (err) {
      showToast('Failed to load tutors', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTutors(); }, [loadTutors]);

  const handleCreateTutor = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.full_name || !formData.password) {
      showToast('All fields are required', 'error');
      return;
    }
    try {
      setSubmitting(true);
      await apiService.createTutor(formData);
      showToast('Tutor created successfully!');
      setShowAddModal(false);
      setFormData({ email: '', full_name: '', password: '' });
      await loadTutors();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to create tutor', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuspend = async (tutorId, isActive) => {
    const action = isActive ? 'suspend' : 'unsuspend';
    const label = isActive ? 'Suspend' : 'Reactivate';
    if (!window.confirm(`${label} this tutor?`)) return;
    try {
      await apiService[isActive ? 'suspendUser' : 'unsuspendUser'](tutorId);
      showToast(`Tutor ${label.toLowerCase()}d successfully`);
      await loadTutors();
    } catch (err) {
      showToast(`Failed to ${label.toLowerCase()} tutor`, 'error');
    }
  };

  const handleDelete = async (tutorId, name) => {
    if (!window.confirm(`Permanently delete tutor "${name}"? This cannot be undone.`)) return;
    try {
      await apiService.deleteUser(tutorId);
      showToast('Tutor deleted');
      await loadTutors();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to delete tutor', 'error');
    }
  };

  const roleColor = (role) => role === 'superadmin'
    ? 'bg-purple-100 text-purple-700'
    : 'bg-indigo-100 text-indigo-700';

  const statusColor = (status) => status === 'approved'
    ? 'bg-emerald-100 text-emerald-700'
    : status === 'suspended'
      ? 'bg-red-100 text-red-600'
      : 'bg-yellow-100 text-yellow-700';

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar user={user} onLogout={logout} />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all
          ${toast.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {toast.message}
        </div>
      )}

      <div className="lg:ml-64 min-h-screen">
        <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">

          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Users size={20} className="text-white" />
                </span>
                Tutor Management
              </h1>
              <p className="text-gray-500 mt-1 ml-1">Add and manage tutors on the platform</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm"
            >
              <UserPlus size={16} />
              Add Tutor
            </button>
          </div>

          {/* Tutors Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-gray-400">
                <Loader2 className="animate-spin mr-2" size={20} /> Loading tutors...
              </div>
            ) : tutors.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <Users size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">No tutors yet</p>
                <p className="text-sm mt-1">Click "Add Tutor" to get started</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Tutor</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-4">Role</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-4">Status</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-4">Joined</th>
                    <th className="px-4 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tutors.map(tutor => (
                    <tr key={tutor.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                            {(tutor.full_name || tutor.email || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{tutor.full_name || '—'}</p>
                            <p className="text-xs text-gray-400">{tutor.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${roleColor(tutor.role)}`}>
                          {tutor.role === 'superadmin' ? 'Superadmin' : 'Tutor'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor(tutor.status)}`}>
                          {tutor.status || 'approved'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-400">
                        {tutor.created_at ? new Date(tutor.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-4">
                        {/* Don't allow actions on self */}
                        {tutor.id !== user?.id && tutor.role !== 'superadmin' && (
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => handleSuspend(tutor.id, tutor.status === 'approved')}
                              title={tutor.status === 'approved' ? 'Suspend' : 'Reactivate'}
                              className="p-2 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            >
                              {tutor.status === 'approved' ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}
                            </button>
                            <button
                              onClick={() => handleDelete(tutor.id, tutor.full_name)}
                              title="Delete tutor"
                              className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                        {tutor.id === user?.id && (
                          <span className="text-xs text-gray-300 italic">You</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Add Tutor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Add New Tutor</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateTutor} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))}
                    placeholder="John Doe"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    placeholder="tutor@example.com"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Temporary Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                    placeholder="Min. 8 characters"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                    required
                    minLength={8}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">An email will be automatically sent to the tutor with these login credentials.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-semibold shadow hover:shadow-md transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                  {submitting ? 'Creating...' : 'Create Tutor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TutorManagement;
