/**
 * Format a date to dd/mm/yyyy format
 * @param date - Date object, string, or undefined
 * @returns Formatted date string in dd/mm/yyyy format or '-' if invalid
 */
export const formatDate = (date: Date | string | undefined | null): string => {
  if (!date) return '-';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Check for invalid date
    if (isNaN(dateObj.getTime())) return '-';

    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();

    return `${day}/${month}/${year}`;
  } catch (error) {
    return '-';
  }
};

/**
 * Format a date to dd/mm/yyyy HH:mm format with time
 * @param date - Date object, string, or undefined
 * @returns Formatted date string with time or '-' if invalid
 */
export const formatDateTime = (date: Date | string | undefined | null): string => {
  if (!date) return '-';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Check for invalid date
    if (isNaN(dateObj.getTime())) return '-';

    const formattedDate = formatDate(date);
    if (formattedDate === '-') return '-';

    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');

    return `${formattedDate} ${hours}:${minutes}`;
  } catch (error) {
    return '-';
  }
};