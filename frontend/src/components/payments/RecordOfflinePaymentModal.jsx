import React, { useEffect, useState } from 'react';
import { Calendar, Loader2, X } from 'lucide-react';

const todayValue = () => new Date().toISOString().split('T')[0];

const RecordOfflinePaymentModal = ({
    isOpen,
    task,
    isSubmitting = false,
    onClose,
    onConfirm
}) => {
    const [receivedAt, setReceivedAt] = useState(todayValue());

    useEffect(() => {
        if (isOpen) {
            setReceivedAt(todayValue());
        }
    }, [isOpen]);

    if (!isOpen || !task) return null;

    const handleSubmit = (event) => {
        event.preventDefault();
        onConfirm?.(receivedAt);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Record Offline Payment</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Save this as revenue and mark the task fully paid.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.18em] font-black text-indigo-400">Task</p>
                        <p className="text-sm font-bold text-indigo-950 mt-1">{task.task_name || `Task #${task.id}`}</p>
                        <p className="text-xs text-indigo-700 mt-1">{task.display_client_name || task.client_name}</p>
                    </div>

                    <label className="block">
                        <span className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-2">
                            <Calendar size={16} className="text-indigo-600" />
                            Payment Date
                        </span>
                        <input
                            type="date"
                            value={receivedAt}
                            onChange={(event) => setReceivedAt(event.target.value)}
                            className="w-full rounded-xl border-2 border-gray-200 px-3 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 outline-none"
                            required
                        />
                    </label>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                            Record Payment
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RecordOfflinePaymentModal;
