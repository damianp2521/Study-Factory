/**
 * Format a date string (YYYY-MM-DD) into simplified Korean format with Day of Week.
 * Example: "2024-01-22" -> "2024. 1. 22. (월)"
 * @param {string} dateString - YYYY-MM-DD
 * @returns {string} Formatted string
 */
export const formatDateWithDay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekDay = weekDays[date.getDay()];

    return `${year}. ${month}. ${day}. (${weekDay})`;
};
