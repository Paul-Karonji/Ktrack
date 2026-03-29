import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, FileText, CheckCircle, Clock, Plus, Search, HardDrive, Phone, Mail, Edit2, X } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { apiService } from '../services/api';
import { getCollectedAmount } from '../utils/paymentSummary';
import StatCard from '../components/dashboard/StatCard';
import TaskTable from '../components/tasks/TaskTable';
import TaskForm from '../components/tasks/TaskForm';
import AdminFilesView from '../components/admin/AdminFilesView';

const PRIORITY_ORDER = { urgent: 4, high: 3, medium: 2, low: 1 };

const getClientName = (task) => (task.display_client_name || task.client_name || '').toLowerCase();

const getDueTimestamp = (task) => {
    if (!task?.date_delivered) return Number.MAX_SAFE_INTEGER;
    const value = new Date(task.date_delivered).getTime();
    return Number.isNaN(value) ? Number.MAX_SAFE_INTEGER : value;
};

const isOverdueTask = (task) => {
    if (!task?.date_delivered) return false;
    if (['completed', 'cancelled'].includes(task.status)) return false;
    if (Number(task.is_paid) === 1) return false;
    return new Date(task.date_delivered).getTime() < Date.now();
};

const getPendingQuoteWeight = (task) => {
    if (task.quote_status === 'quote_sent') return 2;
    if (task.quote_status === 'pending_quote') return 1;
    return 0;
};

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
    onGuestPaymentLink,
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
    const [sortBy, setSortBy] = useState('created_newest');

    // Calculate file statistics
    const totalFiles = tasks.reduce((sum, t) => sum + (t.file_count || 0), 0);
    const tasksWithFiles = tasks.filter(t => t.has_file).length;
    const totalStorage = tasks.reduce((sum, t) => sum + (t.total_file_size || 0), 0);

    const filteredTasks = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        const searchedTasks = normalizedSearch
            ? tasks.filter((task) =>
                task.task_name?.toLowerCase().includes(normalizedSearch) ||
                task.task_description?.toLowerCase().includes(normalizedSearch) ||
                task.display_client_name?.toLowerCase().includes(normalizedSearch) ||
                task.client_name?.toLowerCase().includes(normalizedSearch)
            )
            : tasks;

        return [...searchedTasks].sort((left, right) => {
            switch (sortBy) {
                case 'due_soonest':
                    return getDueTimestamp(left) - getDueTimestamp(right);
                case 'overdue_first': {
                    const leftRank = isOverdueTask(left) ? 1 : 0;
                    const rightRank = isOverdueTask(right) ? 1 : 0;
                    if (leftRank !== rightRank) return rightRank - leftRank;
                    return getDueTimestamp(left) - getDueTimestamp(right);
                }
                case 'highest_due':
                    return Number(right.current_due_amount || 0) - Number(left.current_due_amount || 0);
                case 'deposit_due_first': {
                    const leftRank = left.current_due_phase === 'deposit' ? 1 : 0;
                    const rightRank = right.current_due_phase === 'deposit' ? 1 : 0;
                    if (leftRank !== rightRank) return rightRank - leftRank;
                    return getDueTimestamp(left) - getDueTimestamp(right);
                }
                case 'pending_quote_first': {
                    const leftRank = getPendingQuoteWeight(left);
                    const rightRank = getPendingQuoteWeight(right);
                    if (leftRank !== rightRank) return rightRank - leftRank;
                    return getDueTimestamp(left) - getDueTimestamp(right);
                }
                case 'priority_highest':
                    return (PRIORITY_ORDER[right.priority] || 0) - (PRIORITY_ORDER[left.priority] || 0);
                case 'client_az':
                    return getClientName(left).localeCompare(getClientName(right));
                case 'created_newest':
                default:
                    return new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime();
            }
        });
    }, [searchTerm, sortBy, tasks]);

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
                    value={formatCurrency(tasks.reduce((sum, task) => sum + getCollectedAmount(task), 0))}
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
                            <div>
                                <h3 className="font-bold text-gray-700">All Tasks</h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    Sort by payment urgency, quotes, priority, or client name.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <select
                                    value={sortBy}
                                    onChange={(event) => setSortBy(event.target.value)}
                                    className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm font-medium text-gray-700"
                                >
                                    <option value="created_newest">Created Newest</option>
                                    <option value="due_soonest">Due Soonest</option>
                                    <option value="overdue_first">Overdue First</option>
                                    <option value="highest_due">Highest Current Due</option>
                                    <option value="deposit_due_first">Deposit Due First</option>
                                    <option value="pending_quote_first">Pending Quote First</option>
                                    <option value="priority_highest">Priority Highest</option>
                                    <option value="client_az">Client A-Z</option>
                                </select>
                                <button
                                    onClick={onAddTask}
                                    className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 text-sm"
                                >
                                    <Plus size={16} /> New Task
                                </button>
                            </div>
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
                            onGuestPaymentLink={onGuestPaymentLink}
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
