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

/**
 * Get the start (Monday) and end (Sunday) dates of the week for a given date.
 * @param {string|Date} dateInput
 * @returns {{start: string, end: string}} Object containing start and end dates in YYYY-MM-DD format
 */
export const getWeekRange = (dateInput) => {
    const curr = new Date(dateInput);
    const day = curr.getDay(); // 0 (Sun) - 6 (Sat)

    // Standard JS way to find Monday:
    // If Sun(0), prev Mon is -6 days away.
    // If Mon(1), prev Mon is 0 days away.
    const diffToMon = day === 0 ? -6 : 1 - day;

    const monday = new Date(curr);
    monday.setDate(curr.getDate() + diffToMon);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
        start: monday.toISOString().split('T')[0],
        end: sunday.toISOString().split('T')[0]
    };
};

/**
 * Get today's date in YYYY-MM-DD format
 * @returns {string}
 */
export const getTodayString = () => {
    // Note: This returns UTC date part if run in environment without timezone adjust, 
    // but usually in browser it relies on local time if constructed this way, 
    // though toISOString() uses UTC. 
    // To be safe for Korean timezone (KST is UTC+9), we might want to offset.
    // However, keeping consistent with existing logic: new Date().toISOString().split('T')[0]

    // Better approach for local date string:
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d - offset)).toISOString().slice(0, 10);
    return localISOTime;
};

/**
 * Format date time string to "YYYY.MM.DD(Day) HH:MM"
 * @param {string} dateString 
 * @returns {string}
 */
export const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const day = days[d.getDay()];
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd}(${day}) ${hh}:${min}`;
};
