import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, FileText, CheckCircle, Clock, Plus, Search, HardDrive, Phone, Mail, Edit2, X } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { apiService } from '../services/api';
import StatCard from '../components/dashboard/StatCard';
import TaskTable from '../components/tasks/TaskTable';
import TaskForm from '../components/tasks/TaskForm';
import AdminFilesView from '../components/admin/AdminFilesView';

const AdminDashboard = ({
    user,
    tasks,
    loadTasks,
    onLogout,
    // Handlers passed from parent
    isOnline,
    hideAmounts,
    onEdit,
    onDelete,
    onTogglePayment,
    onAddTask,
    onDownloadFile,
    onUploadFile,
    onDeliverWork,
    onQuoteResponse,
    onSendQuote,
    onDuplicate,
    // ...
    // Form props
    showForm,
    setShowForm,
    formData,
    setFormData,
    editingTask,
    handleFormSubmit, // renamed for clarity
    handleInputChange,
    resetForm
}) => {
    // Admin specific state
    const [stats, setStats] = useState(null);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [guestClients, setGuestClients] = useState([]);
    const [editingClient, setEditingClient] = useState(null); // { type: 'user'|'guest', data: ... }
    const [showClientForm, setShowClientForm] = useState(false);
    const [activeTab, setActiveTab] = useState('tasks'); // 'tasks', 'users', 'analytics', 'files'
    const [searchTerm, setSearchTerm] = useState('');

    // Calculate file statistics
    const totalFiles = tasks.reduce((sum, t) => sum + (t.file_count || 0), 0);
    const tasksWithFiles = tasks.filter(t => t.has_file).length;
    const totalStorage = tasks.reduce((sum, t) => sum + (t.total_file_size || 0), 0);

    // Filter tasks by search
    const filteredTasks = searchTerm
        ? tasks.filter(t =>
            t.task_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.task_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : tasks;

    // Load extra admin data
    useEffect(() => {
        loadAdminData();
    }, []);

    const loadAdminData = async () => {
        try {
            const [pendingData, usersData, guestsData, statsData] = await Promise.all([
                apiService.getUsers({ status: 'pending' }),
                apiService.getUsers(),
                apiService.getGuestClients(),
                apiService.getUserStats()
            ]);
            setPendingUsers(pendingData);
            setAllUsers(usersData);
            setGuestClients(guestsData.guests || []); // guestsData structure might differ, check API
            setStats(statsData);
        } catch (err) {
            console.error('Failed to load admin data', err);
        }
    };

    const handleApproveUser = async (id) => {
        if (!window.confirm('Approve this user?')) return;
        try {
            await apiService.approveUser(id);
            loadAdminData(); // Refresh list
        } catch (err) {
            alert('Failed to approve user');
        }
    };

    const handleClientUpdate = async (e) => {
        e.preventDefault();
        try {
            const { type, data } = editingClient;
            if (type === 'user') {
                await apiService.updateUser(data.id, {
                    full_name: data.full_name,
                    phone_number: data.phone_number,
                    course: data.course
                });
            } else {
                await apiService.updateGuestClient(data.id, {
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    course: data.course,
                    notes: data.notes
                });
            }
            setShowClientForm(false);
            setEditingClient(null);
            loadAdminData();
            alert('Client updated successfully');
        } catch (err) {
            console.error('Update failed', err);
            alert('Failed to update client');
        }
    };

    const formatBytes = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Search Bar */}
            <div className="bg-white rounded-2xl p-4 border-2 border-gray-100 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search tasks, clients, or files..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                </div>
            </div>

            {/* Admin Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <StatCard
                    title="Pending"
                    value={pendingUsers.length}
                    icon={Users}
                    color="bg-orange-500"
                    onClick={() => window.location.href = '/admin/clients'}
                />
                <StatCard
                    title="Clients"
                    value={stats?.total_clients || 0}
                    icon={CheckCircle}
                    color="bg-green-500"
                />
                <StatCard
                    title="Tasks"
                    value={tasks.length}
                    icon={FileText}
                    color="bg-blue-500"
                />
                <StatCard
                    title="Revenue"
                    value={formatCurrency(tasks.reduce((sum, task) => sum + (task.is_paid ? Number(task.expected_amount || 0) : 0), 0))}
                    icon={Clock}
                    color="bg-purple-500"
                />
            </div>

            {/* File Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <StatCard
                    title="Files"
                    value={totalFiles}
                    icon={FileText}
                    color="bg-cyan-500"
                    onClick={() => setActiveTab('files')}
                />
                <StatCard
                    title="With Files"
                    value={tasksWithFiles}
                    icon={CheckCircle}
                    color="bg-teal-500"
                />
                <StatCard
                    title="Storage"
                    value={formatBytes(totalStorage)}
                    icon={HardDrive}
                    color="bg-indigo-500"
                />
                <StatCard
                    title="Avg/Task"
                    value={tasks.length > 0 ? (totalFiles / tasks.length).toFixed(1) : 0}
                    icon={FileText}
                    color="bg-pink-500"
                />
            </div>

            {/* Navigation Tabs — scrollable on mobile */}
            <div className="flex border-b overflow-x-auto scrollbar-none -mx-1 px-1">
                {[
                    { key: 'tasks', label: 'Tasks' },
                    { key: 'files', label: 'Files' },
                ].map(tab => (
                    <button key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-1.5 pb-2.5 px-3 md:px-4 text-sm font-semibold whitespace-nowrap flex-shrink-0 transition-colors
                            ${activeTab === tab.key
                                ? 'border-b-2 border-indigo-600 text-indigo-700'
                                : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {tab.label}
                        {tab.badge > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                                {tab.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content Areas */}
            {activeTab === 'tasks' && (
                <div className="mt-4">
                    {/* Task Form — Admin Modal Layout */}
                    {showForm && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
                            <div className="w-full max-w-2xl my-8">
                                <TaskForm
                                    formData={formData}
                                    editingTask={editingTask}
                                    isOnline={isOnline}
                                    user={user}
                                    onSubmit={handleFormSubmit}
                                    onCancel={() => {
                                        setShowForm(false);
                                        resetForm();
                                    }}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-xl shadow overflow-hidden">
                        <div className="p-3 md:p-4 border-b flex flex-wrap justify-between items-center gap-2 bg-gray-50">
                            <h3 className="font-bold text-gray-700">All Tasks</h3>
                            <button
                                onClick={onAddTask}
                                className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 text-sm"
                            >
                                <Plus size={16} /> New Task
                            </button>
                        </div>
                        <TaskTable
                            tasks={filteredTasks}
                            isOnline={isOnline}
                            hideAmounts={hideAmounts}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onTogglePayment={onTogglePayment}
                            onAddTask={onAddTask}
                            onDownloadFile={onDownloadFile}
                            onDeliverWork={onDeliverWork}
                            onUploadFile={onUploadFile}
                            onQuoteResponse={onQuoteResponse}
                            onSendQuote={onSendQuote}
                            onDuplicate={onDuplicate}
                            user={user}
                        />
                    </div>
                </div>
            )}

            {/* Client sections removed from Dashboard as they are consolidated in the Clients page */}


            {activeTab === 'files' && (
                <AdminFilesView />
            )}

            {/* Client Edit Modal */}
            {showClientForm && editingClient && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-800">
                                Edit {editingClient.type === 'user' ? 'Registered Client' : 'Guest Client'}
                            </h3>
                            <button onClick={() => setShowClientForm(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleClientUpdate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={editingClient.type === 'user' ? editingClient.data.full_name : editingClient.data.name}
                                    onChange={(e) => setEditingClient({
                                        ...editingClient,
                                        data: { ...editingClient.data, [editingClient.type === 'user' ? 'full_name' : 'name']: e.target.value }
                                    })}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={editingClient.data.email || ''}
                                    onChange={(e) => setEditingClient({
                                        ...editingClient,
                                        data: { ...editingClient.data, email: e.target.value }
                                    })}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    disabled={editingClient.type === 'user'} // Users manage their own email usually
                                    title={editingClient.type === 'user' ? "User emails cannot be changed by admin" : ""}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                <input
                                    type="text"
                                    value={(editingClient.type === 'user' ? editingClient.data.phone_number : editingClient.data.phone) || ''}
                                    onChange={(e) => setEditingClient({
                                        ...editingClient,
                                        data: { ...editingClient.data, [editingClient.type === 'user' ? 'phone_number' : 'phone']: e.target.value }
                                    })}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    placeholder="+254..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Course/Program</label>
                                <input
                                    type="text"
                                    value={editingClient.data.course || ''}
                                    onChange={(e) => setEditingClient({
                                        ...editingClient,
                                        data: { ...editingClient.data, course: e.target.value }
                                    })}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            {editingClient.type === 'guest' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                    <textarea
                                        value={editingClient.data.notes || ''}
                                        onChange={(e) => setEditingClient({
                                            ...editingClient,
                                            data: { ...editingClient.data, notes: e.target.value }
                                        })}
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        rows={3}
                                    />
                                </div>
                            )}
                            <div className="pt-2 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowClientForm(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
