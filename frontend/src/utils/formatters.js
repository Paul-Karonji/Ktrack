// Utility functions for formatting data
export const formatDate = (dateStr) => {
    if (!dateStr) return 'Not set';
    
    // Replace space with T to fix iOS Safari parsing issues for "YYYY-MM-DD HH:MM:SS"
    const safeDateStr = typeof dateStr === 'string' ? dateStr.replace(' ', 'T') : dateStr;
    const date = new Date(safeDateStr);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
        return 'Invalid Date';
    }
    
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

export const formatCurrency = (amount, hideAmounts = false) => {
    if (hideAmounts) {
        return '••••••';
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
};
