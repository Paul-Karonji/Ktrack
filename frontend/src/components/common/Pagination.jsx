import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ currentPage, totalItems, itemsPerPage, onPageChange, onItemsPerPageChange }) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const handlePrevious = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };

    if (totalItems === 0) {
        return null;
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Items per page selector */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show:</span>
                <select
                    value={itemsPerPage}
                    onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                    className="px-3 py-1.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-600">per page</span>
            </div>

            {/* Page info */}
            <div className="text-sm text-gray-600">
                Showing <span className="font-semibold text-gray-900">{startItem}</span> to{' '}
                <span className="font-semibold text-gray-900">{endItem}</span> of{' '}
                <span className="font-semibold text-gray-900">{totalItems}</span> tasks
            </div>

            {/* Page navigation */}
            <div className="flex items-center gap-2">
                <button
                    onClick={handlePrevious}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg transition-all ${currentPage === 1
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-indigo-600 hover:bg-indigo-50'
                        }`}
                    title="Previous page"
                >
                    <ChevronLeft size={20} />
                </button>

                <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                            pageNum = i + 1;
                        } else if (currentPage <= 3) {
                            pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                        } else {
                            pageNum = currentPage - 2 + i;
                        }

                        return (
                            <button
                                key={pageNum}
                                onClick={() => onPageChange(pageNum)}
                                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${currentPage === pageNum
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                {pageNum}
                            </button>
                        );
                    })}
                </div>

                <button
                    onClick={handleNext}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg transition-all ${currentPage === totalPages
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-indigo-600 hover:bg-indigo-50'
                        }`}
                    title="Next page"
                >
                    <ChevronRight size={20} />
                </button>
            </div>
        </div>
    );
};

export default Pagination;
