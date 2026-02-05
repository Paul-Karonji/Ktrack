import React, { useState } from 'react';
import { Plus, Clock, CheckCircle, HelpCircle, Search, LayoutDashboard, History, Wallet, Sparkles } from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import TaskTable from '../components/tasks/TaskTable';
import TaskForm from '../components/tasks/TaskForm';
import HelpModal from '../components/common/HelpModal';

const ClientDashboard = ({
    user,
    tasks,
    loading,
    handleAddTask,
    handleEdit,
    handleDelete,
    handleSendQuote,
    handleQuoteResponse,
    handleDuplicate,
    onDownloadFile,
    showForm,
    setShowForm,
    formData,
    setFormData,
    editingTask,
    resetForm,
    handleInputChange,
    fileInputRef
}) => {
    // UI State
    const [showHelp, setShowHelp] = useState(false);
    const [activeTab, setActiveTab] = useState('active'); // 'active', 'history', 'quotes'
    const [searchTerm, setSearchTerm] = useState('');

    // --- Stats Calculation ---
    // Pending Quotes: Tasks where admin sent a quote and client needs to respond
    const pendingQuotes = tasks.filter(t => t.quote_status === 'quote_sent').length;

    // Active: Not completed, not cancelled
    const activeTasksCount = tasks.filter(t => !['completed', 'cancelled'].includes(t.status)).length;

    // Completed: Successfully finished
    const completedTasksCount = tasks.filter(t => t.status === 'completed').length;

    // --- Filter Logic ---
    const getFilteredTasks = () => {
        let filtered = tasks;

        // 1. Tab Filter
        if (activeTab === 'active') {
            filtered = filtered.filter(t => !['completed', 'cancelled'].includes(t.status));
        } else if (activeTab === 'history') {
            filtered = filtered.filter(t => ['completed', 'cancelled'].includes(t.status));
        } else if (activeTab === 'quotes') {
            filtered = filtered.filter(t => t.quote_status === 'quote_sent');
        }

        // 2. Search Filter
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(t =>
                (t.task_name && t.task_name.toLowerCase().includes(term)) ||
                (t.task_description && t.task_description.toLowerCase().includes(term))
            );
        }

        return filtered;
    };

    const displayTasks = getFilteredTasks();
    const firstName = user?.full_name?.split(' ')[0] || 'Client';

    return (
        <div className="space-y-8 animate-fade-in">
            {/* 1. Cockpit Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-bold text-gray-900 mb-2">
                        Welcome back, {firstName} 👋
                    </h1>
                    <p className="text-lg text-gray-500">Here's your project overview</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowHelp(true)}
                        className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-3 rounded-xl hover:bg-gray-50 transition-all font-medium shadow-sm"
                    >
                        <HelpCircle size={18} />
                        Help Guide
                    </button>
                    <button
                        onClick={() => {
                            resetForm();
                            setShowForm(true);
                        }}
                        className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-indigo-200 transition-all transform hover:-translate-y-0.5 font-semibold"
                    >
                        <Plus size={20} />
                        New Project
                    </button>
                </div>
            </div>

            {/* 2. Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                    title="Active Projects"
                    value={activeTasksCount}
                    icon={Clock}
                    color="blue"
                    onClick={() => setActiveTab('active')}
                    active={activeTab === 'active'}
                />
                <StatCard
                    title="Pending Quotes"
                    value={pendingQuotes}
                    icon={Wallet}
                    color="orange"
                    badge={pendingQuotes > 0 ? "Action Needed" : null}
                    onClick={() => setActiveTab('quotes')}
                    active={activeTab === 'quotes'}
                />
                <StatCard
                    title="Completed History"
                    value={completedTasksCount}
                    icon={CheckCircle}
                    color="green"
                    onClick={() => setActiveTab('history')}
                    active={activeTab === 'history'}
                />
                <StatCard
                    title="Total Projects"
                    value={tasks.length}
                    icon={LayoutDashboard}
                    color="purple"
                    subtitle="Lifetime"
                />
            </div>

            {/* 3. Main Content Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Tabs & Search Header */}
                <div className="border-b border-gray-100 bg-white p-6 flex flex-col md:flex-row justify-between items-center gap-4">

                    {/* Tabs */}
                    <div className="flex gap-1">
                        <button
                            onClick={() => setActiveTab('active')}
                            className={`flex items-center gap-2 px-6 py-3 text-base font-semibold transition-all border-b-2 ${activeTab === 'active'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <Sparkles size={18} />
                            Active Projects
                        </button>
                        <button
                            onClick={() => setActiveTab('quotes')}
                            className={`flex items-center gap-2 px-6 py-3 text-base font-semibold transition-all border-b-2 ${activeTab === 'quotes'
                                ? 'border-orange-600 text-orange-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <Wallet size={18} />
                            Quotes
                            {pendingQuotes > 0 && (
                                <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">{pendingQuotes}</span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex items-center gap-2 px-6 py-3 text-base font-semibold transition-all border-b-2 ${activeTab === 'history'
                                ? 'border-gray-700 text-gray-700'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <History size={18} />
                            History
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white outline-none transition-all text-sm"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="p-0">
                    {/* Task Form (Embedded) */}
                    {showForm && (
                        <div className="p-6 border-b border-gray-100 bg-gray-50 animate-slide-down">
                            <TaskForm
                                formData={formData}
                                setFormData={setFormData}
                                onSubmit={handleAddTask}
                                onChange={handleInputChange}
                                isEditing={!!editingTask}
                                user={user}
                                onCancel={() => {
                                    setShowForm(false);
                                    resetForm();
                                }}
                                fileInputRef={fileInputRef}
                            />
                        </div>
                    )}

                    {/* Task Table */}
                    <TaskTable
                        tasks={displayTasks}
                        isOnline={true}
                        hideAmounts={false} // Client sees amounts
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onTogglePayment={() => { }}
                        onAddTask={() => { setShowForm(true); }}
                        onDownloadFile={onDownloadFile}
                        onQuoteResponse={handleQuoteResponse}
                        onSendQuote={() => { }}
                        onDuplicate={handleDuplicate}
                        user={user}
                    />

                    {displayTasks.length === 0 && !showForm && (
                        <div className="text-center py-12 text-gray-400">
                            <p>No projects found in this view.</p>
                            {activeTab === 'active' && (
                                <button onClick={() => setShowForm(true)} className="text-indigo-600 font-bold mt-2 hover:underline">
                                    Start a new project?
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Help Modal */}
            <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
        </div>
    );
};

export default ClientDashboard;
