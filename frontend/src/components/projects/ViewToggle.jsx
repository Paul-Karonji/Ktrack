import React from 'react';
import { Grid, List } from 'lucide-react';

const ViewToggle = ({ view, onViewChange }) => {
    return (
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
                onClick={() => onViewChange('grid')}
                className={`p-2 rounded-lg transition-all ${view === 'grid'
                        ? 'bg-white shadow-sm text-indigo-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                title="Grid view"
            >
                <Grid size={20} />
            </button>
            <button
                onClick={() => onViewChange('list')}
                className={`p-2 rounded-lg transition-all ${view === 'list'
                        ? 'bg-white shadow-sm text-indigo-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                title="List view"
            >
                <List size={20} />
            </button>
        </div>
    );
};

export default ViewToggle;
