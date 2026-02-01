import React from 'react';
import { User, Plus } from 'lucide-react';
import TaskRow from './TaskRow';

const TaskTable = ({ tasks, isOnline, hideAmounts, onEdit, onDelete, onTogglePayment, onAddTask, onDownloadFile, onUploadFile, onQuoteResponse, onSendQuote, onDuplicate, user }) => {
    if (tasks.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="text-center py-16 px-4">
                    <div className="inline-block p-6 bg-indigo-50 rounded-full mb-4">
                        <User size={48} className="text-indigo-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">No tasks yet</h3>
                    <p className="text-gray-500 mb-6">
                        Add your first client task to get started tracking your projects.
                    </p>
                    <button
                        onClick={onAddTask}
                        disabled={!isOnline}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all transform hover:scale-105"
                    >
                        <Plus size={20} className="inline mr-2" />
                        Add Your First Task
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Client & Task
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Timeline
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Amount
                            </th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {tasks.map((task) => (
                            <TaskRow
                                key={task.id}
                                task={task}
                                isOnline={isOnline}
                                hideAmounts={hideAmounts}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onTogglePayment={onTogglePayment}
                                onTogglePayment={onTogglePayment}
                                onDownloadFile={onDownloadFile}
                                onUploadFile={onUploadFile}
                                onQuoteResponse={onQuoteResponse}
                                onQuoteResponse={onQuoteResponse}
                                onSendQuote={onSendQuote}
                                onDuplicate={onDuplicate}
                                user={user}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TaskTable;
