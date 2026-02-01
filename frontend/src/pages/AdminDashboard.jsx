import React, { useState, useEffect } from 'react';
import { Users, FileText, CheckCircle, Clock, AlertCircle, Plus } from 'lucide-react';
import { apiService } from '../services/api';
import StatCard from '../components/dashboard/StatCard';
import TaskTable from '../components/tasks/TaskTable';
import TaskForm from '../components/tasks/TaskForm';
import AnalyticsCharts from '../components/charts/AnalyticsCharts';

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
    onQuoteResponse,
    onSendQuote,
    onDuplicate,
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
    const [activeTab, setActiveTab] = useState('tasks'); // 'tasks', 'users', 'analytics'

    // Load extra admin data
    useEffect(() => {
        loadAdminData();
    }, []);

    const loadAdminData = async () => {
        try {
            const [usersData, statsData] = await Promise.all([
                apiService.getUsers({ status: 'pending' }),
                apiService.getUserStats()
            ]);
            setPendingUsers(usersData);
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

    return (
        <div className="space-y-6">
            {/* Admin Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                    title="Pending Approvals"
                    value={pendingUsers.length}
                    icon={Users}
                    color="bg-orange-500"
                    onClick={() => setActiveTab('users')}
                />
                <StatCard
                    title="Total Clients"
                    value={stats?.total_clients || 0}
                    icon={CheckCircle}
                    color="bg-green-500"
                />
                <StatCard
                    title="Total Tasks"
                    value={tasks.length}
                    icon={FileText}
                    color="bg-blue-500"
                />
                <StatCard
                    title="Revenue"
                    value="$12,500" // Placeholder or calc
                    icon={Clock}
                    color="bg-purple-500"
                />
            </div>

            {/* Navigation Tabs */}
            <div className="flex space-x-4 border-b">
                <button
                    className={`pb-2 px-4 ${activeTab === 'tasks' ? 'border-b-2 border-indigo-600 font-bold' : ''}`}
                    onClick={() => setActiveTab('tasks')}
                >
                    Tasks Management
                </button>
                <button
                    className={`pb-2 px-4 ${activeTab === 'users' ? 'border-b-2 border-indigo-600 font-bold' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    User Approvals {pendingUsers.length > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-2">{pendingUsers.length}</span>}
                </button>
                <button
                    className={`pb-2 px-4 ${activeTab === 'analytics' ? 'border-b-2 border-indigo-600 font-bold' : ''}`}
                    onClick={() => setActiveTab('analytics')}
                >
                    Analytics
                </button>
            </div>

            {/* Content Areas */}
            {activeTab === 'tasks' && (
                <div className="mt-4">
                    {/* Task Form if acting as Admin creating/editing */}
                    {showForm && (
                        <div className="mb-6">
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
                    )}

                    <div className="bg-white rounded-xl shadow overflow-hidden">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-700">All Tasks</h3>
                            <button
                                onClick={onAddTask}
                                className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 text-sm"
                            >
                                <Plus size={16} /> New Task
                            </button>
                        </div>
                        <TaskTable
                            tasks={tasks}
                            isOnline={isOnline}
                            hideAmounts={hideAmounts}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onTogglePayment={onTogglePayment}
                            onAddTask={onAddTask}
                            onDownloadFile={onDownloadFile}
                            onUploadFile={onUploadFile}
                            onQuoteResponse={onQuoteResponse}
                            onSendQuote={onSendQuote}
                            onDuplicate={onDuplicate}
                            user={user}
                        />
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <div className="bg-white rounded-xl shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {pendingUsers.map(u => (
                                <tr key={u.id}>
                                    <td className="px-6 py-4">{u.full_name}</td>
                                    <td className="px-6 py-4">{u.email}</td>
                                    <td className="px-6 py-4">{u.course}</td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleApproveUser(u.id)}
                                            className="text-green-600 hover:text-green-900 font-bold bg-green-50 px-3 py-1 rounded border border-green-200"
                                        >
                                            Approve
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {pendingUsers.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-6 py-4 text-center text-gray-500 italic">No pending user approvals</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'analytics' && (
                <AnalyticsCharts tasks={tasks} />
            )}
        </div>
    );
};

export default AdminDashboard;
