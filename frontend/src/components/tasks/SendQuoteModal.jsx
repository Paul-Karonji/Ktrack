import React, { useState } from 'react';
import { X, DollarSign, ShieldCheck, Info, Calculator, Percent } from 'lucide-react';

const SendQuoteModal = ({ task, onConfirm, onClose }) => {
    const [amount, setAmount] = useState('');
    const [requiresDeposit, setRequiresDeposit] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!amount || isNaN(amount)) return;
        onConfirm(parseFloat(amount), requiresDeposit);
    };

    const depositPreview = amount ? (parseFloat(amount) / 2).toFixed(2) : '0.00';

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden scale-in-95 duration-200">
                {/* Header */}
                <div className="bg-indigo-600 p-6 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 p-1 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <Calculator size={24} />
                        </div>
                        <h2 className="text-xl font-bold">Send Quote</h2>
                    </div>
                    <p className="text-indigo-100 text-sm">
                        Set the project cost for <strong>{task.task_name || 'this task'}</strong>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-8">
                    {/* Amount Input */}
                    <div className="mb-6">
                        <label className="block text-xs font-black uppercase text-gray-400 mb-2 ml-1">
                            Total Quote Amount (USD)
                        </label>
                        <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={20} />
                            <input
                                autoFocus
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Enter amount..."
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-lg font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                required
                            />
                        </div>
                    </div>

                    {/* Deposit Toggle */}
                    <div
                        className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${requiresDeposit
                                ? 'border-indigo-500 bg-indigo-50/50'
                                : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                            }`}
                        onClick={() => setRequiresDeposit(!requiresDeposit)}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className={requiresDeposit ? 'text-indigo-600' : 'text-gray-400'} size={20} />
                                <span className={`font-bold text-sm ${requiresDeposit ? 'text-indigo-900' : 'text-gray-600'}`}>
                                    Request 50% Deposit
                                </span>
                            </div>
                            <div className={`w-12 h-6 rounded-full relative transition-colors ${requiresDeposit ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${requiresDeposit ? 'left-7' : 'left-1'}`} />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed font-medium">
                            The client must pay half upfront before the project moves to "In Progress".
                        </p>

                        {requiresDeposit && amount > 0 && (
                            <div className="mt-4 pt-4 border-t border-indigo-100 flex justify-between items-center text-indigo-700">
                                <span className="text-xs font-bold uppercase tracking-wider h-min inline-flex items-center gap-1">
                                    <Percent size={12} /> Deposit Due:
                                </span>
                                <span className="text-lg font-black">${depositPreview}</span>
                            </div>
                        )}
                    </div>

                    {/* Info Note */}
                    <div className="mt-6 flex gap-3 text-gray-400 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <Info size={16} className="shrink-0 mt-0.5" />
                        <p className="text-[10px] italic leading-tight">
                            The client will be notified immediately and must approve the quote before{requiresDeposit ? ' partial ' : ' '}payment is accepted.
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 mt-8">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all transform active:scale-95"
                        >
                            Send Quote
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SendQuoteModal;
