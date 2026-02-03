
/**
 * Date utility functions for Org-mode formatting
 */

/**
 * Format a date object as an Org-mode timestamp
 * 
 * @param date The date to format
 * @param active Whether to use angle brackets < > (active) or square brackets [ ] (inactive)
 * @param includeTime Whether to include HH:MM
 * @returns Formatted timestamp string, e.g., [2024-01-28 Sun 14:15]
 */
export function formatOrgTimestamp(date: Date, active: boolean = false, includeTime: boolean = true): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    // Get short day name (e.g., "Sun")
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

    let result = `${year}-${month}-${day} ${dayName}`;

    if (includeTime) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        result += ` ${hours}:${minutes}`;
    }

    return active ? `<${result}>` : `[${result}]`;
}
