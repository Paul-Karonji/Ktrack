import React, { useState, useEffect } from 'react';
import { User, Plus } from 'lucide-react';
import TaskRow from './TaskRow';
import TaskCard from './TaskCard';

const TaskTable = ({ tasks, isOnline, hideAmounts, onEdit, onDelete, onTogglePayment, onAddTask, onDownloadFile, onDeliverWork, onUploadFile, onQuoteResponse, onSendQuote, onDuplicate, user }) => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (tasks.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="text-center py-12 md:py-16 px-4">
                    <div className="inline-block p-4 md:p-6 bg-indigo-50 rounded-full mb-4">
                        <User size={36} className="md:w-12 md:h-12 text-indigo-400" />
                    </div>
                    <h3 className="text-lg md:text-xl font-semibold text-gray-700 mb-2">No tasks yet</h3>
                    <p className="text-sm md:text-base text-gray-500 mb-6">
                        Add your first client task to get started tracking your projects.
                    </p>
                    <button
                        onClick={onAddTask}
                        disabled={!isOnline}
                        className="px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all transform hover:scale-105 text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus size={18} className="inline mr-2" />
                        Add Your First Task
                    </button>
                </div>
            </div>
        );
    }

    // Mobile: Card View
    if (isMobile) {
        return (
            <div className="space-y-4">
                {tasks.map((task) => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        isOnline={isOnline}
                        hideAmounts={hideAmounts}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onTogglePayment={onTogglePayment}
                        onDownloadFile={onDownloadFile}
                        onDeliverWork={onDeliverWork}
                        user={user}
                    />
                ))}
            </div>
        );
    }

    // Desktop: Table View
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
                                onDownloadFile={onDownloadFile}
                                onDeliverWork={onDeliverWork}
                                onUploadFile={onUploadFile}
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
