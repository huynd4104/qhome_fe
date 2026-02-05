/**
 * Format number to currency string with dot separator (Vietnamese format)
 * Example: 1000000 -> "1.000.000"
 */
export function formatCurrency(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') {
        return '';
    }
    
    // Convert to number
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/\./g, '')) : value;
    
    if (isNaN(numValue)) {
        return '';
    }
    
    // Convert to integer (remove decimal part)
    const intValue = Math.floor(numValue);
    
    // Format with dot as thousand separator for integer part only
    return intValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Parse formatted currency string to number
 * Example: "1.000.000" -> 1000000
 */
export function parseCurrency(value: string): string {
    // Remove all dots (thousand separators)
    return value.replace(/\./g, '');
}

