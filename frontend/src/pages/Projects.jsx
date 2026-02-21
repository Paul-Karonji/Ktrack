import React, { useState, useEffect } from 'react';
import { FolderOpen, Search, SlidersHorizontal, Menu, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { useTasks } from '../hooks/useTasks';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import Sidebar from '../components/layout/Sidebar';
import ProjectGrid from '../components/projects/ProjectGrid';
import ProjectFilters from '../components/projects/ProjectFilters';
import ProjectAnalytics from '../components/projects/ProjectAnalytics';
import ViewToggle from '../components/projects/ViewToggle';
import TaskTable from '../components/tasks/TaskTable';
import TaskForm from '../components/tasks/TaskForm';
import FileManager from '../components/files/FileManager';
import { useNavigation } from '../context/NavigationContext';

const Projects = () => {
    const { user, logout } = useAuth();
    const { openSidebar } = useNavigation();
    const isOnline = useOnlineStatus();

    // Use the same useTasks hook as Dashboard for live mutations
    const { tasks, loading, loadTasks, createTask, updateTask, deleteTask, togglePayment } = useTasks();

    const [filteredTasks, setFilteredTasks] = useState([]);
    const [filters, setFilters] = useState({});
    const [view, setView] = useState('grid');
    const [showFilters, setShowFilters] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('date_delivered');
    const [hideAmounts, setHideAmounts] = useState(false);

    // Form state (same shape as Dashboard.jsx)
    const [showForm, setShowForm] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [formData, setFormData] = useState({
        clientName: '',
        taskName: '',
        taskDescription: '',
        dateCommissioned: new Date().toISOString().split('T')[0],
        dateDelivered: '',
        expectedAmount: '',
        isPaid: false,
        priority: 'medium',
        status: 'not_started',
        notes: '',
        quantity: 1,
        files: null
    });

    // File manager modal state
    const [showFileManager, setShowFileManager] = useState(false);
    const [fileManagerMode, setFileManagerMode] = useState('manage'); // 'manage' or 'deliver'
    const [selectedTaskId, setSelectedTaskId] = useState(null);

    // Load tasks on mount
    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    // Apply filters and sorting whenever tasks/filters/search/sort change
    useEffect(() => {
        let result = [...tasks];

        // Search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(t =>
                (t.task_name && t.task_name.toLowerCase().includes(term)) ||
                (t.task_description && t.task_description.toLowerCase().includes(term)) ||
                (t.display_client_name && t.display_client_name.toLowerCase().includes(term)) ||
                (t.client_name && t.client_name.toLowerCase().includes(term))
            );
        }

        // Status filter
        if (filters.status?.length > 0) {
            result = result.filter(t => filters.status.includes(t.status));
        }

        // Priority filter
        if (filters.priority?.length > 0) {
            result = result.filter(t => filters.priority.includes(t.priority));
        }

        // Date range
        if (filters.startDate) {
            result = result.filter(t => {
                if (!t.date_delivered) return false;
                return new Date(t.date_delivered) >= new Date(filters.startDate);
            });
        }
        if (filters.endDate) {
            result = result.filter(t => {
                if (!t.date_delivered) return false;
                return new Date(t.date_delivered) <= new Date(filters.endDate);
            });
        }

        // Sort
        result.sort((a, b) => {
            if (sortBy === 'date_delivered') {
                const dateA = a.date_delivered ? new Date(a.date_delivered) : new Date(0);
                const dateB = b.date_delivered ? new Date(b.date_delivered) : new Date(0);
                return dateA - dateB;
            }
            if (sortBy === 'expected_amount') {
                return (parseFloat(b.expected_amount) || 0) - (parseFloat(a.expected_amount) || 0);
            }
            if (sortBy === 'task_name') {
                return (a.task_name || '').localeCompare(b.task_name || '');
            }
            if (sortBy === 'priority') {
                const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
                return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
            }
            return 0;
        });

        setFilteredTasks(result);
    }, [tasks, filters, searchTerm, sortBy]);

    // ─── Form helpers ────────────────────────────────────────────────────────────

    const resetForm = () => {
        setFormData({
            clientName: user?.role === 'client' ? (user.fullName || user.full_name) : '',
            taskName: '',
            taskDescription: '',
            dateCommissioned: new Date().toISOString().split('T')[0],
            dateDelivered: '',
            expectedAmount: '',
            isPaid: false,
            priority: 'medium',
            status: 'not_started',
            notes: '',
            quantity: 1,
            files: null
        });
        setEditingTask(null);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked, files } = e.target;
        if (type === 'file') {
            setFormData(prev => ({ ...prev, [name]: files }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }
    };

    // ─── Task action handlers (same as Dashboard.jsx) ────────────────────────────

    const handleAddTask = () => {
        resetForm();
        setShowForm(true);
    };

    const handleEdit = (task) => {
        setFormData({
            clientName: task.client_name,
            clientId: task.client_id || '',
            guestClientId: task.guest_client_id || '',
            guestClientName: task.guest_client_name || '',
            taskName: task.task_name || '',
            taskDescription: task.task_description,
            dateCommissioned: task.date_commissioned ? task.date_commissioned.split('T')[0] : '',
            dateDelivered: task.date_delivered ? task.date_delivered.split('T')[0] : '',
            expectedAmount: task.expected_amount.toString(),
            isPaid: task.is_paid,
            priority: task.priority || 'medium',
            status: task.status || 'not_started',
            notes: task.notes || '',
            quantity: task.quantity || 1,
            files: null
        });
        setEditingTask(task);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            await deleteTask(id);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const effectiveClientName = formData.clientName || (user?.role === 'client' ? (user.fullName || user.full_name) : '');

        const submissionData = {
            ...formData,
            clientName: effectiveClientName,
            isPaid: Boolean(formData.isPaid)
        };
        delete submissionData.file;

        if (!effectiveClientName || !formData.taskDescription) {
            alert('Please fill in required fields');
            return;
        }

        try {
            let taskResult;
            if (editingTask) {
                taskResult = await updateTask(editingTask.id, submissionData);
            } else {
                taskResult = await createTask(submissionData);
            }

            // Upload files if present
            if (formData.files && formData.files.length > 0 && taskResult) {
                const taskId = (editingTask && editingTask.id) || taskResult.id;
                const uploadData = new FormData();
                for (let i = 0; i < formData.files.length; i++) {
                    uploadData.append('files', formData.files[i]);
                }
                try {
                    await apiService.uploadFile(taskId, uploadData);
                    await loadTasks();
                } catch (uploadErr) {
                    console.error('File upload failed:', uploadErr);
                    alert('Task saved but file upload failed: ' + (uploadErr.response?.data?.error || uploadErr.message));
                }
            }

            setShowForm(false);
            resetForm();
        } catch (err) {
            console.error(err);
        }
    };

    const handleTogglePayment = async (taskId) => {
        try {
            await togglePayment(taskId);
        } catch (err) {
            console.error('Toggle payment error:', err);
            alert('Failed to update payment status');
        }
    };

    const handleDownloadFile = (taskId) => {
        setSelectedTaskId(taskId);
        setFileManagerMode('manage');
        setShowFileManager(true);
    };

    const handleDeliverWork = (taskId) => {
        setSelectedTaskId(taskId);
        setFileManagerMode('deliver');
        setShowFileManager(true);
    };

    const handleUploadFile = async (taskId, file) => {
        if (!file) return;
        const uploadData = new FormData();
        uploadData.append('file', file);
        try {
            await apiService.uploadFile(taskId, uploadData);
            await loadTasks();
        } catch (err) {
            console.error('Direct upload failed:', err);
            alert('File upload failed: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleQuoteResponse = async (taskId, action) => {
        if (!window.confirm(`Are you sure you want to ${action} this quote?`)) return;
        try {
            await apiService.respondToQuote(taskId, action);
            await loadTasks();
        } catch (err) {
            console.error('Quote response error:', err);
            alert('Failed to update quote: ' + err.message);
        }
    };

    const handleSendQuote = async (taskId) => {
        const amount = prompt('Enter quote amount:');
        if (!amount || isNaN(amount)) return;
        try {
            await apiService.sendQuote(taskId, parseFloat(amount));
            await loadTasks();
        } catch (err) {
            console.error('Send quote error:', err);
            alert('Failed to send quote: ' + err.message);
        }
    };

    const handleDuplicate = (task) => {
        setFormData({
            clientName: task.client_name,
            taskName: task.task_name ? `${task.task_name} (Copy)` : '',
            taskDescription: task.task_description,
            dateCommissioned: '',
            dateDelivered: '',
            expectedAmount: task.expected_amount,
            isPaid: false,
            priority: task.priority || 'medium',
            status: 'not_started',
            notes: task.notes || '',
            quantity: task.quantity || 1,
            files: null
        });
        setEditingTask(null);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleClearFilters = () => {
        setFilters({});
        setSearchTerm('');
    };

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Sidebar user={user} onLogout={logout} />

            <main className="flex-1 lg:ml-64 p-4 md:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                                <button
                                    onClick={openSidebar}
                                    className="lg:hidden p-2 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    <Menu size={32} className="text-gray-900" />
                                </button>
                                <FolderOpen size={48} className="text-indigo-600 hidden lg:block" />
                                <span className="flex items-center gap-2">
                                    <FolderOpen size={32} className="text-indigo-600 lg:hidden" />
                                    Projects
                                </span>
                            </h1>
                            <p className="text-lg text-gray-500">
                                Showing {filteredTasks.length} of {tasks.length} projects
                            </p>
                        </div>

                        <div className="flex gap-3 flex-wrap">
                            {/* New Project button */}
                            <button
                                onClick={handleAddTask}
                                disabled={!isOnline}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                <Plus size={18} />
                                New Project
                            </button>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-4 py-2 bg-white border-2 rounded-xl hover:bg-gray-50 transition-all ${showFilters ? 'border-indigo-500 text-indigo-600' : 'border-gray-200 text-gray-700'}`}
                            >
                                <SlidersHorizontal size={18} />
                                Filters
                            </button>
                            <ViewToggle view={view} onViewChange={setView} />
                        </div>
                    </div>

                    {/* TaskForm Modal */}
                    {showForm && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
                            <div className="w-full max-w-2xl my-8">
                                <TaskForm
                                    formData={formData}
                                    editingTask={editingTask}
                                    isOnline={isOnline}
                                    onSubmit={handleSubmit}
                                    onCancel={() => { setShowForm(false); resetForm(); }}
                                    onChange={handleInputChange}
                                    user={user}
                                />
                            </div>
                        </div>
                    )}

                    {/* Analytics */}
                    <ProjectAnalytics tasks={filteredTasks} />

                    {/* Search & Sort */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search projects by name, description, or client..."
                                className="w-full pl-10 p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                            />
                        </div>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-medium text-gray-700"
                        >
                            <option value="date_delivered">Sort by Date</option>
                            <option value="expected_amount">Sort by Amount</option>
                            <option value="task_name">Sort by Name</option>
                            <option value="priority">Sort by Priority</option>
                        </select>
                    </div>

                    {/* Main Content */}
                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Filters Sidebar */}
                        {showFilters && (
                            <div className="w-full lg:w-64 flex-shrink-0">
                                <ProjectFilters
                                    filters={filters}
                                    onFilterChange={setFilters}
                                    onClearFilters={handleClearFilters}
                                />
                            </div>
                        )}

                        {/* Projects Display */}
                        <div className="flex-1">
                            {loading ? (
                                <div className="bg-white rounded-2xl p-12 text-center border-2 border-gray-100">
                                    <p className="text-gray-500 text-lg">Loading projects...</p>
                                </div>
                            ) : filteredTasks.length === 0 ? (
                                <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
                                    <p className="text-gray-500 text-lg mb-2">No projects found</p>
                                    <p className="text-gray-400 text-sm">
                                        {searchTerm || Object.keys(filters).length > 0
                                            ? 'Try adjusting your filters or search term'
                                            : 'Create your first project to get started'
                                        }
                                    </p>
                                    {!searchTerm && Object.keys(filters).length === 0 && (
                                        <button
                                            onClick={handleAddTask}
                                            disabled={!isOnline}
                                            className="mt-4 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all transform hover:scale-105 disabled:opacity-50"
                                        >
                                            <Plus size={18} className="inline mr-2" />
                                            Add Your First Project
                                        </button>
                                    )}
                                </div>
                            ) : view === 'grid' ? (
                                <ProjectGrid
                                    tasks={filteredTasks}
                                    isOnline={isOnline}
                                    hideAmounts={hideAmounts}
                                    user={user}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onTogglePayment={handleTogglePayment}
                                    onDownloadFile={handleDownloadFile}
                                    onDeliverWork={handleDeliverWork}
                                />
                            ) : (
                                <TaskTable
                                    tasks={filteredTasks}
                                    isOnline={isOnline}
                                    hideAmounts={hideAmounts}
                                    user={user}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onTogglePayment={handleTogglePayment}
                                    onAddTask={handleAddTask}
                                    onDownloadFile={handleDownloadFile}
                                    onDeliverWork={handleDeliverWork}
                                    onUploadFile={handleUploadFile}
                                    onQuoteResponse={handleQuoteResponse}
                                    onSendQuote={handleSendQuote}
                                    onDuplicate={handleDuplicate}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* File Manager Modal */}
            {showFileManager && selectedTaskId && (
                <FileManager
                    taskId={selectedTaskId}
                    userRole={user?.role}
                    defaultDeliverable={fileManagerMode === 'deliver'}
                    onClose={() => {
                        setShowFileManager(false);
                        setSelectedTaskId(null);
                        loadTasks();
                    }}
                />
            )}
        </div>
    );
};

export default Projects;
