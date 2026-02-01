```javascript
import React from 'react';
import { FileText, Plus, Clock, CheckCircle } from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import TaskTable from '../components/tasks/TaskTable';
import TaskForm from '../components/tasks/TaskForm';

const ClientDashboard = ({
    user,
    tasks,
    loading,
    handleAddTask,
    handleEdit,
    handleDelete,
    handleSendQuote, // null for client usually
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
    // Client specific logic
    console.log('ClientDashboard Render:', { handleInputChangeFn: !!handleInputChange });
    // Filter tasks? Already filtered by backend usually? Or filter here?
    // Backend `tasks` endpoint should return only client's tasks if role is client.

    // Calculate client stats
    const pendingQuotes = tasks.filter(t => t.quote_status === 'quote_sent').length;
    const activeTasks = tasks.filter(t => ['in_progress', 'approved', 'under_review'].includes(t.status)).length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;

    return (
        <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                    title="My Active Tasks"
                    value={activeTasks}
                    icon={Clock}
                    color="bg-blue-500"
                />
                <StatCard
                    title="Pending Quotes"
                    value={pendingQuotes}
                    icon={FileText}
                    color="bg-orange-500"
                />
                <StatCard
                    title="Completed"
                    value={completedTasks}
                    icon={CheckCircle}
                    color="bg-green-500"
                />
            </div>

            {/* Main Content */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">My Projects</h2>
                <button
                    onClick={() => {
                        resetForm();
                        setShowForm(true);
                    }}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                >
                    <Plus size={20} />
                    New Project
                </button>
            </div>

            {/* Task Form (Modal or Inline) */}
            {showForm && (
                <div className="mb-8">
                    <TaskForm
                        formData={formData}
                        setFormData={setFormData}
                        onSubmit={handleAddTask}
                        onChange={handleInputChange}
                        isEditing={!!editingTask}
                        onCancel={() => {
                            setShowForm(false);
                            resetForm();
                        }}
                        fileInputRef={fileInputRef}
                    />
                </div>
            )}

            {/* Task List */}
            <TaskTable
                tasks={tasks}
                isOnline={true} // navigator.onLine?
                hideAmounts={false} // Client sees amounts
                onEdit={handleEdit}
                onDelete={handleDelete}
                onTogglePayment={() => { }} // Clients don't toggle payment
                onAddTask={() => { }} // Using button above
                onDownloadFile={onDownloadFile}
                onQuoteResponse={handleQuoteResponse}
                onSendQuote={() => { }} // Clients don't send quotes
                onDuplicate={handleDuplicate}
                user={user}
            />
        </div>
    );
};



export default ClientDashboard;
