import React from 'react';
import { Plus, Edit2, DollarSign } from 'lucide-react';

const TaskForm = ({ formData, editingTask, isOnline, onSubmit, onCancel, onChange }) => {
    return (
        <div id="task-form" className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                {editingTask ? <Edit2 size={24} className="text-indigo-600" /> : <Plus size={24} className="text-indigo-600" />}
                {editingTask ? 'Edit Task' : 'Create New Task'}
            </h2>
            <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Client Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="clientName"
                            value={formData.clientName}
                            onChange={onChange}
                            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                            required
                            placeholder="Enter client name"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Expected Amount <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-3.5 text-gray-400" size={18} />
                            <input
                                type="number"
                                name="expectedAmount"
                                step="0.01"
                                value={formData.expectedAmount}
                                onChange={onChange}
                                className="w-full pl-10 p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                required
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Task Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        name="taskDescription"
                        value={formData.taskDescription}
                        onChange={onChange}
                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        rows={3}
                        required
                        placeholder="Describe the task or project..."
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Date Commissioned
                        </label>
                        <input
                            type="date"
                            name="dateCommissioned"
                            value={formData.dateCommissioned}
                            onChange={onChange}
                            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Date Delivered
                        </label>
                        <input
                            type="date"
                            name="dateDelivered"
                            value={formData.dateDelivered}
                            onChange={onChange}
                            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Priority
                        </label>
                        <select
                            name="priority"
                            value={formData.priority || 'medium'}
                            onChange={onChange}
                            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        >
                            <option value="low">🟢 Low</option>
                            <option value="medium">🟡 Medium</option>
                            <option value="high">🟠 High</option>
                            <option value="urgent">🔴 Urgent</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Status
                        </label>
                        <select
                            name="status"
                            value={formData.status || 'not_started'}
                            onChange={onChange}
                            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        >
                            <option value="not_started">Not Started</option>
                            <option value="in_progress">In Progress</option>
                            <option value="review">Under Review</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Notes (Optional)
                    </label>
                    <textarea
                        name="notes"
                        value={formData.notes || ''}
                        onChange={onChange}
                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        rows={2}
                        placeholder="Add any additional notes or comments..."
                    />
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <input
                        type="checkbox"
                        id="isPaid"
                        name="isPaid"
                        checked={formData.isPaid}
                        onChange={onChange}
                        className="w-5 h-5 text-indigo-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                    />
                    <label htmlFor="isPaid" className="text-sm font-medium text-gray-700 cursor-pointer">
                        Mark as paid
                    </label>
                </div>
                <div className="flex gap-3 pt-4">
                    <button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all transform hover:scale-105"
                    >
                        {editingTask ? 'Update Task' : 'Create Task'}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default TaskForm;
